"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  downloadScrapingLogsCsv,
  getFilteredScrapingLogs,
  getSourceHealth,
  type ScrapingLogItem,
  type SourceHealth,
} from "@/services/admin/scraping-logs"

type ScrapingLogsPanelProps = {
  limit?: number
}

const PAGE_SIZE = 20

function formatDate(value: string | null): string {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleString()
}

export default function ScrapingLogsPanel({ limit = 25 }: ScrapingLogsPanelProps) {
  const [logs, setLogs] = useState<ScrapingLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [sourceFilter, setSourceFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [daysFilter, setDaysFilter] = useState(7)
  const [healthOpen, setHealthOpen] = useState(false)
  const [healthLoading, setHealthLoading] = useState(false)
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [health, setHealth] = useState<SourceHealth | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const logsResponse = await getFilteredScrapingLogs({
        limit: Math.min(PAGE_SIZE, limit),
        offset,
        source: sourceFilter,
        status: statusFilter,
        days: daysFilter,
      })
      setLogs(logsResponse.items)
      setTotal(logsResponse.pagination?.total ?? logsResponse.items.length)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load scraping logs.")
    } finally {
      setLoading(false)
    }
  }, [daysFilter, limit, offset, sourceFilter, statusFilter])

  useEffect(() => {
    void reload()
  }, [reload])

  const currentPage = useMemo(() => Math.floor(offset / PAGE_SIZE) + 1, [offset])
  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])

  async function handleExportLogs() {
    try {
      await downloadScrapingLogsCsv()
      toast.success("Scraping logs exported as CSV.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export scraping logs.")
    }
  }

  async function openSourceHealth(sourceName: string) {
    setSelectedSource(sourceName)
    setHealthOpen(true)
    setHealthLoading(true)
    setHealth(null)

    try {
      const data = await getSourceHealth(sourceName)
      setHealth(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load source health.")
    } finally {
      setHealthLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Scraping Logs</CardTitle>
          <Button type="button" variant="outline" onClick={handleExportLogs} disabled={loading}>
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <Input
            value={sourceFilter}
            onChange={(event) => {
              setOffset(0)
              setSourceFilter(event.target.value)
            }}
            placeholder="Filter by source"
            className="md:col-span-2"
          />
          <select
            value={statusFilter}
            onChange={(event) => {
              setOffset(0)
              setStatusFilter(event.target.value)
            }}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">All statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
          </select>
          <select
            value={String(daysFilter)}
            onChange={(event) => {
              setOffset(0)
              setDaysFilter(Number(event.target.value))
            }}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="1">Last 1 day</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Executed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    Loading scraping logs...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No logs found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.source_name}</TableCell>
                    <TableCell>{log.workflow_name}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === "SUCCESS" ? "default" : "destructive"}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.duration_ms ?? "-"} ms</TableCell>
                    <TableCell>{log.records_processed ?? "-"}</TableCell>
                    <TableCell>{formatDate(log.executed_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openSourceHealth(log.source_name)}
                      >
                        Health
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Showing {logs.length === 0 ? 0 : offset + 1}-{Math.min(offset + logs.length, total)} of {total}
          </span>
          <div className="space-x-2">
            <Button
              size="sm"
              variant="outline"
              disabled={offset === 0 || loading}
              onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={offset + PAGE_SIZE >= total || loading}
              onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
          <span className="text-muted-foreground">
            Page {currentPage} / {pageCount}
          </span>
        </div>

        <Dialog open={healthOpen} onOpenChange={setHealthOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Source Health{selectedSource ? `: ${selectedSource}` : ""}</DialogTitle>
              <DialogDescription>
                Health summary generated from recent scraping runs.
              </DialogDescription>
            </DialogHeader>

            {healthLoading ? (
              <p className="text-sm text-muted-foreground">Loading source health...</p>
            ) : !health ? (
              <p className="text-sm text-muted-foreground">No health data available.</p>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border p-2">Total runs: <strong>{health.total_runs}</strong></div>
                  <div className="rounded-md border p-2">Success rate: <strong>{health.success_rate}%</strong></div>
                  <div className="rounded-md border p-2">Success: <strong>{health.success_count}</strong></div>
                  <div className="rounded-md border p-2">Failures: <strong>{health.failure_count}</strong></div>
                  <div className="rounded-md border p-2">Consecutive failures: <strong>{health.consecutive_failures}</strong></div>
                  <div className="rounded-md border p-2">Avg duration: <strong>{health.avg_duration_ms} ms</strong></div>
                </div>

                <div>
                  <p className="mb-2 font-medium">Recent Errors</p>
                  {health.last_errors.length === 0 ? (
                    <p className="text-muted-foreground">No recent errors.</p>
                  ) : (
                    <div className="space-y-2">
                      {health.last_errors.map((item, index) => (
                        <div key={`${item.executed_at ?? "none"}-${index}`} className="rounded-md border p-2">
                          <p className="text-xs text-muted-foreground">{formatDate(item.executed_at)}</p>
                          <p>{item.error}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
