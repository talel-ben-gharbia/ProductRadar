export type MergeProductsResponse = {
  primary_product_id: number
  summary: {
    merged_count: number
    moved_listings: number
    moved_alerts: number
    moved_price_histories: number
    moved_reviews: number
    moved_favorites: number
  }
}

export type SplitListingResponse = {
  message: string
  listing_id: number
  new_product: {
    id: number
    name: string
    brand: string | null
    categoryId: number | null
  }
}

async function parseJson(response: Response): Promise<unknown> {
  return response.json().catch(() => ({}))
}

export async function mergeProducts(primaryProductId: number, duplicateProductIds: number[]): Promise<MergeProductsResponse> {
  const response = await fetch("/api/admin/quality/products/merge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      primary_product_id: primaryProductId,
      duplicate_product_ids: duplicateProductIds,
    }),
  })

  const data = (await parseJson(response)) as { error?: string }
  if (!response.ok) {
    throw new Error(data.error || "Failed to merge products.")
  }

  return data as MergeProductsResponse
}

export async function splitListingToNewProduct(listingId: number, payload: {
  name: string
  brand?: string | null
  description?: string | null
  image_url?: string | null
  categoryId?: number | null
}): Promise<SplitListingResponse> {
  const response = await fetch(`/api/admin/quality/product-listings/${listingId}/split`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const data = (await parseJson(response)) as { error?: string }
  if (!response.ok) {
    throw new Error(data.error || "Failed to split listing.")
  }

  return data as SplitListingResponse
}
