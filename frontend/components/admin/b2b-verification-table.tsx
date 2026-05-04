"use client"

import { useEffect, useMemo, useState } from "react"

import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Building, ShieldCheck, Clock, Store, Tag, XCircle, CheckCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  getRecentB2BReviews,
  getPendingB2BUsers,
  type AdminUser,
  type B2BStatus,
  type B2BReviewActivity,
  updateB2BStatus,
} from "@/services/admin/users"
import { getSellers, type Seller } from "@/services/admin/sellers"

const PAGE_SIZE = 20

function formatDate(value: string | null): string {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleString()
}

export default function B2BVerificationTable() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [recentReviews, setRecentReviews] = useState<B2BReviewActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [processing, setProcessing] = useState(false)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<Extract<B2BStatus, "APPROVED" | "REJECTED"> | null>(null)
  const [reviewTargetIds, setReviewTargetIds] = useState<number[]>([])
  const [reviewerNote, setReviewerNote] = useState("")
  const [sellerId, setSellerId] = useState("")
  const [planType, setPlanType] = useState("SILVER")
  const [durationMonths, setDurationMonths] = useState("3")
  const [sellers, setSellers] = useState<Seller[]>([])
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)

  const reviewActionLabel = reviewAction === "APPROVED" ? "approve" : "reject"

  async function loadRecentReviews() {
    try {
      const recent = await getRecentB2BReviews(8)
      setRecentReviews(recent.items)
    } catch {
      setRecentReviews([])
    }
  }

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError(null)

      try {
        const [response, , sellersList] = await Promise.all([
          getPendingB2BUsers(PAGE_SIZE, offset, search),
          loadRecentReviews(),
          getSellers().catch(() => []),
        ])
        if (cancelled) return
        setUsers(response.items)
        setTotal(response.pagination.total)
        setSelectedIds(new Set())
        setSellers(sellersList as Seller[])
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to fetch pending B2B users.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [offset, search])

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])
  const currentPage = useMemo(() => Math.floor(offset / PAGE_SIZE) + 1, [offset])
  const allVisibleSelected = useMemo(() => users.length > 0 && users.every((user) => selectedIds.has(user.id)), [users, selectedIds])

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleSelectAllVisible(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        users.forEach((user) => next.add(user.id))
      } else {
        users.forEach((user) => next.delete(user.id))
      }
      return next
    })
  }

  function openReviewDialog(
    ids: number[],
    action: Extract<B2BStatus, "APPROVED" | "REJECTED">,
  ) {
    if (ids.length === 0) {
      toast.error("Select at least one request.")
      return
    }

    setReviewTargetIds(ids)
    setReviewAction(action)
    setReviewerNote("")
    setSellerId("")
    setPlanType("SILVER")
    setDurationMonths("3")
    setReviewDialogOpen(true)
  }

  async function handleModerationSubmit() {
    if (!reviewAction || reviewTargetIds.length === 0) {
      setReviewDialogOpen(false)
      return
    }

    setProcessing(true)
    let successCount = 0
    let failedCount = 0

    try {
      const processedIds: number[] = []

      for (const id of reviewTargetIds) {
        try {
          await updateB2BStatus(
            id, 
            reviewAction, 
            reviewerNote.trim() || undefined,
            (sellerId && reviewAction === "APPROVED") ? parseInt(sellerId, 10) : undefined,
            reviewAction === "APPROVED" ? planType : undefined,
            reviewAction === "APPROVED" ? parseInt(durationMonths, 10) : undefined
          )
          processedIds.push(id)
          successCount += 1
        } catch (err: any) {
          failedCount += 1
          toast.error(`Error for ID ${id}: ${err.message || "Unknown error"}`)
        }
      }

      if (processedIds.length > 0) {
        setUsers((prev) => prev.filter((item) => !processedIds.includes(item.id)))
        setSelectedIds((prev) => {
          const next = new Set(prev)
          processedIds.forEach((id) => next.delete(id))
          return next
        })
        setTotal((prev) => Math.max(0, prev - processedIds.length))
      }

      if (successCount > 0) {
        toast.success(`${successCount} request(s) ${reviewActionLabel}d.`)
      }

      if (failedCount > 0) {
        toast.error(`${failedCount} request(s) failed to update.`)
      }

      await loadRecentReviews()
    } finally {
      setProcessing(false)
      setReviewDialogOpen(false)
    }
  }

  return (
    <div className="space-y-4">
      <Input
        value={search}
        onChange={(e) => {
          setOffset(0)
          setSearch(e.target.value)
        }}
        placeholder="Search by email, company name, market..."
        className="max-w-md"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="default"
          disabled={selectedIds.size === 0 || processing}
          onClick={() => openReviewDialog(Array.from(selectedIds), "APPROVED")}
        >
          Approve Selected ({selectedIds.size})
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={selectedIds.size === 0 || processing}
          onClick={() => openReviewDialog(Array.from(selectedIds), "REJECTED")}
        >
          Reject Selected ({selectedIds.size})
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allVisibleSelected}
                  onChange={(event) => toggleSelectAllVisible(event.target.checked)}
                  disabled={loading || users.length === 0 || processing}
                  className="size-4 rounded border-input"
                />
              </TableHead>
              <TableHead>ID</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Market</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Requested At</TableHead>
              <TableHead className="text-right">Moderation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                  Loading moderation queue...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                  No pending B2B accounts.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={`Select partner request ${user.id}`}
                      checked={selectedIds.has(user.id)}
                      onChange={() => toggleSelect(user.id)}
                      disabled={processing}
                      className="size-4 rounded border-input"
                    />
                  </TableCell>
                  <TableCell>{user.id}</TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="font-medium">{user.email}</div>
                      <div className="text-xs text-muted-foreground">{user.full_name || "-"}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{user.account_type}</Badge>
                  </TableCell>
                  <TableCell>{user.company_name || "-"}</TableCell>
                  <TableCell>{user.company_market || "-"}</TableCell>
                  <TableCell>{user.company_country || "-"}</TableCell>
                  <TableCell>
                    {user.company_website ? (
                      <a
                        href={user.company_website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        {user.company_website}
                      </a>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{formatDate(user.joined_at)}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedUser(user)
                        setDetailsDialogOpen(true)
                      }}
                    >
                      Details
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      disabled={processing}
                      onClick={() => openReviewDialog([user.id], "APPROVED")}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={processing}
                      onClick={() => openReviewDialog([user.id], "REJECTED")}
                    >
                      Reject
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Showing {users.length === 0 ? 0 : offset + 1}-{Math.min(offset + users.length, total)} of {total}
        </span>
        <div className="space-x-2">
          <Button
            size="sm"
            variant="outline"
            disabled={offset === 0 || loading}
            onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={offset + PAGE_SIZE >= total || loading}
            onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
        <span className="text-muted-foreground">
          Page {currentPage} / {pageCount}
        </span>
      </div>

      <div className="rounded-xl border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Recently Processed</h3>
          <Button size="sm" variant="ghost" onClick={loadRecentReviews} disabled={processing}>
            Refresh
          </Button>
        </div>

        {recentReviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No moderation activity yet.</p>
        ) : (
          <div className="space-y-3">
            {recentReviews.map((review) => (
              <div key={review.id} className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">
                    {review.after?.decision ?? review.action}
                    {review.before?.email ? ` • ${review.before.email}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">{formatDate(review.created_at)}</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  by {review.admin ?? "Unknown admin"}
                  {review.before?.company_name ? ` • ${review.before.company_name}` : ""}
                </div>
                {review.after?.reviewer_note ? (
                  <div className="mt-2 rounded-md border border-border/60 bg-background px-2 py-1 text-xs">
                    {review.after.reviewer_note}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Partner Request Details</DialogTitle>
            <DialogDescription>
              Full profile information for {selectedUser?.company_name || selectedUser?.email}.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Account Type</p>
                  <Badge variant="outline" className="rounded-md">{selectedUser.account_type}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Requested On</p>
                  <p className="text-sm font-medium">{formatDate(selectedUser.joined_at)}</p>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                <h4 className="text-xs font-semibold">Business Information</h4>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Company Name</p>
                    <p className="text-sm font-medium">{selectedUser.company_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Website</p>
                    {selectedUser.company_website ? (
                      <a href={selectedUser.company_website} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">
                        {selectedUser.company_website}
                      </a>
                    ) : "-"}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Market / Industry</p>
                    <p className="text-sm font-medium">{selectedUser.company_market || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Location</p>
                    <p className="text-sm font-medium">{selectedUser.company_country || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                <h4 className="text-xs font-semibold">Contact Person</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Full Name</p>
                    <p className="text-sm font-medium">{selectedUser.full_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Email Address</p>
                    <p className="text-sm font-medium">{selectedUser.email}</p>
                  </div>
                </div>
              </div>

              {selectedUser.company_website && (
                 <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Website Verification Preview</p>
                    <div className="overflow-hidden rounded-xl border bg-slate-100 dark:bg-slate-900">
                       <iframe 
                         src={selectedUser.company_website} 
                         className="h-48 w-full border-0 opacity-50 grayscale transition-all hover:opacity-100 hover:grayscale-0"
                         title="Website Preview"
                       />
                    </div>
                 </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>Close</Button>
            <Button variant="destructive" onClick={() => { setDetailsDialogOpen(false); openReviewDialog([selectedUser!.id], "REJECTED"); }}>Reject</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setDetailsDialogOpen(false); openReviewDialog([selectedUser!.id], "APPROVED"); }}>Approve Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-lg overflow-hidden p-0">
          <div className={`h-2 w-full ${reviewAction === "APPROVED" ? "bg-emerald-500" : "bg-red-500"}`} />
          <div className="px-6 pt-5 pb-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="flex items-center gap-2 text-xl">
                {reviewAction === "APPROVED" ? (
                  <CheckCircle className="size-5 text-emerald-500" />
                ) : (
                  <XCircle className="size-5 text-red-500" />
                )}
                {reviewAction === "APPROVED" ? "Approve" : "Reject"} {reviewTargetIds.length} request(s)
              </DialogTitle>
              <DialogDescription>
                {reviewAction === "APPROVED" 
                  ? "Configure the partner account details and subscription plan before approving." 
                  : "Are you sure you want to reject these requests? This action is recorded."}
              </DialogDescription>
            </DialogHeader>

            {reviewAction === "APPROVED" && (
              <div className="space-y-5">
                <div className="space-y-2 rounded-xl border bg-slate-50 p-4 dark:bg-slate-900/50">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <Store className="size-4 text-slate-500" />
                    Seller Account Integration
                  </label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                    value={sellerId}
                    onChange={(e) => setSellerId(e.target.value)}
                    disabled={processing}
                  >
                    <option value="">-- Create a new seller automatically --</option>
                    {sellers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} (ID: {s.id})</option>
                    ))}
                  </select>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    If selected, this B2B Company will be linked to the existing seller to display its listings. If left blank, a new seller will be automatically created using the company name.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                    <label className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-400">
                      <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-500" />
                      Subscription Plan
                    </label>
                    <select
                      className="flex h-10 w-full rounded-lg border-emerald-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-800 dark:bg-slate-950"
                      value={planType}
                      onChange={(e) => setPlanType(e.target.value)}
                      disabled={processing}
                    >
                      <option value="SILVER">Silver Plan (Includes Premium)</option>
                      <option value="GOLD">Gold Plan (Includes Premium)</option>
                    </select>
                  </div>
                  <div className="space-y-2 rounded-xl border bg-slate-50 p-4 dark:bg-slate-900/50">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      <Clock className="size-4 text-slate-500" />
                      Contract Duration
                    </label>
                    <select
                      className="flex h-10 w-full rounded-lg border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                      value={durationMonths}
                      onChange={(e) => setDurationMonths(e.target.value)}
                      disabled={processing}
                    >
                      <option value="3">3 Months</option>
                      <option value="6">6 Months</option>
                      <option value="12">12 Months (Annual)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Audit Trail Note</label>
              <Textarea
                value={reviewerNote}
                onChange={(event) => setReviewerNote(event.target.value)}
                maxLength={1000}
                placeholder="Optional explanation for this moderation decision..."
                rows={3}
                className="resize-none rounded-lg focus-visible:ring-1 focus-visible:ring-indigo-500"
              />
            </div>

            <DialogFooter className="mt-6 sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setReviewDialogOpen(false)}
                disabled={processing}
                className="hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="button"
                className={reviewAction === "APPROVED" ? "bg-emerald-600 px-6 hover:bg-emerald-700" : "bg-red-600 px-6 hover:bg-red-700"}
                onClick={handleModerationSubmit}
                disabled={processing}
              >
                {processing
                  ? "Processing..."
                  : reviewAction === "APPROVED"
                    ? "Confirm Approval"
                    : "Confirm Rejection"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
