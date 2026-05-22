export type SubscriptionItem = {
  id: number
  plan_type: string
  active: boolean
  start_date: string | null
  end_date: string | null
  alerts_limit: number | null
  favorites_limit: number | null
  price_history_access: number | null
  duration_months: number | null
  owner_type: string | null
  owner_id: number | null
  owner_name: string | null
  client: {
    id: number
    email: string
    is_active: boolean | null
    account_type: string | null
    account_status: string | null
  } | null
}

export type SubscriptionsResponse = {
  items: SubscriptionItem[]
  pagination: {
    limit: number
    offset: number
    total: number
  }
  stats: {
    total: number
    active: number
    premium: number
    b2b: number
    free: number
  }
}

export type SubscriptionResyncResponse = {
  message: string
  summary: {
    processed_users: number
    created: number
    updated: number
    unchanged: number
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

export async function getSubscriptions(
  limit: number,
  offset: number,
  filters: { planType?: string; active?: string; accountType?: string } = {},
): Promise<SubscriptionsResponse> {
  const query = buildQuery({
    limit,
    offset,
    planType: filters.planType,
    active: filters.active,
    accountType: filters.accountType,
  })

  const cacheKey = `subscriptions:list:l${limit}:o${offset}:${JSON.stringify(filters)}`

  return cachedFetch<SubscriptionsResponse>(`/api/admin/subscriptions${query}`, {
    cacheKey,
    cacheTtl: 300,
  })
}

export async function getSubscriptionDetail(id: number): Promise<SubscriptionItem> {
  return cachedFetch<SubscriptionItem>(`/api/admin/subscriptions/${id}`, {
    cacheKey: `subscriptions:detail:${id}`,
    cacheTtl: 300,
  })
}

export async function resyncAllSubscriptions(): Promise<SubscriptionResyncResponse> {
  const response = await fetch('/api/admin/subscriptions/resync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })

  const data = (await response.json().catch(() => ({}))) as { error?: string }
  if (!response.ok) {
    throw new Error(data.error || 'Failed to resync subscriptions.')
  }

  return data as SubscriptionResyncResponse
}
