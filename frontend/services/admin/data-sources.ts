export type DataSourceItem = {
  id: number
  name: string
  base_url: string
  type: string
  is_active: boolean
  last_success_at: string | null
  last_error: string | null
  created_at: string | null
  updated_at: string | null
}

export type DataSourcesResponse = {
  items: DataSourceItem[]
  pagination?: {
    limit: number
    offset: number
    total: number
  }
}

export type SourceHealthResponse = {
  status?: string
  healthy?: boolean
  message?: string
  last_success_at?: string | null
  [key: string]: unknown
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

export const getDataSources = withCache(async (filters: {
  limit?: number
  offset?: number
  search?: string
  active?: string
} = {}): Promise<DataSourcesResponse> => {
  const query = buildQuery({
    limit: filters.limit,
    offset: filters.offset,
    search: filters.search,
    active: filters.active,
  })

  const cacheKey = `data_sources:list:${JSON.stringify(filters)}`

  return cachedFetch<DataSourcesResponse>(`/api/admin/data-sources${query}`, {
    cacheKey,
    cacheTtl: 300,
  })
})

async function parseJson(response: Response): Promise<unknown> {
  return response.json().catch(() => ({}))
}

export async function createDataSource(payload: {
  name: string
  base_url: string
  type?: string
  is_active?: boolean
}): Promise<DataSourceItem> {
  const response = await fetch('/api/admin/data-sources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = (await parseJson(response)) as { error?: string }
  if (!response.ok) {
    throw new Error(data.error || 'Failed to create data source.')
  }

  return data as DataSourceItem
}

export async function updateDataSource(
  id: number,
  payload: Partial<Pick<DataSourceItem, 'name' | 'base_url' | 'type' | 'is_active' | 'last_error' | 'last_success_at'>>,
): Promise<DataSourceItem> {
  const response = await fetch(`/api/admin/data-sources/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = (await parseJson(response)) as { error?: string }
  if (!response.ok) {
    throw new Error(data.error || 'Failed to update data source.')
  }

  return data as DataSourceItem
}

export const testDataSourceHealth = withCache(async (sourceName: string): Promise<SourceHealthResponse> => {
  return cachedFetch<SourceHealthResponse>(
    `/api/admin/scraping-logs/source/${encodeURIComponent(sourceName)}/health`,
    { cacheKey: `data_sources:health:${sourceName}`, cacheTtl: 300 },
  )
})
