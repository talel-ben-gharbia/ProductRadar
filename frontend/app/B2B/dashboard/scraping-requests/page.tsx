"use client"

import { useCallback, useEffect, useState } from "react"
import { ExternalLink, Globe, Loader2, Plus, Search, X, XCircle } from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import B2BPlanGate from "@/components/B2B/b2b-plan-gate"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import type { B2BScrapingRequest as ScrapingRequest } from "@/types/b2b"

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  DUPLICATE: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
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

export default function ScrapingRequestsPage() {
  const { isGold, loading: summaryLoading } = useB2B()
  const [requests, setRequests] = useState<ScrapingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [targetUrl, setTargetUrl] = useState("")
  const [targetType, setTargetType] = useState("PRODUCT")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/b2b/workspace?endpoint=scraping-requests")
      if (res.ok) {
        const data = await res.json()
        setRequests(data.items ?? [])
      } else {
        setError("Failed to load scraping requests")
      }
    } catch {
      setError("Failed to load scraping requests")
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const handleSubmit = async () => {
    if (!targetUrl.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/b2b/workspace?endpoint=scraping-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_url: targetUrl.trim(),
          target_type: targetType,
          notes: notes.trim(),
        }),
      })
      if (res.ok) {
        setTargetUrl("")
        setTargetType("PRODUCT")
        setNotes("")
        setShowForm(false)
        fetchRequests()
      } else {
        const data = await res.json()
        setError(data.error ?? "Failed to submit request")
      }
    } catch {
      setError("Failed to submit scraping request")
    }
    setSubmitting(false)
  }

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=scraping-requests/${id}`, { method: "DELETE" })
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== id))
      }
    } catch {
      setError("Failed to delete request")
    }
  }

  const loading_ = loading || summaryLoading

  if (loading_ && !summaryLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted/30" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      </div>
    )
  }

  if (!isGold) {
    return <B2BPlanGate featureName="Scraping Requests" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scraping Requests</h1>
          <p className="text-sm text-muted-foreground">Request new product URLs to be scraped and added to the catalog.</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button className="gap-1.5">
              <Plus className="size-4" /> New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New Scraping Request</DialogTitle>
              <DialogDescription>Submit a URL for our system to scrape and add to your product catalog.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targetUrl">Target URL *</Label>
                <Input
                  id="targetUrl"
                  placeholder="https://example.com/product/..."
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetType">Type</Label>
                <select
                  id="targetType"
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="PRODUCT">Product</option>
                  <option value="CATEGORY">Category</option>
                  <option value="SELLER">Seller</option>
                  <option value="REVIEW">Review</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional context..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={submitting || !targetUrl.trim()}>
                  {submitting && <Loader2 className="mr-1 size-3 animate-spin" />}
                  Submit
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Card className="border-red-200/50 bg-red-50/30 dark:border-red-900/30 dark:bg-red-950/10">
          <CardContent className="flex items-center justify-between p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}><X className="size-4" /></Button>
          </CardContent>
        </Card>
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
            <p className="text-xs text-muted-foreground">Submit a URL to request product data to be scraped.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id} className="border-border/50 shadow-sm transition-all hover:shadow-md">
              <CardContent className="flex items-start gap-4 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40">
                  <Globe className="size-4 text-indigo-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{r.target_type ?? "PRODUCT"}</span>
                    <Badge className={`text-[10px] ${STATUS_COLORS[r.status ?? ""] ?? "bg-slate-100"}`}>{r.status}</Badge>
                    {r.is_duplicate && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200">Duplicate</Badge>}
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
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{r.duplicate_reason}</p>
                  )}
                </div>
                {(r.status === "PENDING" || r.status === "DUPLICATE") && r.id && (
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id!)} className="shrink-0">
                    <XCircle className="size-4 text-muted-foreground hover:text-red-500" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
