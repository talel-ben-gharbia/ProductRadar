import { BACKEND_URL } from "@/utils/admin/constants"
import { cachedFetch } from "@/lib/fetch-with-cache"
import { withCache } from "@/lib/server-cache"
import type { BestTimeToBuyPrediction } from "@/utils/types"

interface BestTimeToBuyResponse {
  error?: string
  message?: string
  prediction?: BestTimeToBuyPrediction
  friendly_message?: string
}

export const getBestTimeToBuy = withCache(async (
  productId: number,
  alerterId: number,
): Promise<BestTimeToBuyResponse> => {
  const params = new URLSearchParams({
    productId: String(productId),
    alerterId: String(alerterId),
  })

  const endpoint = `${BACKEND_URL}/best-time-to-buy?${params.toString()}`
  const cacheKey = `best-time-to-buy:p${productId}:a${alerterId}`

  const data = await cachedFetch<BestTimeToBuyResponse>(endpoint, {
    cacheKey,
    cacheTtl: 300,
  })

  if (!data.prediction) {
    throw new Error("Prediction payload is missing")
  }

  return data
})
