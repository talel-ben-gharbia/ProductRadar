import { BACKEND_URL } from "@/utils/admin/constants"
import type { ProductListing } from "@/utils/types"

async function fetchProductListingsFromApi(
  productId?: number,
  sellerId?: number
): Promise<ProductListing[]> {
  try {
    const params = new URLSearchParams()
    if (productId !== undefined) {
      params.set("productId", String(productId))
    }
    if (sellerId !== undefined) {
      params.set("sellerId", String(sellerId))
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
    const response = await fetch(endpoint, {
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch product listings: ${response.status}`)
    }

    const productListings = (await response.json()) as ProductListing[]
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
  sellerId?: number
): Promise<ProductListing[]> {
  try {
    const productListings = await fetchProductListingsFromApi(productId, sellerId)
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
