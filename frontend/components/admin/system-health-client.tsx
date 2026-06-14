"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  HardDrive,
  RefreshCw,
  Server,
  Zap,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type SystemHealthPayload = {
  status?: string
  checked_at?: string
  database?: {
    size?: string
    active_connections?: number
    total_connections?: number
  }
  cache?: {
    hits?: number
    misses?: number
    hit_rate?: number
    adapter?: string
  }
  scraping_health?: {
    total_runs?: number
    success_rate?: number
    failed_runs?: number
    avg_duration_ms?: number
  }
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "text-foreground",
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

export default function SystemHealthClient() {
  const [health, setHealth] = useState<SystemHealthPayload | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [backendUp, setBackendUp] = useState<boolean | null>(null)
  const [backendLatency, setBackendLatency] = useState<number | null>(null)

  const fetchAll = useCallback(async () => {
    setRefreshing(true)
    setFetchError(null)
    setBackendUp(null)

    // Ping backend health via the API proxy (server-side, no CORS issues)
    const startedAt = Date.now()
    try {
      const response = await fetch("/api/admin/system-health", { cache: "no-store" })
      const latency = Date.now() - startedAt
      setBackendLatency(latency)

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setFetchError((data as { error?: string }).error ?? "Failed to load system health.")
        setBackendUp(false)
      } else {
        const payload = (await response.json()) as SystemHealthPayload
        setHealth(payload)
        // Backend is up if it returned health data
        setBackendUp(payload?.status === "ok" || payload?.status === "degraded")
      }
    } catch {
      setFetchError("Unable to connect to the backend.")
      setBackendUp(false)
      setBackendLatency(Date.now() - startedAt)
    }

    setLastRefresh(new Date())
    setRefreshing(false)
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const db = health?.database
  const cache = health?.cache
  const scraping = health?.scraping_health
  const latency = backendLatency

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">System Health</h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${backendUp ? "border border-emerald-300 bg-emerald-50 text-emerald-700" : backendUp === false ? "border border-red-300 bg-red-50 text-red-700" : "border border-muted bg-muted text-muted-foreground"}`}>
              {backendUp ? <CheckCircle2 className="size-3" /> : backendUp === false ? <AlertTriangle className="size-3" /> : null}
              {backendUp ? "All Systems Operational" : backendUp === false ? "Backend Down" : "Checking..."}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Backend, database, cache, and scraper health.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAll}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {lastRefresh && (
        <p className="text-xs text-muted-foreground">
          Last refreshed: {lastRefresh.toLocaleTimeString()}
        </p>
      )}

      {fetchError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {fetchError}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Server}
          label="Backend"
          value={backendUp === true ? "Running" : backendUp === false ? "Down" : "..."}
          sub={latency != null ? `${latency}ms response` : "Checking..."}
          color={backendUp ? "text-emerald-600" : "text-red-600"}
        />
        <MetricCard
          icon={HardDrive}
          label="Database"
          value={db?.size ?? "-"}
          sub={`${db?.active_connections ?? 0} active / ${db?.total_connections ?? 0} total`}
        />
        <MetricCard
          icon={Zap}
          label="Cache"
          value={cache?.hit_rate != null ? `${cache.hit_rate}%` : "-"}
          sub={`${cache?.adapter ?? "?"} / ${cache?.hits ?? 0} hits`}
          color={(cache?.hit_rate ?? 0) >= 70 ? "text-emerald-600" : "text-amber-600"}
        />
        <MetricCard
          icon={Activity}
          label="Scraper"
          value={scraping ? `${scraping.success_rate ?? 0}%` : "-"}
          sub={`${scraping?.total_runs ?? 0} runs`}
          color={(scraping?.success_rate ?? 0) >= 90 ? "text-emerald-600" : (scraping?.success_rate ?? 0) >= 70 ? "text-amber-600" : "text-red-600"}
        />
      </div>

      {/* Database Details */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Database className="size-4" />
            Database
          </h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead>Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Size</TableCell>
              <TableCell>{db?.size ?? "N/A"}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Active Connections</TableCell>
              <TableCell>{db?.active_connections ?? 0}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Total Connections</TableCell>
              <TableCell>{db?.total_connections ?? 0}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Cache Details */}
      {cache && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Zap className="size-4" />
              Cache Service
            </h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Adapter</TableCell>
                <TableCell>{cache.adapter ?? "Unknown"}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Hit Rate</TableCell>
                <TableCell className={(cache.hit_rate ?? 0) >= 70 ? "text-emerald-600" : "text-amber-600"}>
                  {cache.hit_rate ?? 0}%
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Cache Hits</TableCell>
                <TableCell>{cache.hits ?? 0}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Cache Misses</TableCell>
                <TableCell>{cache.misses ?? 0}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {/* Scraper Performance */}
      {scraping && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Activity className="size-4" />
              Scraper Performance
            </h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Total Runs</TableCell>
                <TableCell>{scraping.total_runs ?? 0}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Success Rate</TableCell>
                <TableCell className={(scraping.success_rate ?? 0) >= 90 ? "text-emerald-600" : "text-red-600"}>
                  {scraping.success_rate ?? 0}%
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Failed Runs</TableCell>
                <TableCell className={scraping.failed_runs ? "text-red-600" : "text-muted-foreground"}>
                  {scraping.failed_runs ?? 0}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Avg Duration</TableCell>
                <TableCell>{scraping.avg_duration_ms != null ? `${scraping.avg_duration_ms}ms` : "N/A"}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
