"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, ExternalLink, Megaphone, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import B2BErrorState from "@/components/B2B/b2b-error-state"

type AdsRequest = { id?: number; owner_type?: string; company_id?: number; company_name?: string; request_type?: string; target_type?: string; target_url?: string; product_id?: number; category_id?: number; brand_filter?: string; duration_days?: number; budget_proposal?: number; notes?: string; status?: string; created_at?: string; product_name?: string; category_name?: string }

export default function AdsRequestsAdminPage() {
  const [requests, setRequests] = useState<AdsRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [approvalDrafts, setApprovalDrafts] = useState<Record<number, { startsAt: string; agreedPrice: string }>>({})

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/b2b-workflows/ads-requests`)
      if (res.ok) { const data = await res.json(); setRequests(data.items ?? []) }
    } catch { setError("Failed to load ads requests") }
    setLoading(false)
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const updateStatus = async (id: number, status: string, request?: AdsRequest) => {
    try {
      const endpoint = status.toUpperCase() === "APPROVED" ? "approve" : "reject"
      const draft = approvalDrafts[id]
      await fetch(`/api/admin/b2b-workflows/ads-requests/${id}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: status.toUpperCase() === "APPROVED"
          ? JSON.stringify({
              starts_at: draft?.startsAt || new Date().toISOString(),
              agreed_price: draft?.agreedPrice || request?.budget_proposal || null,
            })
          : JSON.stringify({}),
      })
      fetchRequests()
    } catch { setError("Failed to update ads request status") }
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
    <section className="w-full max-w-none space-y-6">
      <div>
        <h1 className="text-2xl font-bold">B2B Ads Requests</h1>
        <p className="text-sm text-muted-foreground">Review and manage advertising requests from B2B partners.</p>
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
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Target</th>
                    <th className="px-4 py-3 font-medium">Landing URL</th>
                    <th className="px-4 py-3 font-medium text-right">Budget</th>
                    <th className="px-4 py-3 font-medium text-right">Duration</th>
                    <th className="px-4 py-3 font-medium">Notes</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => <tr key={i}>{Array.from({ length: 11 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-muted" /></td>)}</tr>)
                  ) : requests.length === 0 ? (
                    <tr><td colSpan={11} className="px-4 py-16 text-center">
                      <Megaphone className="mx-auto mb-3 size-10 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">No ads requests</p>
                    </td></tr>
                  ) : (
                    requests.map((r) => (
                      <tr key={r.id} className="transition-colors hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono text-xs">#{r.id}</td>
                         <td className="px-4 py-3 font-medium">
                          {r.company_name ?? <span className="text-muted-foreground italic">#{r.company_id}</span>}
                        </td>
                        <td className="px-4 py-3">{(r.request_type ?? "-").replace(/_/g, " ")}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {(r.target_type ?? "-").replace(/_/g, " ")}
                          {r.product_id && <div className="text-xs mt-0.5">Product #{r.product_id}{r.product_name ? <span className="text-foreground"> &mdash; {r.product_name}</span> : ""}</div>}
                          {r.category_id && <div className="text-xs mt-0.5">Category #{r.category_id}{r.category_name ? <span className="text-foreground"> &mdash; {r.category_name}</span> : ""}</div>}
                          {r.brand_filter && <div className="text-violet-600 dark:text-violet-400 font-semibold mt-1">{r.brand_filter}</div>}
                        </td>
                        <td className="max-w-[220px] truncate px-4 py-3 text-xs text-indigo-600 underline underline-offset-4 flex items-center gap-1">
                          {r.target_url ?? "-"}
                          {r.target_url && r.target_url.startsWith("/") && <ExternalLink className="size-3 shrink-0 inline-block" />}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{r.budget_proposal != null ? `${r.budget_proposal} DT` : "-"}</td>
                        <td className="px-4 py-3 text-right">{r.duration_days != null ? `${r.duration_days}d` : "-"}</td>
                        <td className="max-w-[180px] truncate px-4 py-3 text-xs text-muted-foreground">{r.notes ?? "-"}</td>
                        <td className="px-4 py-3 text-center"><Badge className={`text-[10px] ${statusColor(r.status)}`}>{r.status ?? "-"}</Badge></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"}</td>
                        <td className="px-4 py-3 text-right">
                          {r.status?.toUpperCase() === "PENDING" && r.id && (
                            <div className="flex flex-col items-end gap-2">
                              <div className="grid gap-2 sm:grid-cols-2">
                                <input
                                  type="datetime-local"
                                  value={approvalDrafts[r.id!]?.startsAt ?? ""}
                                  onChange={(event) => setApprovalDrafts((current) => ({ ...current, [r.id!]: { startsAt: event.target.value, agreedPrice: current[r.id!]?.agreedPrice ?? String(r.budget_proposal ?? "") } }))}
                                  className="h-8 rounded-md border border-border bg-background px-2 text-[10px] text-foreground"
                                />
                                <input
                                  type="number"
                                  value={approvalDrafts[r.id!]?.agreedPrice ?? String(r.budget_proposal ?? "")}
                                  onChange={(event) => setApprovalDrafts((current) => ({ ...current, [r.id!]: { startsAt: current[r.id!]?.startsAt ?? "", agreedPrice: event.target.value } }))}
                                  placeholder="Agreed price"
                                  className="h-8 rounded-md border border-border bg-background px-2 text-[10px] text-foreground"
                                />
                              </div>
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => updateStatus(r.id!, "APPROVED", r)} className="gap-1 text-xs text-emerald-600 hover:text-emerald-700">
                                  <Check className="size-3" />Approve
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => updateStatus(r.id!, "REJECTED", r)} className="gap-1 text-xs text-red-600 hover:text-red-700">
                                  <X className="size-3" />Reject
                                </Button>
                              </div>
                            </div>
                          )}
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
