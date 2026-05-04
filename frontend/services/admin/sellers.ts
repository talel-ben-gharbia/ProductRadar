import { BACKEND_URL } from "@/utils/admin/constants"

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
  return writeSeller(`/api/admin/sellers/${id}`, "PUT", input)
}

export async function deleteSeller(id: number): Promise<void> {
  const response = await fetch(`/api/admin/sellers/${id}`, {
    method: "DELETE",
    cache: "no-store",
  })

  const data = (await parseJson(response)) as { error?: string }
  if (!response.ok) {
    throw new Error(data.error || "Failed to delete seller.")
  }
}
