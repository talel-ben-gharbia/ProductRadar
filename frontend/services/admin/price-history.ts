import { BACKEND_URL } from "@/utils/admin/constants"
import { cachedFetch } from "@/lib/fetch-with-cache"
import { withCache } from "@/lib/server-cache"
import type { PriceHistoryEntry } from "@/utils/types"

async function fetchPriceHistoryFromApi(
  productId?: number,
  listingId?: number,
  locale?: string
): Promise<PriceHistoryEntry[]> {
  try {
    const params = new URLSearchParams()
    if (productId !== undefined) {
      params.set("productId", String(productId))
    }
    if (listingId !== undefined) {
      params.set("listingId", String(listingId))
    }
    if (locale) params.set("lang", locale)

    const query = params.toString()
    const endpoint =
      typeof window === "undefined"
        ? `${BACKEND_URL}/price-history${query ? "?" + query : ""}`
        : `/api/price-history${query ? "?" + query : ""}`

    const cacheKey = `price-history:p${productId ?? 0}:l${listingId ?? 0}${locale ? `:${locale}` : ""}`

    return await cachedFetch<PriceHistoryEntry[]>(endpoint, {
      cacheKey,
      cacheTtl: 300,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown price history fetch error"
    throw new Error(`Unable to load price history from backend. ${message}`)
  }
}

export const getPriceHistory = withCache(async (
  productId?: number,
  listingId?: number,
  locale?: string
): Promise<PriceHistoryEntry[]> => {
  try {
    return await fetchPriceHistoryFromApi(productId, listingId, locale)
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
})
