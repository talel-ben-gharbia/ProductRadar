import { BACKEND_URL } from "@/utils/admin/constants"
import type { Product } from "@/utils/types"

async function fetchProductsFromApi(categoryId?: number): Promise<Product[]> {
  try {
    const query = categoryId ? `?categoryId=${categoryId}` : ""
    const endpoint =
      typeof window === "undefined"
        ? `${BACKEND_URL}/products${query}`
        : `/api/products${query}`

    const response = await fetch(endpoint, {
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status}`)
    }

    const products = (await response.json()) as Product[]
    return products
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown products fetch error"
    throw new Error(`Unable to load products from backend. ${message}`)
  }
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
