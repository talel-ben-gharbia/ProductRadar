"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, Check, Search, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import B2BErrorState from "@/components/B2B/b2b-error-state"

type ScrapingRequest = { id?: number; owner_type?: string; company_id?: number; market_id?: number; company_name?: string; market_name?: string; target_type?: string; target_url?: string; status?: string; notes?: string; is_duplicate?: boolean; duplicate_reason?: string; created_at?: string }

export default function ScrapingRequestsAdminPage() {
  const [requests, setRequests] = useState<ScrapingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/b2b-workflows/scraping-requests`)
      if (res.ok) { const data = await res.json(); setRequests(data.items ?? []) }
    } catch { setError("Failed to load scraping requests") }
    setLoading(false)
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const updateStatus = async (id: number, status: string) => {
    try {
      await fetch(`/api/admin/b2b-workflows/scraping-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      fetchRequests()
    } catch { setError("Failed to update scraping request status") }
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
    <section className="w-full max-w-none space-y-6">
      <div>
        <h1 className="text-2xl font-bold">B2B Scraping Requests</h1>
        <p className="text-sm text-muted-foreground">Review scraping requests from B2B partners. Approve to add URLs to the scraping pipeline.</p>
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
                    <th className="px-4 py-3 font-medium">Owner</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Target URL</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Duplicate</th>
                    <th className="px-4 py-3 font-medium">Notes</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => <tr key={i}>{Array.from({ length: 9 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-muted" /></td>)}</tr>)
                  ) : requests.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-16 text-center">
                      <Search className="mx-auto mb-3 size-10 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">No scraping requests</p>
                    </td></tr>
                  ) : (
                    requests.map((r) => (
                      <tr key={r.id} className="transition-colors hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono text-xs">#{r.id}</td>
                         <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{r.company_name ?? r.market_name ?? "-"}</span>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.owner_type?.replace("B2B_", "")}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{r.target_type ?? "-"}</Badge></td>
                        <td className="max-w-[250px] truncate px-4 py-3 text-xs font-medium">{r.target_url ?? "-"}</td>
                        <td className="px-4 py-3 text-center"><Badge className={`text-[10px] ${statusColor(r.status)}`}>{r.status ?? "-"}</Badge></td>
                        <td className="px-4 py-3 text-center">
                          {r.is_duplicate ? (
                            <span className="inline-flex items-center gap-1 text-xs text-red-600"><AlertCircle className="size-3" />Yes</span>
                          ) : <span className="text-xs text-muted-foreground">No</span>}
                        </td>
                        <td className="max-w-[150px] truncate px-4 py-3 text-xs text-muted-foreground">{r.notes ?? r.duplicate_reason ?? "-"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"}</td>
                        <td className="px-4 py-3 text-right">
                          {r.status?.toUpperCase() === "PENDING" && r.id && (
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => updateStatus(r.id!, "APPROVED")} className="gap-1 text-xs text-emerald-600"><Check className="size-3" />Approve</Button>
                              <Button variant="ghost" size="sm" onClick={() => updateStatus(r.id!, "REJECTED")} className="gap-1 text-xs text-red-600"><X className="size-3" />Reject</Button>
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
