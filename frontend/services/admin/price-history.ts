import { BACKEND_URL } from "@/utils/admin/constants"
import type { PriceHistoryEntry } from "@/utils/types"

async function fetchPriceHistoryFromApi(
  productId?: number,
  listingId?: number
): Promise<PriceHistoryEntry[]> {
  try {
    const params = new URLSearchParams()
    if (productId !== undefined) {
      params.set("productId", String(productId))
    }
    if (listingId !== undefined) {
      params.set("listingId", String(listingId))
    }

    const query = params.toString()
    const endpoint = query
      ? `${BACKEND_URL}/price-history?${query}`
      : `${BACKEND_URL}/price-history`

    const response = await fetch(endpoint, { cache: "no-store" })

    if (!response.ok) {
      throw new Error(`Failed to fetch price history: ${response.status}`)
    }

    return (await response.json()) as PriceHistoryEntry[]
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown price history fetch error"
    throw new Error(`Unable to load price history from backend. ${message}`)
  }
}

export async function getPriceHistory(
  productId?: number,
  listingId?: number
): Promise<PriceHistoryEntry[]> {
  try {
    return await fetchPriceHistoryFromApi(productId, listingId)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith("Unable to load price history from backend.")) {
        throw error
      }

      throw new Error(`Unable to load price history from backend. ${error.message}`)
    }

    throw new Error(
      "Unable to load price history from backend. Unknown price history service error"
    )
  }
}
