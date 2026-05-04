"use client"

import { useCallback, useEffect, useState } from "react"
import { Megaphone, Plus } from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type AdsRequest = { id?: number; owner_type?: string; request_type?: string; status?: string; duration_days?: number; budget_proposal?: number; notes?: string; created_at?: string; product_id?: number; category_id?: number }

export default function AdsRequestsPage() {
  const { mode } = useB2B()
  const [requests, setRequests] = useState<AdsRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ requestType: "BANNER", durationDays: "", budgetProposal: "", notes: "", productId: "", categoryId: "" })

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=ads-requests`)
      if (res.ok) { const data = await res.json(); setRequests(data.items ?? []) }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const submitRequest = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=ads-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setShowForm(false)
        setForm({ requestType: "BANNER", durationDays: "", budgetProposal: "", notes: "", productId: "", categoryId: "" })
        fetchRequests()
      }
    } catch { /* ignore */ }
    setSubmitting(false)
  }

  const statusColor = (s?: string): string => {
    switch (s?.toUpperCase()) {
      case "APPROVED": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
      case "REJECTED": return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
      case "PENDING": return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
      default: return "bg-slate-100 text-slate-700"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ads Requests</h1>
          <p className="text-sm text-muted-foreground">Request advertising campaigns: banners, sponsored products, or backlink articles.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5">
          <Plus className="size-3.5" />
          New Request
        </Button>
      </div>

      {showForm && (
        <Card className="border-border/50 border-l-4 border-l-violet-500 shadow-xl shadow-violet-500/5 relative overflow-hidden group/form animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 opacity-50 pointer-events-none" />
          <CardHeader className="relative z-10 pb-4">
            <CardTitle className="text-lg flex items-center gap-2"><Megaphone className="size-4 text-violet-500" /> Submit Ads Request</CardTitle>
            <CardDescription>Our admin team will review your proposal and activate the campaign upon agreement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 relative z-10">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ad Type</Label>
                <select value={form.requestType} onChange={(e) => setForm((p) => ({ ...p, requestType: e.target.value }))} className="h-10 w-full rounded-xl border bg-background/50 px-3 text-sm focus:ring-2 focus:ring-violet-500/50 transition-shadow">
                  <option value="BANNER">Banner Ad</option>
                  <option value="SPONSORED_PRODUCT">Sponsored Product</option>
                  <option value="BACKLINK_ARTICLE">Backlink Article</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Duration (days)</Label>
                <Input type="number" value={form.durationDays} onChange={(e) => setForm((p) => ({ ...p, durationDays: e.target.value }))} placeholder="30" className="h-10 rounded-xl bg-background/50 focus-visible:ring-violet-500/50" />
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Budget Proposal (DT)</Label>
                <Input type="number" value={form.budgetProposal} onChange={(e) => setForm((p) => ({ ...p, budgetProposal: e.target.value }))} placeholder="500" className="h-10 rounded-xl bg-background/50 focus-visible:ring-violet-500/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Target Product ID (optional)</Label>
                <Input type="number" value={form.productId} onChange={(e) => setForm((p) => ({ ...p, productId: e.target.value }))} placeholder="Product ID" className="h-10 rounded-xl bg-background/50 focus-visible:ring-violet-500/50" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Notes & Campaign Goals</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Describe your target audience and objectives..." className="rounded-xl bg-background/50 min-h-[100px] focus-visible:ring-violet-500/50" />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={submitRequest} disabled={submitting} size="sm" className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-6 shadow-md shadow-violet-500/20">{submitting ? "Submitting..." : "Submit Proposal"}</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50 shadow-sm relative z-10 bg-background/50 backdrop-blur-xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Budget</th>
                  <th className="px-4 py-3 font-semibold text-right">Duration</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-4"><div className="h-4 w-full animate-pulse rounded bg-muted/50" /></td>)}</tr>
                  ))
                ) : requests.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-20 text-center">
                    <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-950/40 mb-4 ring-1 ring-violet-500/20">
                      <Megaphone className="size-8 text-violet-500/50" />
                    </div>
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-100">No ads requests yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Boost your visibility by launching your first campaign.</p>
                  </td></tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{(r.request_type ?? "-").replace(/_/g, " ")}</td>
                      <td className="px-4 py-3"><Badge className={`text-[10px] ${statusColor(r.status)}`}>{r.status ?? "-"}</Badge></td>
                      <td className="px-4 py-3 text-right font-mono">{r.budget_proposal != null ? `${r.budget_proposal} DT` : "-"}</td>
                      <td className="px-4 py-3 text-right">{r.duration_days != null ? `${r.duration_days} days` : "-"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"}</td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-xs text-muted-foreground">{r.notes ?? "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
