import { BACKEND_URL } from "@/utils/admin/constants"

export type Product = {
  id: number
  ref: string
  name: string
  brand: string | null
  description: string
  specs_json: Record<string, unknown> | null
  image_url: string | null
  categoryId: number | null
}

async function fetchProductsFromApi(categoryId?: number): Promise<Product[]> {
  try {
    const query = categoryId ? `?categoryId=${categoryId}` : ""
    const response = await fetch(`${BACKEND_URL}/products${query}`, {
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
    const message =
      error instanceof Error ? error.message : "Unknown products service error"
    throw new Error(`Unable to load products from backend. ${message}`)
  }
}
