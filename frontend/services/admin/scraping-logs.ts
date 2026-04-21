export type ScrapingLogItem = {
  id: number
  source_name: string
  workflow_name: string
  status: string
  duration_ms: number | null
  records_processed: number | null
  error_message: string | null
  executed_at: string | null
}

export type ScrapingLogsResponse = {
  items: ScrapingLogItem[]
  pagination?: {
    limit: number
    offset: number
    total: number
  }
}

export type ScrapingLogsFilters = {
  limit?: number
  offset?: number
  source?: string
  status?: string
  days?: number
}

export type SourceHealth = {
  source_name: string
  total_runs: number
  success_count: number
  failure_count: number
  success_rate: number
  last_status: string | null
  consecutive_failures: number
  avg_duration_ms: number
  last_errors: Array<{
    executed_at: string | null
    error: string
  }>
}

export type ScrapingWebhookPayload = {
  source_name: string
  workflow_name: string
  status: "SUCCESS" | "FAILED"
  duration_ms?: number | null
  records_processed?: number | null
  error_message?: string | null
  executed_at?: string | null
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    searchParams.set(key, String(value))
  }

  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

async function parseJson(response: Response): Promise<unknown> {
  return response.json().catch(() => ({}))
}

export async function getScrapingLogs(limit = 50): Promise<ScrapingLogsResponse> {
  const query = buildQuery({ limit })
  const response = await fetch(`/api/admin/scraping-logs${query}`, { cache: 'no-store' })

  const data = (await parseJson(response)) as { error?: string }
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch scraping logs.')
  }

  return data as ScrapingLogsResponse
}

export async function getRecentScrapingLogs(limit = 5): Promise<ScrapingLogsResponse> {
  const query = buildQuery({ limit })
  const response = await fetch(`/api/admin/scraping-logs/recent${query}`, { cache: 'no-store' })

  const data = (await parseJson(response)) as { error?: string }
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch recent scraping logs.')
  }

  return data as ScrapingLogsResponse
}

export async function getFilteredScrapingLogs(
  filters: ScrapingLogsFilters = {},
): Promise<ScrapingLogsResponse> {
  const query = buildQuery({
    limit: filters.limit,
    offset: filters.offset,
    source: filters.source,
    status: filters.status,
    days: filters.days,
  })

  const response = await fetch(`/api/admin/scraping-logs/filtered${query}`, {
    cache: 'no-store',
  })

  const data = (await parseJson(response)) as { error?: string }
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch filtered scraping logs.')
  }

  return data as ScrapingLogsResponse
}

export async function getSourceHealth(sourceName: string): Promise<SourceHealth> {
  const response = await fetch(
    `/api/admin/scraping-logs/source/${encodeURIComponent(sourceName)}/health`,
    { cache: 'no-store' },
  )

  const data = (await parseJson(response)) as { error?: string }
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch source health.')
  }

  return data as SourceHealth
}

export async function downloadScrapingLogsCsv(): Promise<void> {
  const response = await fetch('/api/admin/scraping-logs/export', { cache: 'no-store' })

  const data = (await parseJson(response)) as { error?: string }
  if (!response.ok) {
    throw new Error(data.error || 'Failed to export scraping logs.')
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'scraping-logs-export.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export async function ingestScrapingWebhook(payload: ScrapingWebhookPayload): Promise<{ message: string; id: number }> {
  const response = await fetch('/api/admin/scraping-logs/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = (await parseJson(response)) as { error?: string; message?: string; id?: number }
  if (!response.ok) {
    throw new Error(data.error || 'Failed to ingest scraping webhook payload.')
  }

  return {
    message: data.message ?? 'Scraping log received.',
    id: data.id ?? 0,
  }
}
