"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  ImageIcon,
  Link,
  Megaphone,
  Pencil,
  Plus,
  Tag,
  Trash2,
  Upload,
  User,
  X,
  XCircle,
} from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import { QuotaBar, getMonthlyLimit, getCurrentUsage } from "@/components/B2B/b2b-quota-bar"
import B2BErrorState from "@/components/B2B/b2b-error-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BACKEND_URL } from "@/utils/admin/constants"

import type { B2BAdsRequest as AdsRequest } from "@/types/b2b"

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

export default function AdsRequestsPage() {
  const { planType, summary } = useB2B()
  const [requests, setRequests] = useState<AdsRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [linkUrl, setLinkUrl] = useState("")
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [campaignFilter, setCampaignFilter] = useState("all")
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const [viewingRequest, setViewingRequest] = useState<AdsRequest | null>(null)

  const [editingRequest, setEditingRequest] = useState<AdsRequest | null>(null)
  const [editImageFile, setEditImageFile] = useState<File | null>(null)
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null)
  const [editLinkUrl, setEditLinkUrl] = useState("")
  const [editUploadedUrl, setEditUploadedUrl] = useState<string | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  const [deletingRequest, setDeletingRequest] = useState<AdsRequest | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const filteredRequests = useMemo(() => {
    if (campaignFilter === "all") return requests
    return requests.filter((r) => {
      const isActive = r.status === "APPROVED" && r.campaign?.active === true
      return campaignFilter === "active" ? isActive : !isActive
    })
  }, [requests, campaignFilter])

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setUploadedUrl(null)
  }

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null
    const formData = new FormData()
    formData.append("image", imageFile)
    try {
      const res = await fetch("/api/b2b/workspace/upload-banner", {
        method: "POST",
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        return data.url
      }
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? "Failed to upload image")
      return null
    } catch {
      setError("Failed to upload image")
      return null
    }
  }

  const submitRequest = async () => {
    if (!linkUrl.trim()) {
      setError("Link URL is required")
      return
    }

    setSubmitting(true)
    setError(null)

    let imageUrl = uploadedUrl

    if (imageFile && !imageUrl) {
      imageUrl = await uploadImage()
      if (!imageUrl) {
        setSubmitting(false)
        return
      }
    }

    if (!imageUrl) {
      setError("Please upload a banner image")
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=ads-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, linkUrl: linkUrl.trim() }),
      })
      if (res.ok) {
        setShowForm(false)
        setImageFile(null)
        setImagePreview(null)
        setLinkUrl("")
        setUploadedUrl(null)
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

  const openEdit = (r: AdsRequest) => {
    setEditingRequest(r)
    setEditLinkUrl(r.link_url ?? "")
    setEditImageFile(null)
    setEditImagePreview(null)
    setEditUploadedUrl(null)
  }

  const handleEditFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setEditImageFile(file)
    setEditImagePreview(URL.createObjectURL(file))
    setEditUploadedUrl(null)
  }

  const submitEdit = async () => {
    if (!editingRequest?.id) return
    if (!editLinkUrl.trim()) { setError("Link URL is required"); return }

    setEditSubmitting(true)
    setError(null)

    let imageUrl = editUploadedUrl ?? editingRequest.image_url ?? ""

    if (editImageFile && !editUploadedUrl) {
      const formData = new FormData()
      formData.append("image", editImageFile)
      try {
        const res = await fetch("/api/b2b/workspace/upload-banner", { method: "POST", body: formData })
        if (res.ok) {
          const data = await res.json()
          imageUrl = data.url
        } else {
          const data = await res.json().catch(() => ({}))
          setError(data.error ?? "Failed to upload image")
          setEditSubmitting(false)
          return
        }
      } catch { setError("Failed to upload image"); setEditSubmitting(false); return }
    }

    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=ads-requests/${editingRequest.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, linkUrl: editLinkUrl.trim() }),
      })
      if (res.ok) {
        setEditingRequest(null)
        setEditImageFile(null)
        setEditImagePreview(null)
        setEditLinkUrl("")
        setEditUploadedUrl(null)
        fetchRequests()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Failed to update ads request")
      }
    } catch { setError("Failed to update ads request") }
    setEditSubmitting(false)
  }

  const confirmDelete = async () => {
    if (!deletingRequest?.id) return
    setDeleteSubmitting(true)
    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=ads-requests/${deletingRequest.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setDeletingRequest(null)
        fetchRequests()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Failed to delete ads request")
      }
    } catch { setError("Failed to delete ads request") }
    setDeleteSubmitting(false)
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
          <p className="text-sm text-muted-foreground">Submit banner ads to be displayed on the marketplace homepage.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5">
          <Plus className="size-3.5" />
          New Request
        </Button>
      </div>

      <QuotaBar usage={adsUsage} limit={adsLimit} label="Monthly Ads Request Quota" />

      {error && <B2BErrorState message={error} onRetry={() => { setError(null); fetchRequests() }} />}

      <Tabs value={campaignFilter} onValueChange={setCampaignFilter}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all" className="text-sm">All ({requests.length})</TabsTrigger>
          <TabsTrigger value="active" className="text-sm">Active ({requests.filter(r => r.status === "APPROVED" && r.campaign?.active === true).length})</TabsTrigger>
          <TabsTrigger value="inactive" className="text-sm">Inactive ({requests.filter(r => !(r.status === "APPROVED" && r.campaign?.active === true)).length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {showForm && (
        <Card className="border-border/50 border-l-4 border-l-violet-500 shadow-xl shadow-violet-500/5 relative overflow-hidden animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 opacity-50 pointer-events-none" />
          <CardHeader className="relative z-10 pb-4">
            <CardTitle className="text-lg flex items-center gap-2"><Megaphone className="size-4 text-violet-500" /> Submit Banner Ad</CardTitle>
            <CardDescription>Upload your banner image and enter the destination URL. An admin will review and activate your campaign.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 relative z-10">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Banner Image</Label>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="size-4" />
                  {imageFile ? "Change Image" : "Choose Image"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {imageFile && (
                  <span className="text-sm text-muted-foreground">{imageFile.name} ({(imageFile.size / 1024).toFixed(0)} KB)</span>
                )}
              </div>
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => setLightboxUrl(imagePreview)}
                  className="mt-3 block max-w-md rounded-xl border border-border/50 overflow-hidden bg-muted/20 p-2 transition-shadow hover:shadow-md"
                >
                  <img src={imagePreview} alt="Banner preview" className="w-full h-auto rounded-lg" />
                </button>
              )}
              <p className="text-xs text-muted-foreground">Allowed: JPG, PNG, WebP, GIF — Max 5MB</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Link URL</Label>
              <div className="relative">
                <Link className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com/product/123"
                  className="h-10 rounded-xl bg-background/50 pl-9 focus-visible:ring-violet-500/50"
                />
              </div>
              <p className="text-xs text-muted-foreground">Visitors will be redirected here when they click your banner.</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={submitRequest} disabled={submitting || !linkUrl.trim()} size="sm" className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-6 shadow-md shadow-violet-500/20">
                {submitting ? "Uploading & Submitting..." : "Submit Request"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setImageFile(null); setImagePreview(null); setLinkUrl(""); setUploadedUrl(null) }} className="rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</Button>
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
                  <th className="w-20 px-4 py-3 font-semibold">Image</th>
                  <th className="px-4 py-3 font-semibold">Details</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                  <th className="px-4 py-3 font-semibold">Campaign</th>
                  <th className="px-4 py-3 font-semibold">Timeline</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-4"><div className="h-4 w-full animate-pulse rounded bg-muted/50" /></td>)}</tr>
                  ))
                ) : filteredRequests.length === 0 && !error ? (
                  <tr><td colSpan={6} className="px-4 py-20 text-center">
                    <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-950/40 mb-4 ring-1 ring-violet-500/20">
                      <Megaphone className="size-8 text-violet-500/50" />
                    </div>
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-100">No ads requests yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Submit a banner ad to promote your products on the homepage.</p>
                  </td></tr>
                ) : (
                  filteredRequests.map((r) => (
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

                      {/* Details */}
                      <td className="max-w-[280px] px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="gap-1 border-blue-200/50 bg-blue-50/40 px-2 py-0.5 text-xs text-blue-700 dark:border-blue-800/30 dark:bg-blue-950/20 dark:text-blue-400">
                            <User className="size-3.5" />
                            {r.owner_type ?? "N/A"}
                          </Badge>
                          <Badge variant="outline" className="gap-1 border-purple-200/50 bg-purple-50/40 px-2 py-0.5 text-xs text-purple-700 dark:border-purple-800/30 dark:bg-purple-950/20 dark:text-purple-400">
                            <Tag className="size-3.5" />
                            {r.request_type ?? "N/A"}
                          </Badge>
                        </div>
                        {r.link_url ? (
                          <a
                            href={r.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1.5 inline-flex max-w-full items-center gap-1 truncate text-sm text-indigo-600 underline underline-offset-2 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            <span className="truncate">{r.link_url}</span>
                            <ArrowUpRight className="size-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="mt-1.5 block text-sm text-muted-foreground">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <Badge className={`text-xs ${statusColor(r.status)}`}>
                          {r.status ?? "-"}
                        </Badge>
                      </td>

                      {/* Campaign */}
                      <td className="px-4 py-3 text-sm">
                        {r.campaign ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              {r.campaign.width && r.campaign.height ? (
                                <span className="font-mono text-xs font-medium text-foreground">
                                  {r.campaign.width}×{r.campaign.height}px
                                </span>
                              ) : (
                                <span className="text-xs italic text-muted-foreground/60">Dimensions TBD</span>
                              )}
                            </div>
                            {r.campaign.ends_at && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
                                <Calendar className="size-3" />
                                <span>until {new Date(r.campaign.ends_at).toLocaleDateString()}</span>
                              </div>
                            )}
                            <div>
                              {r.campaign.active ? (
                                <Badge className="gap-1 bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                  <CheckCircle2 className="size-3.5" />Active
                                </Badge>
                              ) : (
                                <Badge className="gap-1 bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                  <XCircle className="size-3.5" />Inactive
                                </Badge>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-xs italic text-muted-foreground/60">Awaiting approval</span>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground/50">
                              <Clock className="size-3" />
                              <span>{timeAgo(r.created_at)}</span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Timeline */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="size-3" />
                            <span>Submitted {timeAgo(r.created_at)}</span>
                          </div>
                          {r.updated_at && r.updated_at !== r.created_at && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
                              <Clock className="size-3" />
                              <span>Updated {timeAgo(r.updated_at)}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setViewingRequest(r)}
                            className="size-7 text-muted-foreground hover:text-foreground"
                            title="View details"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEdit(r)}
                            className="size-7 text-muted-foreground hover:text-amber-600"
                            title="Edit request (resets to PENDING for re-approval)"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeletingRequest(r)}
                            className="size-7 text-muted-foreground hover:text-red-600"
                            title="Delete request"
                          >
                            <Trash2 className="size-3.5" />
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

      {/* View Detail Modal */}
      <Dialog open={!!viewingRequest} onOpenChange={(open) => !open && setViewingRequest(null)}>
        <DialogContent className="max-w-lg sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="size-4 text-violet-500" />
              Banner Ad Details
            </DialogTitle>
            <DialogDescription>Full information about this ad request.</DialogDescription>
          </DialogHeader>
          {viewingRequest && (
            <div className="space-y-4">
              <div className="flex items-center justify-center rounded-xl border border-border/50 bg-muted/10 p-3">
                {viewingRequest.image_url ? (
                  <button
                    type="button"
                    onClick={() => setLightboxUrl(`${BACKEND_URL}${viewingRequest.image_url}`)}
                    className="block max-h-48 overflow-hidden rounded-lg transition-shadow hover:shadow-md"
                  >
                    <img
                      src={`${BACKEND_URL}${viewingRequest.image_url}`}
                      alt="Banner"
                      className="h-auto max-h-48 w-full rounded-lg object-contain"
                    />
                  </button>
                ) : (
                  <div className="flex h-32 w-full items-center justify-center rounded-lg bg-muted/20">
                    <ImageIcon className="size-10 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Status</span>
                  <p><Badge className={`mt-0.5 text-xs ${statusColor(viewingRequest.status)}`}>{viewingRequest.status ?? "-"}</Badge></p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Type</span>
                  <p className="mt-0.5 font-medium">{viewingRequest.request_type ?? "-"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Owner Type</span>
                  <p className="mt-0.5 font-medium">{viewingRequest.owner_type ?? "-"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Submitted</span>
                  <p className="mt-0.5 font-medium">{viewingRequest.created_at ? new Date(viewingRequest.created_at).toLocaleDateString() : "-"}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-muted-foreground">Link URL</span>
                  {viewingRequest.link_url ? (
                    <a href={viewingRequest.link_url} target="_blank" rel="noopener noreferrer" className="mt-0.5 flex items-center gap-1 break-all text-sm text-indigo-600 underline underline-offset-2 hover:text-indigo-800 dark:text-indigo-400">
                      {viewingRequest.link_url}
                      <ArrowUpRight className="size-3 shrink-0" />
                    </a>
                  ) : (
                    <p className="mt-0.5 text-sm text-muted-foreground">-</p>
                  )}
                </div>
                {viewingRequest.campaign && (
                  <>
                    <div className="col-span-2">
                      <span className="text-xs text-muted-foreground">Campaign Dimensions</span>
                      <p className="mt-0.5 font-medium">
                        {viewingRequest.campaign.width && viewingRequest.campaign.height
                          ? `${viewingRequest.campaign.width} × ${viewingRequest.campaign.height} px`
                          : "Not set"}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Campaign Status</span>
                      <p className="mt-0.5">
                        {viewingRequest.campaign.active ? (
                          <Badge className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            <CheckCircle2 className="size-3" />Active
                          </Badge>
                        ) : (
                          <Badge className="gap-1 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                            <XCircle className="size-3" />Inactive
                          </Badge>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Ends</span>
                      <p className="mt-0.5 font-medium">
                        {viewingRequest.campaign.ends_at ? new Date(viewingRequest.campaign.ends_at).toLocaleDateString() : "-"}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingRequest} onOpenChange={(open) => !open && setEditingRequest(null)}>
        <DialogContent className="max-w-lg sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-4 text-amber-500" />
              Edit Banner Ad
            </DialogTitle>
            <DialogDescription>Update your banner image or link URL. The request will need admin re-approval.</DialogDescription>
          </DialogHeader>
          {editingRequest && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Banner Image</Label>
                <div className="flex items-center gap-4">
                  <Button type="button" variant="outline" size="sm" onClick={() => editFileInputRef.current?.click()} className="gap-2">
                    <Upload className="size-4" />
                    {editImageFile ? "Change Image" : "Choose Image"}
                  </Button>
                  <input ref={editFileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleEditFileSelect} />
                  {editImageFile && <span className="text-sm text-muted-foreground">{editImageFile.name} ({(editImageFile.size / 1024).toFixed(0)} KB)</span>}
                </div>
                {editImagePreview && (
                  <div className="mt-2 max-w-sm rounded-xl border border-border/50 overflow-hidden bg-muted/20 p-2">
                    <img src={editImagePreview} alt="Banner preview" className="w-full h-auto rounded-lg" />
                  </div>
                )}
                {!editImageFile && editingRequest.image_url && (
                  <div className="mt-2 max-w-sm rounded-xl border border-border/50 overflow-hidden bg-muted/20 p-2">
                    <p className="mb-1 text-[11px] text-muted-foreground">Current image:</p>
                    <img src={`${BACKEND_URL}${editingRequest.image_url}`} alt="Current banner" className="w-full h-auto rounded-lg" />
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Link URL</Label>
                <div className="relative">
                  <Link className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={editLinkUrl}
                    onChange={(e) => setEditLinkUrl(e.target.value)}
                    placeholder="https://example.com/product/123"
                    className="h-10 rounded-xl bg-background/50 pl-9"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={submitEdit} disabled={editSubmitting || !editLinkUrl.trim()} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-6 shadow-md shadow-amber-500/20">
                  {editSubmitting ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingRequest(null)} className="rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingRequest} onOpenChange={(open) => !open && setDeletingRequest(null)}>
        <DialogContent className="max-w-sm sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="size-4" />
              Delete Ads Request
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this banner ad request?{deletingRequest?.campaign ? " The associated campaign will be cancelled." : ""} This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeletingRequest(null)}>Cancel</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmDelete}
              disabled={deleteSubmitting}
              className="gap-1.5"
            >
              <Trash2 className="size-4" />
              {deleteSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
    </div>
  )
}
