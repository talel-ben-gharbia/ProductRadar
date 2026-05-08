"use client"

import { useState } from "react"
import { Megaphone, Plus } from "lucide-react"

import { useDemo } from "../layout-client"
import { DEMO_ADS_REQUESTS } from "@/lib/demo-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function DemoAdsRequestsPage() {
  const [requests, setRequests] = useState<any[]>(DEMO_ADS_REQUESTS)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ requestType: "BANNER", targetType: "PRODUCT", durationDays: "", budgetProposal: "", notes: "", productId: "", categoryId: "", brandFilter: "", targetUrl: "" })

  const submitRequest = () => {
    setRequests((prev) => [
      { id: Date.now(), owner_type: "company", request_type: form.requestType, target_type: form.targetType, target_url: form.targetUrl, status: "PENDING", duration_days: Number(form.durationDays) || 30, budget_proposal: Number(form.budgetProposal) || 0, notes: form.notes, created_at: new Date().toISOString() },
      ...prev,
    ])
    setShowForm(false)
    setForm({ requestType: "BANNER", targetType: "PRODUCT", durationDays: "", budgetProposal: "", notes: "", productId: "", categoryId: "", brandFilter: "", targetUrl: "" })
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
          <Plus className="size-3.5" /> New Request
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
                <Label className="text-sm font-semibold">Ad Type</Label>
                <select value={form.requestType} onChange={(e) => setForm((p) => ({ ...p, requestType: e.target.value }))} className="h-10 w-full rounded-xl border bg-background/50 px-3 text-sm focus:ring-2 focus:ring-violet-500/50">
                  <option value="BANNER">Banner Ad</option>
                  <option value="SPONSORED_PRODUCT">Sponsored Product</option>
                  <option value="BACKLINK_ARTICLE">Backlink Article</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Target Mode</Label>
                <select value={form.targetType} onChange={(e) => setForm((p) => ({ ...p, targetType: e.target.value }))} className="h-10 w-full rounded-xl border bg-background/50 px-3 text-sm focus:ring-2 focus:ring-violet-500/50">
                  <option value="PRODUCT">Single Product</option>
                  <option value="BRAND_GROUP">Brand / Category Group</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Duration (days)</Label>
                <Input type="number" value={form.durationDays} onChange={(e) => setForm((p) => ({ ...p, durationDays: e.target.value }))} placeholder="30" className="h-10 rounded-xl bg-background/50" />
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Budget Proposal (DT)</Label>
                <Input type="number" value={form.budgetProposal} onChange={(e) => setForm((p) => ({ ...p, budgetProposal: e.target.value }))} placeholder="500" className="h-10 rounded-xl bg-background/50" />
              </div>
              {form.targetType === "PRODUCT" ? (
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Target Product ID</Label>
                  <Input value={form.productId} onChange={(e) => setForm((p) => ({ ...p, productId: e.target.value }))} placeholder="Enter product ID" className="h-10 rounded-xl bg-background/50" />
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Target Category ID</Label>
                    <Input value={form.categoryId} onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))} placeholder="Enter category ID" className="h-10 rounded-xl bg-background/50" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Brand Filter</Label>
                    <Input value={form.brandFilter} onChange={(e) => setForm((p) => ({ ...p, brandFilter: e.target.value }))} placeholder="e.g. Samsung, Apple" className="h-10 rounded-xl bg-background/50" />
                  </div>
                </>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Landing Page URL</Label>
              <Input value={form.targetUrl} onChange={(e) => setForm((p) => ({ ...p, targetUrl: e.target.value }))} placeholder="/B2C/products/123" className="h-10 rounded-xl bg-background/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Notes & Campaign Goals</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Describe your target audience and objectives..." className="rounded-xl bg-background/50 min-h-[100px]" />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={submitRequest} size="sm" className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-6 shadow-md shadow-violet-500/20">Submit Proposal</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="rounded-lg">Cancel</Button>
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
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Budget</th>
                  <th className="px-4 py-3 font-semibold text-right">Duration</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {requests.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-20 text-center">
                    <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-950/40 mb-4 ring-1 ring-violet-500/20">
                      <Megaphone className="size-8 text-violet-500/50" />
                    </div>
                    <p className="text-base font-semibold">No ads requests yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Boost your visibility by launching your first campaign.</p>
                  </td></tr>
                ) : (
                  requests.map((r: any) => (
                    <tr key={r.id} className="transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{(r.request_type ?? "-").replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{(r.target_type ?? "-").replace(/_/g, " ")}</td>
                      <td className="px-4 py-3"><Badge className={`text-[10px] ${statusColor(r.status)}`}>{r.status ?? "-"}</Badge></td>
                      <td className="px-4 py-3 text-right font-mono">{r.budget_proposal != null ? `${r.budget_proposal} DT` : "-"}</td>
                      <td className="px-4 py-3 text-right">{r.duration_days != null ? `${r.duration_days} days` : "-"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"}</td>
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
