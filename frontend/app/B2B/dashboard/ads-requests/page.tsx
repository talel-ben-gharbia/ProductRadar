"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Megaphone, Plus, Search, Package, Tags, AlertTriangle } from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import { QuotaBar, getMonthlyLimit, getCurrentUsage } from "@/components/B2B/b2b-quota-bar"
import B2BErrorState from "@/components/B2B/b2b-error-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import type { B2BAdsRequest as AdsRequest, B2BSearchResult as SearchResult } from "@/types/b2b"

function ProductSearch({ onSelect }: { onSelect: (id: number, name: string, brand: string) => void }) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.length < 2) { setResults([]); setError(null); return }
    const timer = setTimeout(async () => {
      setError(null)
      try {
        const res = await fetch(`/api/b2b/workspace?endpoint=watchlist%2Fsearch&q=${encodeURIComponent(query)}`)
        if (res.ok) { const data = await res.json(); setResults(data.items ?? []); setOpen(true) } else { setError("Search failed") }
      } catch { setError("Search failed") }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", handleClick); return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search product by name or brand..." className="h-10 rounded-xl bg-background/50 pl-9 focus-visible:ring-violet-500/50" />
      </div>
      {error && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30 p-3 text-center text-xs text-red-600 dark:text-red-400 shadow-lg">
          <AlertTriangle className="mx-auto mb-1 size-4" />
          {error}
        </div>
      )}
      {open && results.length > 0 && !error && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border bg-background shadow-lg">
          {results.map((r) => (
            <button key={r.id} type="button" onClick={() => { onSelect(r.id, r.name, r.brand); setOpen(false); setQuery("") }} className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors">
              <Package className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{r.name}</div>
                <div className="truncate text-xs text-muted-foreground">#{r.id} &middot; {r.brand || "No brand"}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      {open && query.length >= 2 && results.length === 0 && !error && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-background p-3 text-center text-sm text-muted-foreground shadow-lg">No products found</div>
      )}
    </div>
  )
}

function CategorySelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch("/api/categories")
      if (r.ok) {
        const data = await r.json()
        setCategories(Array.isArray(data) ? data : data.items ?? [])
      } else {
        setError("Failed to load categories")
      }
    } catch { setError("Failed to load categories") }
    setLoading(false)
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30 p-3 text-center">
        <p className="text-xs text-red-600 dark:text-red-400 mb-2">{error}</p>
        <Button variant="outline" size="sm" onClick={() => { setError(null); fetchCategories() }} className="text-xs gap-1">
          <AlertTriangle className="size-3" /> Retry
        </Button>
      </div>
    )
  }

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-xl border bg-background/50 px-3 text-sm focus:ring-2 focus:ring-violet-500/50 transition-shadow">
      <option value="">{loading ? "Loading..." : "Select a category"}</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>{c.name} (#{c.id})</option>
      ))}
    </select>
  )
}

export default function AdsRequestsPage() {
  const { planType, summary } = useB2B()
  const [requests, setRequests] = useState<AdsRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ requestType: "BANNER", targetType: "PRODUCT", durationDays: "", budgetProposal: "", notes: "", productId: "", categoryId: "", brandFilter: "", targetUrl: "" })
  const [selectedProductLabel, setSelectedProductLabel] = useState("")

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=ads-requests`)
      if (res.ok) { const data = await res.json(); setRequests(data.items ?? []) } else { setError("Failed to load ads requests") }
    } catch { setError("Failed to load ads requests") }
    setLoading(false)
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const submitRequest = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=ads-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setShowForm(false)
        setForm({ requestType: "BANNER", targetType: "PRODUCT", durationDays: "", budgetProposal: "", notes: "", productId: "", categoryId: "", brandFilter: "", targetUrl: "" })
        setSelectedProductLabel("")
        fetchRequests()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Failed to submit ads request")
      }
    } catch { setError("Failed to submit ads request") }
    setSubmitting(false)
  }

  const usageJson = summary?.user?.usage_json as Record<string, unknown> | null | undefined
  const adsUsage = getCurrentUsage(usageJson, "ads_requests")
  const adsLimit = getMonthlyLimit(planType, "ads")

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

      <QuotaBar usage={adsUsage} limit={adsLimit} label="Monthly Ads Request Quota" />

      {error && <B2BErrorState message={error} onRetry={() => { setError(null); fetchRequests() }} />}

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
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Target Mode</Label>
                <select value={form.targetType} onChange={(e) => setForm((p) => ({ ...p, targetType: e.target.value }))} className="h-10 w-full rounded-xl border bg-background/50 px-3 text-sm focus:ring-2 focus:ring-violet-500/50 transition-shadow">
                  <option value="PRODUCT">Single Product</option>
                  <option value="BRAND_GROUP">Brand / Category Group</option>
                  <option value="CATEGORY">Category</option>
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
              {form.targetType === "PRODUCT" ? (
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Target Product</Label>
                  <ProductSearch onSelect={(id, name, brand) => { setForm((p) => ({ ...p, productId: String(id) })); setSelectedProductLabel(`${name} (${brand || "No brand"})`) }} />
                  {form.productId && <p className="text-xs text-emerald-600 font-medium">Selected: {selectedProductLabel} (#{form.productId})</p>}
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Target Category</Label>
                    <CategorySelect value={form.categoryId} onChange={(id) => setForm((p) => ({ ...p, categoryId: id }))} />
                  </div>
                  {form.targetType === "BRAND_GROUP" && (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Brand Filter</Label>
                      <Input value={form.brandFilter} onChange={(e) => setForm((p) => ({ ...p, brandFilter: e.target.value }))} placeholder="e.g. Samsung, Apple" className="h-10 rounded-xl bg-background/50 focus-visible:ring-violet-500/50" />
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Landing Page URL</Label>
              <Input value={form.targetUrl} onChange={(e) => setForm((p) => ({ ...p, targetUrl: e.target.value }))} placeholder={form.targetType === "PRODUCT" ? "/B2C/products/123" : "/B2C/products?categoryId=12"} className="h-10 rounded-xl bg-background/50 focus-visible:ring-violet-500/50" />
              <p className="text-xs text-muted-foreground">Leave blank to let the backend build the default landing page from the selected product or category.</p>
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
                  <th className="px-4 py-3 font-semibold">Target</th>
                  <th className="px-4 py-3 font-semibold">Landing URL</th>
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
                    <tr key={i}>{Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-4 py-4"><div className="h-4 w-full animate-pulse rounded bg-muted/50" /></td>)}</tr>
                  ))
                ) : requests.length === 0 && !error ? (
                  <tr><td colSpan={8} className="px-4 py-20 text-center">
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
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {(r.target_type ?? "-").replace(/_/g, " ")}
                        {r.brand_filter && <div className="text-violet-600 dark:text-violet-400 font-semibold mt-1">{r.brand_filter}</div>}
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-xs text-indigo-600 underline underline-offset-4">{r.target_url ?? "-"}</td>
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
