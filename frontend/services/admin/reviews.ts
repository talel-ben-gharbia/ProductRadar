export type ReviewItem = {
  id: number
  status: "PENDING" | "APPROVED" | "REJECTED" | string
  rating: number
  comment: string | null
  moderation_note: string | null
  created_at: string | null
  updated_at: string | null
  client: {
    id: number | null
    email: string | null
  }
  product_listing: {
    id: number | null
    price: number | null
  }
  product: {
    id: number | null
    name: string | null
  }
}

export type ReviewsResponse = {
  items: ReviewItem[]
  pagination: {
    limit: number
    offset: number
    total: number
  }
}

import { cachedFetch } from "@/lib/fetch-with-cache"

function buildQuery(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue
    searchParams.set(key, String(value))
  }

  const query = searchParams.toString()
  return query ? `?${query}` : ""
}

async function parseJson(response: Response): Promise<unknown> {
  return response.json().catch(() => ({}))
}

export async function getReviews(
  limit: number,
  offset: number,
  filters: { status?: string; search?: string } = {},
): Promise<ReviewsResponse> {
  const query = buildQuery({
    limit,
    offset,
    status: filters.status,
    search: filters.search,
  })

  const cacheKey = `reviews:list:l${limit}:o${offset}:${JSON.stringify(filters)}`

  return cachedFetch<ReviewsResponse>(`/api/admin/reviews${query}`, {
    cacheKey,
    cacheTtl: 300,
  })
}

export async function updateReviewStatus(
  id: number,
  status: "PENDING" | "APPROVED" | "REJECTED",
  moderationNote?: string,
): Promise<ReviewItem> {
  const response = await fetch(`/api/admin/reviews/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status,
      moderation_note: moderationNote,
    }),
  })

  const data = (await parseJson(response)) as { error?: string }
  if (!response.ok) {
    throw new Error(data.error || "Failed to update review status.")
  }

  return data as ReviewItem
}

export async function downloadReviewsCsv(filters: { status?: string; search?: string } = {}): Promise<void> {
  const searchParams = new URLSearchParams()
  if (filters.status) searchParams.set("status", filters.status)
  if (filters.search) searchParams.set("search", filters.search)

  const response = await fetch(`/api/admin/reviews/export${searchParams.toString() ? `?${searchParams.toString()}` : ""}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    const data = (await parseJson(response)) as { error?: string }
    throw new Error(data.error || "Failed to export reviews.")
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "reviews-export.csv"
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
