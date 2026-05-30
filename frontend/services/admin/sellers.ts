import { BACKEND_URL } from "@/utils/admin/constants"
import { cachedFetch } from "@/lib/fetch-with-cache"
import { withCache } from "@/lib/server-cache"

export type Seller = {
  id: number
  name: string
  url: string | null
}

export type SellerInput = {
  name: string
  url: string
}

async function parseJson(response: Response): Promise<unknown> {
  return response.json().catch(() => ({}))
}

async function fetchSellersFromApi(): Promise<Seller[]> {
  try {
    const endpoint =
      typeof window === "undefined"
        ? `${BACKEND_URL}/sellers`
        : "/api/sellers"

    const sellers = await cachedFetch<Seller[]>(endpoint, {
      cacheKey: "sellers:all",
      cacheTtl: 300,
    })
    return sellers
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sellers fetch error"
    throw new Error("Unable to load sellers from backend.")
  }
}

export const getSellers = withCache(async (): Promise<Seller[]> => {
  try {
    return await fetchSellersFromApi()
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith("Unable to load sellers from backend.")) {
        throw error
      }

      throw new Error("Unable to load sellers from backend.")
    }

    throw new Error("Unable to load sellers from backend. Unknown sellers service error")
  }
})

async function writeSeller(endpoint: string, method: "POST" | "PUT" | "DELETE", payload?: SellerInput): Promise<Seller> {
  const response = await fetch(endpoint, {
    method,
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
    cache: "no-store",
  })

  const data = (await parseJson(response)) as { error?: string }
  if (!response.ok) {
    throw new Error(data.error || "Seller request failed.")
  }

  return data as Seller
}

export async function createSeller(input: SellerInput): Promise<Seller> {
  return writeSeller("/api/admin/sellers", "POST", input)
}

export async function updateSeller(id: number, input: SellerInput): Promise<Seller> {
  return writeSeller("/api/admin/sellers/", "PUT", input)
}

export async function deleteSeller(id: number): Promise<void> {
  const response = await fetch("/api/admin/sellers/", {
    method: "DELETE",
    cache: "no-store",
  })

  const data = (await parseJson(response)) as { error?: string }
  if (!response.ok) {
    throw new Error(data.error || "Failed to delete seller.")
  }
}
