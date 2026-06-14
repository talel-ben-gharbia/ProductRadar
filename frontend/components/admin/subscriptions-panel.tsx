"use client"

import { useEffect, useMemo, useState } from "react"
import { Building2, Crown, Sparkles, User } from "lucide-react"
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
} from "@/services/subscriptions"

const PAGE_SIZE = 20

function formatDate(value: string | null): string {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleDateString()
}

function formatPlanName(plan: string): string {
  const map: Record<string, string> = {
    FREE: "Free",
    PREMIUM_MONTHLY: "Premium",
    PREMIUM_YEARLY: "Premium Yearly",
    B2B_SILVER: "B2B Silver",
    B2B_GOLD: "B2B Gold",
  }
  return map[plan] ?? plan.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function PlanBadge({ plan }: { plan: string }) {
  const u = plan.toUpperCase()
  if (u === "PREMIUM_MONTHLY" || u === "PREMIUM_YEARLY") {
    return (
      <Badge variant="default" className="gap-1 bg-amber-500 hover:bg-amber-600">
        <Sparkles className="size-3" />
        {formatPlanName(plan)}
      </Badge>
    )
  }
  if (u === "B2B_GOLD") {
    return (
      <Badge className="gap-1 bg-gradient-to-r from-amber-200 to-yellow-400 text-amber-900 shadow-sm shadow-amber-500/20">
        <Crown className="size-3" />
        {formatPlanName(plan)}
      </Badge>
    )
  }
  if (u === "B2B_SILVER") {
    return (
      <Badge variant="secondary" className="gap-1 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
        <Building2 className="size-3" />
        {formatPlanName(plan)}
      </Badge>
    )
  }
  return <Badge variant="secondary">{formatPlanName(plan)}</Badge>
}

function getUserLabel(item: SubscriptionItem): { label: string; sub: string; icon: React.ReactNode } {
  const ownerType = item.owner_type?.toUpperCase() ?? item.client?.account_type?.toUpperCase() ?? ""
  if (ownerType === "USER" || ownerType === "B2C") {
    return {
      label: item.client?.email ?? item.owner_name ?? "-",
      sub: "B2C Customer",
      icon: <User className="size-3 text-blue-500" />,
    }
  }
  if (ownerType === "COMPANY" || ownerType === "B2B_COMPANY" || ownerType === "B2B" || ownerType.startsWith("B2B")) {
    return {
      label: item.owner_name ?? item.client?.email ?? "-",
      sub: item.plan_type?.toUpperCase().startsWith("B2B") ? "B2B Company" : "B2B",
      icon: <Building2 className="size-3 text-amber-600" />,
    }
  }
  if (ownerType === "MARKET" || ownerType === "B2B_MARKET") {
    return {
      label: item.owner_name ?? "-",
      sub: "B2B Market",
      icon: <Building2 className="size-3 text-purple-500" />,
    }
  }
  return {
    label: item.owner_name ?? item.client?.email ?? "-",
    sub: item.owner_type ?? item.client?.account_type ?? "Unknown",
    icon: <User className="size-3 text-muted-foreground" />,
  }
}

type SubscriptionsPanelProps = {
  accountType?: string
}

export default function SubscriptionsPanel({ accountType }: SubscriptionsPanelProps) {
  const [items, setItems] = useState<SubscriptionItem[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({ total: 0, active: 0, premium: 0, b2b: 0, free: 0 })
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
      <div className="grid gap-3 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-emerald-600">{stats.active}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Premium (B2C)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-amber-500">{stats.premium}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">B2B Plans</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-indigo-600">{stats.b2b}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Free</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-muted-foreground/60">{stats.free}</CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <select
          value={planType}
          onChange={(e) => {
            setOffset(0)
            setPlanType(e.target.value)
          }}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All plans</option>
          <option value="FREE">Free</option>
          <option value="PREMIUM">Premium (all)</option>
          <option value="PREMIUM_MONTHLY">Premium Monthly</option>
          <option value="PREMIUM_YEARLY">Premium Yearly</option>
          <option value="B2B_SILVER">B2B Silver</option>
          <option value="B2B_GOLD">B2B Gold</option>
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

        <div />
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
              <TableHead>Status</TableHead>
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
              items.map((subscription) => {
                const userInfo = getUserLabel(subscription)
                return (
                  <TableRow key={subscription.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{subscription.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {userInfo.icon}
                        <div className="space-y-0.5">
                          <div className="font-medium">{userInfo.label}</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {userInfo.sub}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <PlanBadge plan={subscription.plan_type} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={subscription.active ? "default" : "secondary"}>
                        {subscription.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(subscription.start_date)}</TableCell>
                    <TableCell className="text-xs">{formatDate(subscription.end_date)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {subscription.plan_type?.toUpperCase().startsWith("B2B") ? (
                        <span className="flex items-center gap-1">
                          <Building2 className="size-3" />
                          {subscription.duration_months ? `${subscription.duration_months}mo` : "B2B contract"}
                        </span>
                      ) : (
                        <>
                          Alerts: {subscription.alerts_limit ?? "-"} | Favorites: {subscription.favorites_limit ?? "-"}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
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
