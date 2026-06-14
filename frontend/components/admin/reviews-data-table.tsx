"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getAutoModerationSuggestion } from "@/services/enhanced-reviews"
import { downloadReviewsCsv, getReviews, type ReviewItem, updateReviewStatus } from "@/services/reviews"

const PAGE_SIZE = 20

function formatDate(value: string | null): string {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleString()
}

export default function ReviewsDataTable() {
  const [items, setItems] = useState<ReviewItem[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [suggestingId, setSuggestingId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await getReviews(PAGE_SIZE, offset, { search, status })
        if (cancelled) return

        setItems(response.items)
        setTotal(response.pagination.total)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to fetch reviews.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [offset, search, status])

  const currentPage = useMemo(() => Math.floor(offset / PAGE_SIZE) + 1, [offset])
  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])

  async function handleStatusUpdate(id: number, nextStatus: "PENDING" | "APPROVED" | "REJECTED") {
    setUpdatingId(id)

    try {
      const updated = await updateReviewStatus(id, nextStatus)
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)))
      toast.success(`Review marked as ${nextStatus}.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update review status.")
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleExport() {
    try {
      await downloadReviewsCsv({ status, search })
      toast.success("Reviews exported as CSV.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export reviews.")
    }
  }

  async function handleAutoModerate(item: ReviewItem) {
    setSuggestingId(item.id)
    try {
      const data = await getAutoModerationSuggestion(item.id)
      const suggestion = data.suggestion

      if (!suggestion) {
        toast.message("No auto-moderation suggestion for this review.")
        return
      }

      const action = suggestion.action
      if (action !== "APPROVED" && action !== "REJECTED" && action !== "PENDING") {
        toast.error("Invalid auto-moderation suggestion.")
        return
      }

      await handleStatusUpdate(item.id, action)
      toast.message(`Suggestion applied: ${suggestion.reason}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply auto-moderation.")
    } finally {
      setSuggestingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Input
          value={search}
          onChange={(event) => {
            setOffset(0)
            setSearch(event.target.value)
          }}
          placeholder="Search by customer email, product, comment..."
          className="md:col-span-2"
        />

        <select
          value={status}
          onChange={(event) => {
            setOffset(0)
            setStatus(event.target.value)
          }}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={handleExport} disabled={loading}>
          Export CSV
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
              <TableHead>ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Comment</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Moderation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  Loading reviews...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  No reviews found.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>{item.client.email || "-"}</TableCell>
                  <TableCell>{item.product.name || "-"}</TableCell>
                  <TableCell>{item.rating}/5</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.status === "APPROVED"
                          ? "default"
                          : item.status === "REJECTED"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate text-xs text-muted-foreground">
                    {item.comment || "-"}
                  </TableCell>
                  <TableCell>{formatDate(item.created_at)}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button
                      size="sm"
                      variant="default"
                      disabled={updatingId === item.id || suggestingId === item.id}
                      onClick={() => handleStatusUpdate(item.id, "APPROVED")}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={updatingId === item.id || suggestingId === item.id}
                      onClick={() => handleStatusUpdate(item.id, "REJECTED")}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updatingId === item.id || suggestingId === item.id}
                      onClick={() => handleAutoModerate(item)}
                    >
                      {suggestingId === item.id ? "Suggesting..." : "Auto"}
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
          Showing {items.length === 0 ? 0 : offset + 1}-{Math.min(offset + items.length, total)} of {total}
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
    </div>
  )
}
