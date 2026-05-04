"use client"

import { useCallback, useEffect, useState } from "react"
import { Building2, Check, Clock, CreditCard, Plus, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000"

type Sub = { id?: number; owner_type?: string; plan_type?: string; duration_months?: number; start_date?: string; end_date?: string; active?: boolean; company_id?: number; market_id?: number; company_name?: string; market_name?: string; created_at?: string }

export default function B2BSubscriptionsAdminPage() {
  const [subs, setSubs] = useState<Sub[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ ownerType: "COMPANY", companyId: "", marketId: "", planType: "SILVER", durationMonths: "12" })

  const fetchSubs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/b2b-workflows/subscriptions`)
      if (res.ok) { const data = await res.json(); setSubs(data.items ?? []) }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchSubs() }, [fetchSubs])

  const createSubscription = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/b2b-workflows/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) { setShowForm(false); fetchSubs() }
    } catch { /* ignore */ }
    setSubmitting(false)
  }

  const toggleActive = async (id: number, active: boolean) => {
    try {
      await fetch(`/api/admin/b2b-workflows/subscriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      })
      fetchSubs()
    } catch { /* ignore */ }
  }

  const statusColor = (active?: boolean) => active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"

  return (
    <section className="w-full max-w-none space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">B2B Subscriptions</h1>
          <p className="text-sm text-muted-foreground">Manage B2B contracts — create, renew, or deactivate subscriptions.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5">
          <Plus className="size-3.5" />
          Create Subscription
        </Button>
      </div>

      {showForm && (
        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader>
            <CardTitle className="text-lg">Create B2B Subscription</CardTitle>
            <CardDescription>Assign a subscription plan to a B2B company or market account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 text-sm">Owner Type</Label>
                <select value={form.ownerType} onChange={(e) => setForm((p) => ({ ...p, ownerType: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="COMPANY">Company</option>
                  <option value="MARKET">Market</option>
                </select>
              </div>
              <div>
                <Label className="mb-1.5 text-sm">{form.ownerType === "COMPANY" ? "Company ID" : "Market ID"}</Label>
                <Input type="number" value={form.ownerType === "COMPANY" ? form.companyId : form.marketId} onChange={(e) => setForm((p) => form.ownerType === "COMPANY" ? { ...p, companyId: e.target.value } : { ...p, marketId: e.target.value })} className="h-10" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 text-sm">Plan Type</Label>
                <select value={form.planType} onChange={(e) => setForm((p) => ({ ...p, planType: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="SILVER">Silver</option>
                  <option value="GOLD">Gold</option>
                </select>
              </div>
              <div>
                <Label className="mb-1.5 text-sm">Duration (months)</Label>
                <select value={form.durationMonths} onChange={(e) => setForm((p) => ({ ...p, durationMonths: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="3">3 months</option>
                  <option value="6">6 months</option>
                  <option value="12">12 months</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={createSubscription} disabled={submitting} size="sm">{submitting ? "Creating..." : "Create"}</Button>
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium text-center">Duration</th>
                  <th className="px-4 py-3 font-medium">Dates</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => <tr key={i}>{Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-4 py-4"><div className="h-4 w-full animate-pulse rounded bg-muted/50" /></td>)}</tr>)
                ) : subs.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-20 text-center">
                    <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 mb-4 ring-1 ring-indigo-500/20">
                      <CreditCard className="size-8 text-indigo-500/50" />
                    </div>
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-100">No B2B subscriptions yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Create a new subscription contract to onboard a B2B partner.</p>
                  </td></tr>
                ) : (
                  subs.map((s) => (
                    <tr key={s.id} className="transition-all hover:bg-muted/30 group">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-slate-500">#{s.id}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px] font-bold tracking-wider bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                          {s.owner_type ?? "-"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{s.company_name ?? s.market_name ?? `#${s.company_id ?? s.market_id ?? "-"}`}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs font-semibold ${s.plan_type?.includes("GOLD") ? "bg-gradient-to-r from-amber-200 to-yellow-400 text-amber-900 border-none shadow-sm shadow-amber-500/20" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                          {s.plan_type?.replace("B2B_", "") ?? "-"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center font-medium">{s.duration_months ?? "-"} mo</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground/80">
                        <div className="flex flex-col gap-0.5">
                          <span>Start: <span className="text-foreground font-medium">{s.start_date ? new Date(s.start_date).toLocaleDateString() : "-"}</span></span>
                          <span>End: <span className="text-foreground font-medium">{s.end_date ? new Date(s.end_date).toLocaleDateString() : "-"}</span></span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center"><Badge className={`text-[10px] uppercase tracking-wider ${statusColor(s.active)}`}>{s.active ? "Active" : "Inactive"}</Badge></td>
                      <td className="px-4 py-3 text-right">
                        <Button variant={s.active ? "outline" : "default"} size="sm" onClick={() => s.id && toggleActive(s.id, !!s.active)} className={`gap-1.5 text-xs transition-opacity ${s.active ? "hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/30" : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20"}`}>
                          {s.active ? <><X className="size-3" />Suspend</> : <><Check className="size-3" />Activate</>}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
