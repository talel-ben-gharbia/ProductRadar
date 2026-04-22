import { BACKEND_URL } from "@/utils/admin/constants"
import type { BestTimeToBuyPrediction } from "@/utils/types"

export async function getBestTimeToBuy(
  productId: number,
  alerterId: number,
): Promise<BestTimeToBuyPrediction> {
  const params = new URLSearchParams({
    productId: String(productId),
    alerterId: String(alerterId),
  })

  const endpoint = `${BACKEND_URL}/best-time-to-buy?${params.toString()}`
  const response = await fetch(endpoint, { cache: "no-store" })
  const data = (await response.json()) as {
    error?: string
    message?: string
    prediction?: BestTimeToBuyPrediction
  }

  if (!response.ok) {
    throw new Error(data.message || data.error || `Failed to fetch prediction: ${response.status}`)
  }

  if (!data.prediction) {
    throw new Error("Prediction payload is missing")
  }

  return data.prediction
}