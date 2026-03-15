import { BACKEND_URL } from "@/utils/admin/constants"

export type Seller = {
  id: number
  name: string
  url: string | null
}

async function fetchSellersFromApi(): Promise<Seller[]> {
  try {
    const endpoint =
      typeof window === "undefined"
        ? `${BACKEND_URL}/sellers`
        : "/api/sellers"

    const response = await fetch(endpoint, {
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch sellers: ${response.status}`)
    }

    return (await response.json()) as Seller[]
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sellers fetch error"
    throw new Error(`Unable to load sellers from backend. ${message}`)
  }
}

export async function getSellers(): Promise<Seller[]> {
  try {
    return await fetchSellersFromApi()
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith("Unable to load sellers from backend.")) {
        throw error
      }

      throw new Error(`Unable to load sellers from backend. ${error.message}`)
    }

    throw new Error("Unable to load sellers from backend. Unknown sellers service error")
  }
}
