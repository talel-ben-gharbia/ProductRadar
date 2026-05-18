import { BACKEND_URL } from "@/utils/admin/constants"
import { cachedFetch } from "@/lib/fetch-with-cache"
import type { ProductListing } from "@/utils/types"

async function parseJson(response: Response): Promise<unknown> {
  return response.json().catch(() => ({}))
}

async function fetchProductListingsFromApi(
  productId?: number,
  sellerId?: number,
  page?: number,
  limit?: number
): Promise<ProductListing[]> {
  try {
    const params = new URLSearchParams()
    if (productId !== undefined) {
      params.set("productId", String(productId))
    }
    if (sellerId !== undefined) {
      params.set("sellerId", String(sellerId))
    }
    if (page !== undefined) {
      params.set("page", String(page))
    }
    if (limit !== undefined) {
      params.set("limit", String(limit))
    }

    const query = params.toString()
    const endpoint =
      typeof window === "undefined"
        ? query
          ? `${BACKEND_URL}/product-listings?${query}`
          : `${BACKEND_URL}/product-listings`
        : query
          ? `/api/product-listings?${query}`
          : "/api/product-listings"

    const cacheKey = `listings:p${productId ?? 0}:s${sellerId ?? 0}:p${page ?? 1}` + (limit !== undefined && limit > 0 ? `:l${limit}` : '')

    const productListings = await cachedFetch<ProductListing[]>(endpoint, {
      cacheKey,
      cacheTtl: 300,
    })
    return productListings
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown product listings fetch error"
    throw new Error(`Unable to load product listings from backend. ${message}`)
  }
}

export async function getProductListings(
  productId?: number,
  sellerId?: number,
  page?: number,
  limit?: number
): Promise<ProductListing[]> {
  try {
    const productListings = await fetchProductListingsFromApi(productId, sellerId, page, limit)
    return productListings
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.startsWith(
          "Unable to load product listings from backend."
        )
      ) {
        throw error
      }

      throw new Error(
        `Unable to load product listings from backend. ${error.message}`
      )
    }

    throw new Error(
      "Unable to load product listings from backend. Unknown product listings service error"
    )
  }
}

export async function updateProductListing(
  id: number,
  payload: {
    ref?: string
    price?: number
    old_price?: number | null
    product_url?: string
    is_active?: boolean
    availability?: boolean | null
    productId?: number
    sellerId?: number
  }
): Promise<{ id?: number }> {
  const response = await fetch(`/api/product-listings/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const data = (await parseJson(response)) as { error?: string }
  if (!response.ok) {
    throw new Error(data.error || "Failed to update product listing.")
  }

  return data as { id?: number }
}

export async function setProductListingActive(
  id: number,
  isActive: boolean,
): Promise<{ id?: number; is_active?: boolean }> {
  const response = await fetch(`/api/product-listings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active: isActive }),
  })

  const data = (await parseJson(response)) as { error?: string }
  if (!response.ok) {
    throw new Error(data.error || "Failed to update listing status.")
  }

  return data as { id?: number; is_active?: boolean }
}

export async function deleteProductListing(id: number): Promise<{ success?: boolean }> {
  const response = await fetch(`/api/product-listings/${id}`, {
    method: "DELETE",
  })

  const data = (await parseJson(response)) as { error?: string }
  if (!response.ok) {
    throw new Error(data.error || "Failed to delete product listing.")
  }

  return data as { success?: boolean }
}
