"use client"

import { useCallback, useEffect, useState } from "react"
import { Building2, Check, Clock, RefreshCw, Shield, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import B2BErrorState from "@/components/B2B/b2b-error-state"

type RenewalRequest = {
  id?: number
  owner_type?: string
  plan_type?: string
  duration_months?: number
  start_date?: string
  end_date?: string
  created_at?: string
  company_id?: number
  market_id?: number
  name?: string
  market_name?: string
}

export default function B2BRenewalsAdminPage() {
  const [requests, setRequests] = useState<RenewalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/b2b-workflows/subscriptions/pending-renewals`)
      if (res.ok) { const data = await res.json(); setRequests(data.items ?? []) }
    } catch { setError("Failed to load renewal requests") }
    setLoading(false)
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const approveRenewal = async (id: number) => {
    setActionLoading(id)
    try {
      await fetch(`/api/admin/b2b-workflows/subscriptions/${id}/approve-renewal`, { method: "POST" })
      fetchRequests()
    } catch { setError("Failed to approve renewal") }
    setActionLoading(null)
  }

  const rejectRenewal = async (id: number) => {
    setActionLoading(id)
    try {
      await fetch(`/api/admin/b2b-workflows/subscriptions/${id}/reject-renewal`, { method: "POST" })
      fetchRequests()
    } catch { setError("Failed to reject renewal") }
    setActionLoading(null)
  }

  return (
    <section className="w-full max-w-none space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Renewal Requests</h1>
          <p className="text-sm text-muted-foreground">Review and approve subscription renewal requests from B2B partners.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRequests} className="gap-1.5 text-xs">
          <RefreshCw className="size-3.5" /> Refresh
        </Button>
      </div>

      {error ? (
        <B2BErrorState message={error} onRetry={() => { setError(null); fetchRequests() }} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium text-center">Duration</th>
                    <th className="px-4 py-3 font-medium">Requested</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-4"><div className="h-4 w-full animate-pulse rounded bg-muted/50" /></td>)}</tr>)
                  ) : requests.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-20 text-center">
                      <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 mb-4 ring-1 ring-emerald-500/20">
                        <Check className="size-8 text-emerald-500/50" />
                      </div>
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-100">No pending renewal requests</p>
                      <p className="text-sm text-muted-foreground mt-1">All renewals have been processed.</p>
                    </td></tr>
                  ) : (
                    requests.map((r) => (
                      <tr key={r.id} className="transition-all hover:bg-muted/30 group">
                        <td className="px-4 py-3 font-mono text-xs font-medium text-slate-500">#{r.id}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px] font-bold tracking-wider bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                            {r.owner_type ?? "-"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <Building2 className="size-3.5 text-muted-foreground" />
                          {r.name ?? r.market_name ?? `#${r.company_id ?? r.market_id ?? "-"}`}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`text-xs font-semibold ${r.plan_type?.includes("GOLD") ? "bg-gradient-to-r from-amber-200 to-yellow-400 text-amber-900 border-none shadow-sm shadow-amber-500/20" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                            {r.plan_type?.replace("B2B_", "") ?? "-"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center font-medium">{r.duration_months ?? "-"} mo</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Clock className="size-3" />
                            {r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => r.id && approveRenewal(r.id)}
                              disabled={actionLoading === r.id}
                              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20"
                            >
                              {actionLoading === r.id ? <RefreshCw className="size-3 animate-spin" /> : <Check className="size-3" />}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => r.id && rejectRenewal(r.id)}
                              disabled={actionLoading === r.id}
                              className="gap-1.5 text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/30"
                            >
                              <X className="size-3" />
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
