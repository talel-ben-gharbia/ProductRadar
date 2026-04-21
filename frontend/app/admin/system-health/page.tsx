import { cookies } from "next/headers"

import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-session"
import { BACKEND_URL } from "@/utils/admin/constants"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type CheckResult = {
  name: string
  endpoint: string
  status: "Healthy" | "Unhealthy"
  code: number | null
  latencyMs: number | null
}

type SystemHealthPayload = {
  status?: string
  checked_at?: string
  scraping_health?: {
    total_runs?: number
    success_rate?: number
    failed_runs?: number
    avg_duration_ms?: number
    sources?: Array<{
      source_name?: string
      total?: number
      success?: number
      failed?: number
      success_rate?: number
    }>
  }
}

async function checkEndpoint(name: string, endpoint: string): Promise<CheckResult> {
  const startedAt = Date.now()

  try {
    const response = await fetch(endpoint, { cache: "no-store" })
    const latencyMs = Date.now() - startedAt

    return {
      name,
      endpoint,
      status: response.ok ? "Healthy" : "Unhealthy",
      code: response.status,
      latencyMs,
    }
  } catch {
    return {
      name,
      endpoint,
      status: "Unhealthy",
      code: null,
      latencyMs: null,
    }
  }
}

export default async function SystemHealthPage() {
  const checks = await Promise.all([
    checkEndpoint("Products API", `${BACKEND_URL}/products`),
    checkEndpoint("Categories API", `${BACKEND_URL}/categories`),
    checkEndpoint("Listings API", `${BACKEND_URL}/product-listings`),
  ])

  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  const session = token ? await verifySessionToken(token) : null

  let health: SystemHealthPayload | null = null
  let fetchError: string | null = null

  if (!session || !["ROLE_SUPER_ADMIN", "ROLE_SUB_ADMIN"].includes(session.role)) {
    fetchError = "You are not authorized to view system health."
  } else {
    try {
      const response = await fetch(`${BACKEND_URL}/admin/api/system-health`, {
        cache: "no-store",
        headers: {
          "X-Admin-Api-Key": process.env.ADMIN_API_KEY ?? "dev-admin-api-key-change-me",
          "X-Admin-Role": session.role,
          "X-Admin-Id": String(session.id),
        },
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        fetchError = (data as { error?: string }).error ?? "Failed to load system health."
      } else {
        health = (await response.json()) as SystemHealthPayload
      }
    } catch {
      fetchError = "Unable to connect to the backend."
    }
  }

  const healthyCount = checks.filter((c) => c.status === "Healthy").length
  const scrapingHealth = health?.scraping_health
  const sourceRows = scrapingHealth?.sources ?? []

  return (
    <section className="w-full max-w-none space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">System Health</h1>
        <p className="text-sm text-muted-foreground">
          Endpoint status checks for core backend services.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm font-medium">Overall status</p>
          <p className="mt-2 text-3xl font-bold">
            {healthyCount}/{checks.length} Healthy
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm font-medium">Scraping Success Rate</p>
          <p className="mt-2 text-3xl font-bold">
            {scrapingHealth ? `${scrapingHealth.success_rate ?? 0}%` : "-"}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm font-medium">Recent Runs</p>
          <p className="mt-2 text-3xl font-bold">{scrapingHealth?.total_runs ?? "-"}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm font-medium">Avg Duration</p>
          <p className="mt-2 text-3xl font-bold">
            {scrapingHealth?.avg_duration_ms !== undefined && scrapingHealth.avg_duration_ms !== null
              ? `${scrapingHealth.avg_duration_ms} ms`
              : "-"}
          </p>
        </div>
      </div>

      {health?.checked_at ? (
        <p className="text-xs text-muted-foreground">Last backend check: {health.checked_at}</p>
      ) : null}

      {fetchError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {fetchError}
        </div>
      ) : null}

      {sourceRows.length > 0 ? (
        <div className="w-full rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Success</TableHead>
                <TableHead>Failed</TableHead>
                <TableHead>Success Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sourceRows.map((source) => (
                <TableRow key={source.source_name ?? "unknown"}>
                  <TableCell className="font-medium">{source.source_name ?? "Unknown"}</TableCell>
                  <TableCell>{source.total ?? 0}</TableCell>
                  <TableCell>{source.success ?? 0}</TableCell>
                  <TableCell>{source.failed ?? 0}</TableCell>
                  <TableCell>{source.success_rate ?? 0}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      <div className="w-full rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Latency</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {checks.map((check) => (
              <TableRow key={check.name}>
                <TableCell className="font-medium">{check.name}</TableCell>
                <TableCell
                  className={check.status === "Healthy" ? "text-emerald-600" : "text-destructive"}
                >
                  {check.status}
                </TableCell>
                <TableCell>{check.code ?? "-"}</TableCell>
                <TableCell>{check.latencyMs !== null ? `${check.latencyMs} ms` : "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
