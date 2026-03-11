import { BACKEND_URL } from "@/utils/admin/constants"

export type ProductListing = {
  id: number
  price: number | null
  old_price: number | null
  product_url: string
  availability: boolean | null
  trust_score: number | null
  created_at: string | null
  updatet_at: string | null
  is_active: boolean | null
  productId: number | null
  productName: string | null
  productImageUrl: string | null
  sellerId: number | null
  sellerName: string | null
}

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
    const endpoint = query
      ? `${BACKEND_URL}/product-listings?${query}`
      : `${BACKEND_URL}/product-listings`
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
    const message =
      error instanceof Error
        ? error.message
        : "Unknown product listings service error"
    throw new Error(`Unable to load product listings from backend. ${message}`)
  }
}
