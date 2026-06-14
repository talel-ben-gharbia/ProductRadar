export type UserAccountType = "B2C" | "B2B_COMPANY" | "B2B_MARKET"
export type UserAccountStatus = "ACTIVE" | "SUSPENDED" | "BANNED"
export type B2BStatus = "PENDING" | "APPROVED" | "REJECTED"

export type AdminUser = {
  id: number
  email: string
  full_name: string | null
  joined_at: string | null
  updated_at: string | null
  last_login: string | null
  is_active: boolean | null
  is_verified: boolean | null
  account_type: UserAccountType | string
  account_status: UserAccountStatus | string
  b2b_status: B2BStatus | null
  company_name: string | null
  company_market: string | null
  company_country: string | null
  company_website: string | null
  subscription: {
    id: number
    plan_type: string
    active: boolean
    start_date: string | null
    end_date: string | null
    alerts_limit: number
    favorites_limit: number
  } | null
  usage: {
    alerts_used: number
    favorites_used: number
  }
}

export type PaginatedUsersResponse = {
  items: AdminUser[]
  pagination: {
    limit: number
    offset: number
    total: number
  }
}

export type UserAdminStatsResponse = {
  users: {
    total: number
    b2c: number
    b2b_company: number
    b2b_market: number
    active: number
    suspended: number
    banned: number
  }
  subscriptions: {
    total: number
    active: number
    premium: number
    free: number
  }
  pending_b2b_requests: number
}

export type B2BReviewActivity = {
  id: number
  action: "B2B_APPROVE" | "B2B_REJECT" | string
  created_at: string | null
  admin: string | null
  entity_id: number | null
  before?: {
    email?: string
    company_name?: string
    account_type?: string
  } | null
  after?: {
    decision?: "APPROVED" | "REJECTED" | string
    reviewer_note?: string | null
    approved_email?: string | null
  } | null
}

export type RecentB2BReviewsResponse = {
  items: B2BReviewActivity[]
}

export type UserFilters = {
  search?: string
  accountType?: string
  status?: string
  b2bStatus?: string
}

import { cachedFetch } from "@/lib/fetch-with-cache"
import { withCache } from "@/lib/server-cache"

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

export const getUsers = withCache(async (
  limit: number,
  offset: number,
  filters: UserFilters = {},
): Promise<PaginatedUsersResponse> => {
  const query = buildQuery({
    limit,
    offset,
    search: filters.search,
    accountType: filters.accountType,
    status: filters.status,
    b2bStatus: filters.b2bStatus,
  })

  const cacheKey = `users:list:${limit}:${offset}:${query}`

  return cachedFetch<PaginatedUsersResponse>(`/api/admin/users${query}`, {
    cacheKey,
    cacheTtl: 300,
  })
})

export const getUserAdminStats = withCache(async (): Promise<UserAdminStatsResponse> => {
  return cachedFetch<UserAdminStatsResponse>(`/api/admin/users/stats`, {
    cacheKey: "users:stats",
    cacheTtl: 300,
  })
})

export async function updateUserStatus(
  id: number,
  status: UserAccountStatus,
): Promise<AdminUser> {
  const response = await fetch(`/api/admin/users/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  })

  const data = (await parseJson(response)) as { error?: string }
  if (!response.ok) {
    throw new Error(data.error || "Failed to update user status.")
  }

  return data as AdminUser
}

export const getPendingB2BUsers = withCache(async (
  limit: number,
  offset: number,
  search?: string,
): Promise<PaginatedUsersResponse> => {
  const query = buildQuery({ limit, offset, search })
  const cacheKey = `users:b2b_pending:${limit}:${offset}:${query}`

  return cachedFetch<PaginatedUsersResponse>(`/api/admin/users/b2b/pending${query}`, {
    cacheKey,
    cacheTtl: 300,
  })
})

export async function updateB2BStatus(
  id: number,
  status: Extract<B2BStatus, "APPROVED" | "REJECTED">,
  reviewerNote?: string,
  sellerId?: number,
  planType?: string,
  durationMonths?: number,
  brandName?: string
): Promise<AdminUser> {
  const response = await fetch(`/api/admin/users/b2b/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status,
      reviewer_note: reviewerNote,
      seller_id: sellerId,
      plan_type: planType,
      duration_months: durationMonths,
      brand_name: brandName,
    }),
  })

  const data = (await parseJson(response)) as { error?: string; detail?: string }
  if (!response.ok) {
    throw new Error(data.detail || data.error || "Failed to update B2B status.")
  }

  return data as AdminUser
}

export const getRecentB2BReviews = withCache(async (limit = 10): Promise<RecentB2BReviewsResponse> => {
  const query = buildQuery({ limit })
  const cacheKey = `users:b2b_recent:${limit}:${query}`

  return cachedFetch<RecentB2BReviewsResponse>(`/api/admin/users/b2b/recent${query}`, {
    cacheKey,
    cacheTtl: 300,
  })
})
