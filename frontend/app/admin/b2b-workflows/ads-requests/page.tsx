"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ArrowUpRight,
  Building2,
  Calendar,
  Check,
  Clock,
  ExternalLink,
  ImageIcon,
  Megaphone,
  Tag,
  User,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import B2BErrorState from "@/components/B2B/b2b-error-state"
import { BACKEND_URL } from "@/utils/admin/constants"

type AdsRequest = {
  id?: number
  owner_type?: string
  company_id?: number
  name?: string
  request_type?: string
  image_url?: string
  link_url?: string
  image_mime_type?: string
  status?: string
  created_at?: string
  updated_at?: string
}

type ApprovalDraft = {
  startsAt: string
  dimensions: string
  durationDays: string
}

const BANNER_DIMENSIONS = [
  { label: "728×90 (Leaderboard)", value: "728x90" },
  { label: "300×250 (Medium Rectangle)", value: "300x250" },
  { label: "336×280 (Large Rectangle)", value: "336x280" },
  { label: "320×100 (Large Mobile)", value: "320x100" },
  { label: "468×60 (Full Banner)", value: "468x60" },
  { label: "970×90 (Pushdown)", value: "970x90" },
  { label: "250×250 (Square)", value: "250x250" },
  { label: "200×200 (Small Square)", value: "200x200" },
  { label: "120×600 (Skyscraper)", value: "120x600" },
  { label: "160×600 (Wide Skyscraper)", value: "160x600" },
  { label: "300×600 (Half Page)", value: "300x600" },
  { label: "970×250 (Billboard)", value: "970x250" },
]

const DURATION_OPTIONS = [
  { label: "7 days", value: "7" },
  { label: "15 days", value: "15" },
  { label: "30 days (Recommended)", value: "30" },
]

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

export default function AdsRequestsAdminPage() {
  const [requests, setRequests] = useState<AdsRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [approvalDrafts, setApprovalDrafts] = useState<Record<number, ApprovalDraft>>({})
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

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

  const updateStatus = async (id: number, status: string) => {
    try {
      const endpoint = status.toUpperCase() === "APPROVED" ? "approve" : "reject"
      const draft = approvalDrafts[id]
      const dims = draft?.dimensions?.split("x") ?? []
      await fetch(`/api/admin/b2b-workflows/ads-requests/${id}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: status.toUpperCase() === "APPROVED"
          ? JSON.stringify({
              starts_at: draft?.startsAt || new Date().toISOString(),
              width: dims[0] ? Number(dims[0]) : null,
              height: dims[1] ? Number(dims[1]) : null,
              duration_days: draft?.durationDays ? Number(draft.durationDays) : null,
            })
          : JSON.stringify({}),
      })
      fetchRequests()
    } catch { setError("Failed to update ads request status") }
  }

  const updateDraft = (id: number, field: keyof ApprovalDraft, value: string) => {
    setApprovalDrafts((current) => ({
      ...current,
      [id]: { ...(current[id] ?? { startsAt: "", dimensions: "", durationDays: "" }), [field]: value },
    }))
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
        <h1 className="text-2xl font-bold">B2B Banner Ads Requests</h1>
        <p className="text-sm text-muted-foreground">Review banner ad submissions, verify images, set dimensions, and approve campaigns.</p>
      </div>

      {error ? (
        <B2BErrorState message={error} onRetry={() => { setError(null); fetchRequests() }} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40 text-left text-sm uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="w-24 px-4 py-3 font-medium">Image</th>
                    <th className="px-4 py-3 font-medium">Requester</th>
                    <th className="px-4 py-3 font-medium">Content</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j} className="px-4 py-4"><div className="h-4 w-16 animate-pulse rounded bg-muted" /></td>
                        ))}
                      </tr>
                    ))
                  ) : requests.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-16 text-center">
                      <Megaphone className="mx-auto mb-3 size-10 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">No banner ads requests</p>
                    </td></tr>
                  ) : (
                    requests.map((r) => (
                      <tr key={r.id} className="transition-colors hover:bg-muted/20">
                        {/* Image */}
                        <td className="px-4 py-3">
                          {r.image_url ? (
                            <button
                              type="button"
                              onClick={() => setLightboxUrl(`${BACKEND_URL}${r.image_url}`)}
                              className="group relative size-20 overflow-hidden rounded-lg border border-border/50 bg-muted/20 transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <img
                                src={`${BACKEND_URL}${r.image_url}`}
                                alt="Banner"
                                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              />
                              <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-xs font-medium text-white opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                                <ImageIcon className="size-5" />
                              </span>
                            </button>
                          ) : (
                            <div className="flex size-20 items-center justify-center rounded-lg border border-border/50 bg-muted/20">
                              <ImageIcon className="size-6 text-muted-foreground/40" />
                            </div>
                          )}
                        </td>

                        {/* Requester */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="size-4 shrink-0 text-muted-foreground/60" />
                            <span className="font-medium">
                              {r.name ?? <span className="text-muted-foreground italic">#{r.company_id}</span>}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="gap-1 border-blue-200/50 bg-blue-50/40 px-2 py-0.5 text-xs text-blue-700 dark:border-blue-800/30 dark:bg-blue-950/20 dark:text-blue-400">
                              <User className="size-3.5" />
                              {r.owner_type ?? "N/A"}
                            </Badge>
                            <Badge variant="outline" className="gap-1 border-purple-200/50 bg-purple-50/40 px-2 py-0.5 text-xs text-purple-700 dark:border-purple-800/30 dark:bg-purple-950/20 dark:text-purple-400">
                              <Tag className="size-3.5" />
                              {r.request_type ?? "N/A"}
                            </Badge>
                          </div>
                        </td>

                        {/* Content */}
                        <td className="max-w-[300px] px-4 py-3">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="size-3" />
                            <span>Submitted {timeAgo(r.created_at)}</span>
                          </div>
                          {r.link_url ? (
                            <a
                              href={r.link_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-sm text-indigo-600 underline underline-offset-2 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                              <span className="truncate">{r.link_url}</span>
                              <ArrowUpRight className="size-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="mt-1 block text-sm text-muted-foreground">-</span>
                          )}
                          {r.updated_at && r.updated_at !== r.created_at && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground/60">
                              <Clock className="size-3" />
                              <span>Updated {timeAgo(r.updated_at)}</span>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-1">
                            <Badge className={`text-xs ${statusColor(r.status)}`}>
                              {r.status ?? "-"}
                            </Badge>
                            {r.updated_at && r.updated_at !== r.created_at && (
                              <span className="text-xs text-muted-foreground/60">
                                {new Date(r.updated_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          {r.status?.toUpperCase() === "PENDING" && r.id && (
                            <div className="ml-auto flex min-w-[280px] flex-col gap-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Start</Label>
                                  <input
                                    type="datetime-local"
                                    value={approvalDrafts[r.id]?.startsAt ?? ""}
                                    onChange={(e) => updateDraft(r.id!, "startsAt", e.target.value)}
                                    className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Duration</Label>
                                  <select
                                    value={approvalDrafts[r.id]?.durationDays ?? ""}
                                    onChange={(e) => updateDraft(r.id!, "durationDays", e.target.value)}
                                    className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
                                  >
                                    <option value="">Select</option>
                                    {DURATION_OPTIONS.map((o) => (
                                      <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Dimensions</Label>
                                <select
                                  value={approvalDrafts[r.id]?.dimensions ?? ""}
                                  onChange={(e) => updateDraft(r.id!, "dimensions", e.target.value)}
                                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
                                >
                                  <option value="">Select</option>
                                  {BANNER_DIMENSIONS.map((d) => (
                                    <option key={d.value} value={d.value}>{d.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => updateStatus(r.id!, "APPROVED")} className="gap-1.5 text-sm text-emerald-600 hover:text-emerald-700">
                                  <Check className="size-4" />Approve
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => updateStatus(r.id!, "REJECTED")} className="gap-1.5 text-sm text-red-600 hover:text-red-700">
                                  <X className="size-4" />Reject
                                </Button>
                              </div>
                            </div>
                          )}
                          {r.status?.toUpperCase() !== "PENDING" && (
                            <div className="flex items-center justify-end gap-1 text-sm text-muted-foreground">
                              <span className="text-xs capitalize">{r.status?.toLowerCase()}</span>
                              <ExternalLink className="size-3.5 opacity-50" />
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

      {/* Image Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
          onKeyDown={(e) => e.key === "Escape" && setLightboxUrl(null)}
          tabIndex={0}
          role="dialog"
          aria-label="Banner image preview"
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="size-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="Banner preview"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  )
}
