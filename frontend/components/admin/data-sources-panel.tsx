"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  createDataSource,
  getDataSources,
  type DataSourceItem,
  testDataSourceHealth,
  updateDataSource,
} from "@/services/admin/data-sources"

function formatDate(value: string | null): string {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleString()
}

const PAGE_SIZE = 20

export default function DataSourcesPanel() {
  const [sources, setSources] = useState<DataSourceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState("")
  const [active, setActive] = useState("")
  const [name, setName] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [sourceType, setSourceType] = useState<"API" | "SCRAPER">("SCRAPER")
  const [creating, setCreating] = useState(false)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [testingName, setTestingName] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const sourceResponse = await getDataSources({
        limit: PAGE_SIZE,
        offset,
        search,
        active,
      })
      setSources(sourceResponse.items)
      setTotal(sourceResponse.pagination?.total ?? sourceResponse.items.length)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load data sources.")
    } finally {
      setLoading(false)
    }
  }, [offset, search, active])

  useEffect(() => {
    void reload()
  }, [reload])

  const currentPage = useMemo(() => Math.floor(offset / PAGE_SIZE) + 1, [offset])
  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])

  async function handleCreateSource() {
    if (name.trim() === "" || baseUrl.trim() === "") {
      toast.error("Name and base URL are required.")
      return
    }

    setCreating(true)
    try {
      const created = await createDataSource({
        name,
        base_url: baseUrl,
        type: sourceType,
      })
      setSources((prev) => [created, ...prev].slice(0, PAGE_SIZE))
      setTotal((prev) => prev + 1)
      setName("")
      setBaseUrl("")
      setSourceType("SCRAPER")
      toast.success("Data source created.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create data source.")
    } finally {
      setCreating(false)
    }
  }

  async function toggleSource(source: DataSourceItem) {
    setSavingId(source.id)
    try {
      const updated = await updateDataSource(source.id, {
        is_active: !source.is_active,
      })
      setSources((prev) => prev.map((item) => (item.id === source.id ? updated : item)))
      toast.success("Data source updated.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update data source.")
    } finally {
      setSavingId(null)
    }
  }

  async function runSourceHealthTest(source: DataSourceItem) {
    setTestingName(source.name)
    try {
      const result = await testDataSourceHealth(source.name)
      const healthy = Boolean(result.healthy) || String(result.status ?? "").toLowerCase() === "healthy"
      if (healthy) {
        toast.success(`${source.name}: source health is OK and ingestion endpoint is reachable.`)
      } else {
        toast.warning(`${source.name}: health check completed but reported issues.`)
      }
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to test source health.")
    } finally {
      setTestingName(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Sources</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            value={search}
            onChange={(event) => {
              setOffset(0)
              setSearch(event.target.value)
            }}
            placeholder="Search name, base URL, type"
            className="md:col-span-2"
          />
          <select
            value={active}
            onChange={(event) => {
              setOffset(0)
              setActive(event.target.value)
            }}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">All statuses</option>
            <option value="true">Active only</option>
            <option value="false">Disabled only</option>
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Source name"
          />
          <Input
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="https://source.example"
          />
          <select
            value={sourceType}
            onChange={(event) => setSourceType(event.target.value as "API" | "SCRAPER")}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="SCRAPER">SCRAPER (no seller API)</option>
            <option value="API">API (seller provides endpoint)</option>
          </select>
        </div>

        <p className="text-xs text-muted-foreground">
          Use <strong className="text-foreground">API</strong> when seller provides a maintained API.
          Use <strong className="text-foreground">SCRAPER</strong> when no API exists and data must be collected from pages.
        </p>

        <div className="flex justify-end">
          <Button type="button" onClick={handleCreateSource} disabled={creating}>
            {creating ? "Creating..." : "Add Data Source"}
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Base URL</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Success</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Loading data sources...
                  </TableCell>
                </TableRow>
              ) : sources.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No data sources found.
                  </TableCell>
                </TableRow>
              ) : (
                sources.map((source) => (
                  <TableRow key={source.id}>
                    <TableCell className="font-medium">{source.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{source.base_url}</TableCell>
                    <TableCell>{source.type}</TableCell>
                    <TableCell>
                      <Badge variant={source.is_active ? "default" : "secondary"}>
                        {source.is_active ? "Active" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>{formatDate(source.last_success_at)}</p>
                        {source.last_error ? (
                          <p className="text-xs text-destructive">Last error: {source.last_error}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">No recent error recorded</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runSourceHealthTest(source)}
                          disabled={testingName === source.name}
                        >
                          {testingName === source.name ? "Testing..." : "Test"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleSource(source)}
                          disabled={savingId === source.id}
                        >
                          {source.is_active ? "Disable" : "Enable"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Showing {sources.length === 0 ? 0 : offset + 1}-{Math.min(offset + sources.length, total)} of {total}
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
      </CardContent>
    </Card>
  )
}