import { BACKEND_URL } from "@/utils/admin/constants"
import { cachedFetch } from "@/lib/fetch-with-cache"
import type { Product } from "@/utils/types"

async function fetchProductsFromApi(categoryId?: number): Promise<Product[]> {
  try {
    const query = categoryId ? `?categoryId=${categoryId}` : ""
    const endpoint =
      typeof window === "undefined"
        ? `${BACKEND_URL}/products${query}`
        : `/api/products${query}`

    const cacheKey = categoryId ? `products:cat${categoryId}` : "products:all"

    const products = await cachedFetch<Product[]>(endpoint, {
      cacheKey,
      cacheTtl: 300,
    })
    return products
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown products fetch error"
    throw new Error(`Unable to load products from backend. ${message}`)
  }
}

export async function updateProduct(
  id: number,
  payload: {
    name?: string
    brand?: string | null
    description?: string
    image_url?: string | null
    categoryId?: number
  }
): Promise<{ id?: number }> {
  const response = await fetch(`/api/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const data = (await response.json().catch(() => ({}))) as { error?: string }
  if (!response.ok) {
    throw new Error(data.error || "Failed to update product.")
  }

  return data as { id?: number }
}

export async function getProducts(categoryId?: number): Promise<Product[]> {
  try {
    const products = await fetchProductsFromApi(categoryId)
    return products
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith("Unable to load products from backend.")) {
        throw error
      }

      throw new Error(`Unable to load products from backend. ${error.message}`)
    }

    throw new Error(
      "Unable to load products from backend. Unknown products service error"
    )
  }
}
