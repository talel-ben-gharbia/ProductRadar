"use client"

import { useEffect, useMemo, useState } from "react"

import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getSubscriptions,
  resyncAllSubscriptions,
  type SubscriptionItem,
} from "@/services/admin/subscriptions"

const PAGE_SIZE = 20

function formatDate(value: string | null): string {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleDateString()
}

type SubscriptionsPanelProps = {
  accountType?: string
}

export default function SubscriptionsPanel({ accountType }: SubscriptionsPanelProps) {
  const [items, setItems] = useState<SubscriptionItem[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({ total: 0, active: 0, premium: 0, free: 0 })
  const [offset, setOffset] = useState(0)
  const [planType, setPlanType] = useState("")
  const [active, setActive] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resyncing, setResyncing] = useState(false)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await getSubscriptions(PAGE_SIZE, offset, {
          planType,
          active,
          accountType,
        })
        if (cancelled) return

        setItems(response.items)
        setTotal(response.pagination.total)
        setStats(response.stats)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to fetch subscriptions.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [offset, planType, active, accountType])

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])
  const currentPage = useMemo(() => Math.floor(offset / PAGE_SIZE) + 1, [offset])

  async function handleResync() {
    setResyncing(true)
    try {
      const result = await resyncAllSubscriptions()
      toast.success(
        `Resync complete: created ${result.summary.created}, updated ${result.summary.updated}, unchanged ${result.summary.unchanged}.`,
      )

      const response = await getSubscriptions(PAGE_SIZE, offset, {
        planType,
        active,
        accountType,
      })

      setItems(response.items)
      setTotal(response.pagination.total)
      setStats(response.stats)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resync subscriptions.")
    } finally {
      setResyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Subscriptions</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.active}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Premium</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.premium}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Free</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.free}</CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <select
          value={planType}
          onChange={(e) => {
            setOffset(0)
            setPlanType(e.target.value)
          }}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All plans</option>
          <option value="FREE">FREE</option>
          <option value="PREMIUM">PREMIUM</option>
        </select>

        <select
          value={active}
          onChange={(e) => {
            setOffset(0)
            setActive(e.target.value)
          }}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All activity</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
      </div>

      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={resyncing || loading}
          onClick={handleResync}
        >
          {resyncing ? "Resyncing..." : "Resync All Subscriptions"}
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
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Limits</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Loading subscriptions...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No subscriptions found.
                </TableCell>
              </TableRow>
            ) : (
              items.map((subscription) => (
                <TableRow key={subscription.id}>
                  <TableCell>{subscription.id}</TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="font-medium">{subscription.client?.email || "-"}</div>
                      <div className="text-xs text-muted-foreground">
                        {subscription.client?.account_type || "Unknown"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={subscription.plan_type.toUpperCase() === "PREMIUM" ? "default" : "secondary"}>
                      {subscription.plan_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={subscription.active ? "default" : "secondary"}>
                      {subscription.active ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(subscription.start_date)}</TableCell>
                  <TableCell>{formatDate(subscription.end_date)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    Alerts: {subscription.alerts_limit} | Favorites: {subscription.favorites_limit}
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
