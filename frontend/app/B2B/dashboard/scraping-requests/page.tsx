"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, Clock, Plus, Search, XCircle } from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type ScrapingRequest = { id?: number; owner_type?: string; target_type?: string; target_url?: string; status?: string; notes?: string; is_duplicate?: boolean; duplicate_reason?: string; created_at?: string }

export default function ScrapingRequestsPage() {
  const { mode } = useB2B()
  const [requests, setRequests] = useState<ScrapingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ targetUrl: "", targetType: "PRODUCT", notes: "" })

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=scraping-requests`)
      if (res.ok) { const data = await res.json(); setRequests(data.items ?? []) }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const submitRequest = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=scraping-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        setShowForm(false)
        setForm({ targetUrl: "", targetType: "PRODUCT", notes: "" })
        fetchRequests()
        if (data.is_duplicate) setError(`Duplicate detected: ${data.duplicate_reason}`)
      } else {
        setError(data.error ?? "Failed to submit")
      }
    } catch { setError("Network error") }
    setSubmitting(false)
  }

  const statusIcon = (s?: string) => {
    switch (s?.toUpperCase()) {
      case "APPROVED": case "DONE": return <CheckCircle2 className="size-4 text-emerald-600" />
      case "REJECTED": return <XCircle className="size-4 text-red-600" />
      case "PENDING": return <Clock className="size-4 text-amber-600" />
      default: return <AlertCircle className="size-4 text-slate-500" />
    }
  }

  const statusColor = (s?: string): string => {
    switch (s?.toUpperCase()) {
      case "APPROVED": case "DONE": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
      case "REJECTED": return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
      case "PENDING": return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
      default: return "bg-slate-100 text-slate-700"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scraping Requests</h1>
          <p className="text-sm text-muted-foreground">Request new product or category URLs to be tracked by the platform.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5">
          <Plus className="size-3.5" />
          New Request
        </Button>
      </div>

      {error && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-2 p-3 text-sm text-amber-800 dark:text-amber-400">
            <AlertCircle className="size-4" />
            {error}
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card className="border-border/50 border-l-4 border-l-emerald-500">
          <CardHeader>
            <CardTitle className="text-lg">Submit Scraping Request</CardTitle>
            <CardDescription>The URL will be checked for duplicates. If already tracked, it will be auto-rejected.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 text-sm">Target URL</Label>
                <Input value={form.targetUrl} onChange={(e) => setForm((p) => ({ ...p, targetUrl: e.target.value }))} placeholder="https://example.com/product/..." className="h-10" />
              </div>
              <div>
                <Label className="mb-1.5 text-sm">Type</Label>
                <select value={form.targetType} onChange={(e) => setForm((p) => ({ ...p, targetType: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="PRODUCT">Product URL</option>
                  <option value="CATEGORY">Category URL</option>
                </select>
              </div>
            </div>
            <div>
              <Label className="mb-1.5 text-sm">Notes (optional)</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Additional context..." />
            </div>
            <div className="flex gap-2">
              <Button onClick={submitRequest} disabled={submitting || !form.targetUrl.trim()} size="sm">{submitting ? "Submitting..." : "Submit"}</Button>
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Card key={i} className="border-border/50"><CardContent className="p-4"><div className="h-16 animate-pulse rounded bg-muted" /></CardContent></Card>)
        ) : requests.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center gap-3 py-16">
              <Search className="size-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No scraping requests yet</p>
            </CardContent>
          </Card>
        ) : (
          requests.map((r) => (
            <Card key={r.id} className="border-border/50 shadow-sm transition-all hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {statusIcon(r.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] ${statusColor(r.status)}`}>{r.status ?? "-"}</Badge>
                      <Badge variant="outline" className="text-[10px]">{r.target_type ?? "PRODUCT"}</Badge>
                      {r.is_duplicate && <Badge variant="destructive" className="text-[10px]">Duplicate</Badge>}
                    </div>
                    <p className="mt-2 text-sm font-medium break-all">{r.target_url ?? "-"}</p>
                    {r.duplicate_reason && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{r.duplicate_reason}</p>}
                    {r.notes && <p className="mt-1 text-xs text-muted-foreground">{r.notes}</p>}
                    <p className="mt-2 text-[10px] text-muted-foreground/70">{r.created_at ? new Date(r.created_at).toLocaleString() : ""}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
