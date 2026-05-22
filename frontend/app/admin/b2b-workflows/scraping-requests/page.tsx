"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, ExternalLink, Globe, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import B2BErrorState from "@/components/B2B/b2b-error-state"

type ScrapingRequest = {
  id?: number
  owner_type?: string
  company_id?: number
  company_name?: string
  target_type?: string
  target_url?: string
  status?: string
  notes?: string
  is_duplicate?: boolean
  duplicate_reason?: string
  created_at?: string
  updated_at?: string
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return ""
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  DUPLICATE: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
}

export default function ScrapingRequestsAdminPage() {
  const [requests, setRequests] = useState<ScrapingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rejectReasons, setRejectReasons] = useState<Record<number, string>>({})
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/b2b-workflows/scraping-requests")
      if (res.ok) {
        const data = await res.json()
        setRequests(data.items ?? [])
      }
    } catch {
      setError("Failed to load scraping requests")
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const approve = async (id: number) => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/b2b-workflows/scraping-requests/${id}/approve`, { method: "POST" })
      if (res.ok) fetchRequests()
    } catch {
      setError("Failed to approve request")
    }
    setActionLoading(null)
  }

  const reject = async (id: number) => {
    setActionLoading(id)
    try {
      const reason = rejectReasons[id] ?? ""
      const res = await fetch(`/api/admin/b2b-workflows/scraping-requests/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      if (res.ok) {
        setRejectReasons((prev) => { const n = { ...prev }; delete n[id]; return n })
        fetchRequests()
      }
    } catch {
      setError("Failed to reject request")
    }
    setActionLoading(null)
  }

  const pending = requests.filter((r) => r.status === "PENDING")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Scraping Requests</h1>
        <p className="text-sm text-muted-foreground">
          {pending.length} pending scraping request{pending.length !== 1 ? "s" : ""}
        </p>
      </div>

      {error && (
        <B2BErrorState message={error} onRetry={() => { setError(null); fetchRequests() }} />
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/50"><CardContent className="p-4"><div className="h-16 animate-pulse rounded-lg bg-muted" /></CardContent></Card>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <Globe className="size-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No scraping requests yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id} className={`border-border/50 shadow-sm transition-all ${r.status === "PENDING" ? "border-l-4 border-l-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/10" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase text-muted-foreground">{r.target_type ?? "PRODUCT"}</span>
                      <Badge className={`text-[10px] ${STATUS_COLORS[r.status ?? ""] ?? ""}`}>{r.status}</Badge>
                      {r.is_duplicate && <Badge variant="outline" className="text-[10px] text-amber-600">Duplicate</Badge>}
                      <span className="ml-auto text-[10px] text-muted-foreground">{timeAgo(r.created_at)}</span>
                    </div>
                    <a
                      href={r.target_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 flex items-center gap-1 text-sm text-indigo-600 hover:underline break-all"
                    >
                      <span className="truncate">{r.target_url}</span>
                      <ExternalLink className="size-3 shrink-0" />
                    </a>
                    {r.notes && <p className="mt-1 text-xs text-muted-foreground">{r.notes}</p>}
                    {r.duplicate_reason && (
                      <p className="mt-1 text-xs text-amber-600">{r.duplicate_reason}</p>
                    )}
                  </div>

                  {r.status === "PENDING" && r.id && (
                    <div className="flex shrink-0 flex-col gap-2">
                      <Button size="sm" className="gap-1" onClick={() => approve(r.id!)} disabled={actionLoading === r.id}>
                        <Check className="size-3" /> Approve
                      </Button>
                      {rejectReasons[r.id!] !== undefined ? (
                        <div className="flex flex-col gap-1">
                          <Textarea
                            placeholder="Rejection reason..."
                            value={rejectReasons[r.id!]}
                            onChange={(e) => setRejectReasons((prev) => ({ ...prev, [r.id!]: e.target.value }))}
                            className="h-16 text-xs"
                          />
                          <div className="flex gap-1">
                            <Button size="sm" variant="destructive" onClick={() => reject(r.id!)} disabled={actionLoading === r.id}>
                              <X className="size-3" /> Confirm
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setRejectReasons((prev) => { const n = { ...prev }; delete n[r.id!]; return n })}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => setRejectReasons((prev) => ({ ...prev, [r.id!]: "" }))}>
                          <X className="size-3" /> Reject
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
