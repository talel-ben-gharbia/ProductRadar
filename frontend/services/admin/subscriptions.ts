export type SubscriptionItem = {
  id: number
  plan_type: string
  active: boolean
  start_date: string | null
  end_date: string | null
  alerts_limit: number
  favorites_limit: number
  price_history_access: number
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

  const response = await fetch(`/api/admin/subscriptions${query}`, {
    cache: "no-store",
  })

  const data = (await parseJson(response)) as { error?: string }
  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch subscriptions.")
  }

  return data as SubscriptionsResponse
}

export async function getSubscriptionDetail(id: number): Promise<SubscriptionItem> {
  const response = await fetch(`/api/admin/subscriptions/${id}`, {
    cache: "no-store",
  })

  const data = (await parseJson(response)) as { error?: string }
  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch subscription detail.")
  }

  return data as SubscriptionItem
}

export async function resyncAllSubscriptions(): Promise<SubscriptionResyncResponse> {
  const response = await fetch('/api/admin/subscriptions/resync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })

  const data = (await parseJson(response)) as { error?: string }
  if (!response.ok) {
    throw new Error(data.error || 'Failed to resync subscriptions.')
  }

  return data as SubscriptionResyncResponse
}
