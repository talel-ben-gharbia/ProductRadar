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
        const [response] = await Promise.all([
          getPendingB2BUsers(PAGE_SIZE, offset, search),
          loadRecentReviews(),
        ])
        if (cancelled) return
        setUsers(response.items)
        setTotal(response.pagination.total)
        setSelectedIds(new Set())
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
          await updateB2BStatus(id, reviewAction, reviewerNote.trim() || undefined)
          processedIds.push(id)
          successCount += 1
        } catch {
          failedCount += 1
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
                      variant="default"
                      disabled={processing}
                      onClick={() => openReviewDialog([user.id], "APPROVED")}
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

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "APPROVED" ? "Approve" : "Reject"} {reviewTargetIds.length} request(s)
            </DialogTitle>
            <DialogDescription>
              Add an optional reviewer note. It will be stored in the moderation audit trail.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={reviewerNote}
            onChange={(event) => setReviewerNote(event.target.value)}
            maxLength={1000}
            placeholder="Optional note for audit trail"
            rows={5}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReviewDialogOpen(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={reviewAction === "REJECTED" ? "destructive" : "default"}
              onClick={handleModerationSubmit}
              disabled={processing}
            >
              {processing
                ? "Processing..."
                : reviewAction === "APPROVED"
                  ? "Approve"
                  : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
