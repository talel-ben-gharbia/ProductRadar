import { BACKEND_URL } from "@/utils/admin/constants"
import { cachedFetch } from "@/lib/fetch-with-cache"
import { withCache } from "@/lib/server-cache"
import type { Product } from "@/utils/types"

async function fetchProductsFromApi(categoryId?: number): Promise<Product[]> {
  try {
    const query = categoryId ? `?categoryId=${categoryId}` : ""
    const endpoint =
      typeof window === "undefined"
        ? `${BACKEND_URL}/products${query}`
        : `/api/products${query}`

    const cacheKey = categoryId ? `products:cat` : "products:all"

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

export const getProducts = withCache(fetchProductsFromApi)

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

export async function deleteProduct(id: number): Promise<{ success?: boolean }> {
  const response = await fetch(`/api/products/${id}`, {
    method: "DELETE",
  })

  const data = (await response.json().catch(() => ({}))) as { error?: string }
  if (!response.ok) {
    throw new Error(data.error || "Failed to delete product.")
  }

  return data as { success?: boolean }
}
