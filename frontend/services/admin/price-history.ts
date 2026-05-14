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
    const isServer = typeof window === "undefined"
    const endpoint = isServer
      ? `${BACKEND_URL}/price-history${query ? "?" + query : ""}`
      : `/api/price-history${query ? "?" + query : ""}`

    const headers: Record<string, string> = {}
    if (isServer) {
      headers["X-Admin-Api-Key"] =
        process.env.ADMIN_API_KEY ?? "dev-admin-api-key-change-me"
      headers["X-Admin-Role"] = "ROLE_SUPER_ADMIN"
    }

    const res = await fetch(endpoint, { cache: "no-store", headers })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.error ?? `HTTP ${res.status}`)
    }
    return await res.json()
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
