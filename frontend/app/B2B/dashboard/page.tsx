"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  Clock,
  DollarSign,
  Eye,
  Lightbulb,
  Package,
  RefreshCw,
  Shield,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import B2BErrorState from "@/components/B2B/b2b-error-state"
import B2BSubscriptionBanner from "@/components/B2B/b2b-subscription-banner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { timeAgo, ordinalSuffix } from "@/components/B2B/b2b-utils"


const CHART_COLORS = ["#0ea5e9", "#06b6d4", "#14b8a6", "#10b981", "#3b82f6", "#6366f1"]

function fmt(value: unknown): string {
  if (typeof value === "number") return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)
  return "-"
}

export default function B2BOverviewPage() {
  const { summary, loading, mode, planType, isGold, refresh } = useB2B()

  const [healthScore, setHealthScore] = useState<Record<string, unknown> | null>(null)
  const [trustScoreTrend, setTrustScoreTrend] = useState<Array<Record<string, unknown>>>([])
  const [trendError, setTrendError] = useState<string | null>(null)
  const [dismissError, setDismissError] = useState<string | null>(null)
  const [alertFilter, setAlertFilter] = useState<"competitive" | "all">("competitive")
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<number>>(new Set())

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch("/api/b2b/workspace?endpoint=health-score")
        if (res.ok) {
          setHealthScore(await res.json())
        } else {
          setHealthScore(null)
        }
      } catch {
        setHealthScore(null)
      }
    }
    fetchHealth()
  }, [])

  const fetchTrend = useCallback(async () => {
    try {
      setTrendError(null)
      const res = await fetch("/api/b2b/workspace?endpoint=trust-score-history")
      if (res.ok) {
        const data = await res.json()
        setTrustScoreTrend(data.items ?? [])
      }
    } catch {
      setTrendError("Failed to load trust score history")
    }
  }, [])

  useEffect(() => {
    fetchTrend()
  }, [fetchTrend])

  const refreshAll = useCallback(async () => {
    await refresh()
    fetchTrend()
  }, [refresh, fetchTrend])

  useEffect(() => {
    refreshAll()
    const interval = setInterval(refreshAll, 60000)
    const onVisibility = () => { if (document.visibilityState === "visible") refreshAll() }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [refreshAll])

  const handleDismissAlert = useCallback(async (notificationId: number) => {
    try {
      setDismissError(null)
      await fetch("/api/b2b/workspace?endpoint=notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notificationId }),
      })
    } catch {
      setDismissError("Failed to dismiss alert")
    }
  }, [])

  const competitiveTypes = new Set(["COMPETITOR_UNDERCUT", "STOCK_SHORTAGE", "COMPETITOR_TRUST_DROP", "DISPERSION_ANOMALY", "NEW_COMPETITOR", "STOCK_OPPORTUNITY", "COMPETITOR_OOS", "TRUST_DROP", "MARKET_BRAND_OOS", "MARKET_PRICE_SPIKE", "MARKET_SHELF_DROP", "MARKET_SENTIMENT_SHIFT"])

  const metrics = summary?.metrics as Record<string, unknown> | undefined

  const planLabel = planType
    ? planType.replace(/^B2B_/i, "").charAt(0).toUpperCase() + planType.replace(/^B2B_/i, "").slice(1).toLowerCase()
    : "—"

  const productsCount = Number(metrics?.products_count ?? 0)
  const newProductsThisWeek = Number(metrics?.new_products_this_week ?? 0)
  const listingsCount = Number(metrics?.listings_count ?? 0)
  const avgTrust = metrics?.average_trust_score
  const inStock = Number(metrics?.in_stock_count ?? 0)
  const outOfStock = Number(metrics?.out_of_stock_count ?? 0)
  const notificationsCount = Number(metrics?.notifications_count ?? 0)

  const stockData = useMemo(() => [
    { name: "In Stock", value: inStock, color: "#22c55e" },
    { name: "Out of Stock", value: outOfStock, color: "#ef4444" },
  ].filter((d) => d.value > 0), [inStock, outOfStock])

  const chartData = useMemo(() =>
    mode === "market"
      ? ((metrics?.share_of_shelf ?? []) as Array<Record<string, unknown>>).slice(0, 6).map((item) => ({
          name: String(item.category ?? "Category"),
          value: Number(item.share_of_shelf ?? 0),
        }))
      : ((metrics?.competitor_pricing ?? []) as Array<Record<string, unknown>>).slice(0, 6).map((item) => ({
          name: String(item.product_name ?? item.product_id ?? "Product").slice(0, 16),
          value: Math.abs(Number(item.gap_to_cheapest ?? 0)),
        })),
    [mode, metrics?.share_of_shelf, metrics?.competitor_pricing])

  const notifications = useMemo(() => (summary?.notifications ?? []) as Array<Record<string, unknown>>, [summary?.notifications])
  const opportunities = useMemo(() => (metrics?.opportunities ?? []) as Array<Record<string, unknown>>, [metrics?.opportunities])
  const stockMonitoring = useMemo(() => (metrics?.stock_monitoring ?? []) as Array<Record<string, unknown>>, [metrics?.stock_monitoring])

  if (loading && !summary) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-4 border-blue-500/30 border-t-blue-500" />
          <p className="text-sm text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Subscription Status Banner */}
      <B2BSubscriptionBanner />

      {/* Seller Setup Warning (vendor mode with no seller linked) */}
      {mode === "vendor" && summary?.user?.seller_id == null && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-400">
          <Building2 className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">Seller account not linked</p>
            <p className="mt-0.5 text-xs opacity-80">
              Your company account isn&apos;t linked to a seller profile yet. Dashboard data will show zero until a seller is configured. Contact support to link your seller account.
            </p>
          </div>
        </div>
      )}

      {/* Hero header with at-a-glance metrics */}
      <section className="sticky top-0 z-10 rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-blue-50/20 to-white p-6 text-slate-900 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{summary?.user?.name ?? "B2B Workspace"}</h1>
              <Badge className={`rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                isGold
                  ? "bg-amber-100 text-amber-700 ring-1 ring-amber-200"
                  : "bg-blue-100 text-blue-700 ring-1 ring-blue-200"
              }`}>
                {planLabel}
              </Badge>
              <Badge className={`rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                summary?.subscription?.active === false
                  ? "bg-red-100 text-red-700 ring-1 ring-red-200"
                  : "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
              }`}>
                {summary?.subscription?.active === false ? "Expired" : "Active"}
              </Badge>
            </div>
            <p className="text-sm text-slate-500">
              {mode === "market" ? "Market Intelligence Dashboard" : "Vendor Performance Dashboard"}
              {summary?.subscription?.days_remaining != null && (
                <span className="ml-3 text-xs text-slate-400">
                  {summary.subscription.days_remaining} days remaining
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">              <Button variant="outline" size="sm" onClick={refreshAll} className="h-8 gap-1.5 text-xs">
              <RefreshCw className="size-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* At-a-glance metrics row */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(() => {
            const shelfData = ((metrics?.share_of_shelf ?? []) as Array<Record<string, unknown>>)
            const avgDelta = shelfData.length > 0
              ? shelfData.reduce((s, c) => s + (Number(c.delta ?? 0)), 0) / shelfData.length
              : 0
            const trustTrend = trustScoreTrend.length >= 2
              ? (Number(trustScoreTrend[trustScoreTrend.length - 1]?.avg_score ?? 0) - Number(trustScoreTrend[0]?.avg_score ?? 0))
              : 0
            const kpiItems = [
              { label: "Products", value: productsCount, sub: newProductsThisWeek > 0 ? `+${newProductsThisWeek} this week` : null, color: "text-blue-600" },
              { label: "Listings", value: listingsCount, sub: null, color: "text-cyan-600" },
              { label: "Avg Trust Score", value: avgTrust, sub: trustTrend !== 0 ? `${trustTrend > 0 ? "▲" : "▼"} ${Math.abs(trustTrend).toFixed(1)} pts` : "out of 100", color: "text-emerald-600" },
              { label: mode === "market" ? "Avg Shelf Share" : "Active Alerts", value: mode === "market" ? (shelfData.length > 0 ? shelfData.reduce((s, c) => s + Number(c.share_of_shelf ?? 0), 0) / shelfData.length : 0) : notificationsCount, sub: mode === "market" ? (avgDelta !== 0 ? `${avgDelta > 0 ? "▲" : "▼"} ${Math.abs(avgDelta).toFixed(1)}% vs last week` : "per category") : (notificationsCount > 0 ? `${notifications.filter((n) => !n.is_read).length} unread` : "needs attention"), color: mode === "market" ? "text-blue-600" : (notificationsCount > 0 ? "text-amber-600" : "text-emerald-600") },
            ]
            return kpiItems.map((item) => (
              <div key={item.label} className="rounded-xl bg-gradient-to-br from-slate-50 to-white px-4 py-3 ring-1 ring-slate-200/50 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
                <p className={`mt-0.5 text-2xl font-black tracking-tight ${item.color}`}>{fmt(item.value)}</p>
                {item.sub && <p className="text-[10px] text-slate-400">{item.sub}</p>}
              </div>
            ))
          })()}
        </div>
      </section>

      {/* Vendor Health Score */}
      {healthScore?.overall != null && mode === "vendor" && (
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="grid gap-4 lg:grid-cols-[1fr_2px_2fr]">
              {/* Gauge */}
              <div className="flex flex-col items-center justify-center p-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Vendor Health Score</p>
                {(() => {
                  const score = Number(healthScore.overall ?? 0)
                  const gaugeColor = score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444"
                  return (
                    <div className="mt-3 flex items-center gap-4">
                      <div className="relative size-28 shrink-0">
                        <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-muted" strokeWidth="2.5" />
                          <circle cx="18" cy="18" r="15.5" fill="none" stroke={gaugeColor} strokeWidth="2.5"
                            strokeDasharray={`${(score / 100) * 97.4} 97.4`} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-3xl font-black tracking-tight" style={{ color: gaugeColor }}>{score}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        {[
                          { label: "Trust", value: Number(healthScore.trust_dimension ?? 0), color: Number(healthScore.trust_dimension) >= 75 ? "text-emerald-500" : Number(healthScore.trust_dimension) >= 50 ? "text-amber-500" : "text-red-500" },
                          { label: "Pricing", value: Number(healthScore.pricing_dimension ?? 0), color: Number(healthScore.pricing_dimension) >= 75 ? "text-emerald-500" : Number(healthScore.pricing_dimension) >= 50 ? "text-amber-500" : "text-red-500" },
                          { label: "Stock", value: Number(healthScore.stock_dimension ?? 0), color: Number(healthScore.stock_dimension) >= 75 ? "text-emerald-500" : Number(healthScore.stock_dimension) >= 50 ? "text-amber-500" : "text-red-500" },
                        ].map((d) => (
                          <div key={d.label} className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-1.5">
                            <span className="font-medium text-muted-foreground">{d.label}</span>
                            <span className={`font-bold ${d.color}`}>{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="hidden lg:block w-px bg-border/50 self-stretch my-4" />

              {/* Right: Quick Stats */}
              <div className="flex flex-col justify-center gap-3 p-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Portfolio Summary</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border/50 bg-muted/20 p-3 text-center">
                    <p className="text-lg font-bold">{inStock}</p>
                    <p className="text-[10px] text-muted-foreground">In Stock</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-muted/20 p-3 text-center">
                    <p className="text-lg font-bold text-red-500">{outOfStock}</p>
                    <p className="text-[10px] text-muted-foreground">Out of Stock</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-muted/20 p-3 text-center">
                    <p className="text-lg font-bold text-blue-500">{opportunities.length}</p>
                    <p className="text-[10px] text-muted-foreground">Opportunities</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="size-3 text-emerald-500" />
                  <span>
                    Trust: <strong>{fmt(avgTrust)}</strong> / 100 &middot;{" "}
                    Stock: <strong>{inStock + outOfStock > 0 ? Math.round((inStock / (inStock + outOfStock)) * 100) : 0}%</strong> available
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts + Alerts Row */}
      <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4 text-blue-500" />
              {mode === "market" ? "Share of Shelf" : "Price Gap to Competitors"}
            </CardTitle>
            <CardDescription>
              {mode === "market" ? "Your brand's percentage share per category." : "Gap between your price and the cheapest competitor."}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} className="fill-muted-foreground" />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} className="fill-muted-foreground" unit="%" />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: "12px" }} formatter={(value: number) => [`${value.toFixed(1)}%`, "Share of Shelf"]} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={48}>
                    {chartData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data available yet</div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Stock Donut */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Stock Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="h-28 w-28 shrink-0">
                  {stockData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stockData} cx="50%" cy="50%" innerRadius={32} outerRadius={48} dataKey="value" paddingAngle={4}>
                          {stockData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No data</div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-block size-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs text-muted-foreground">In Stock</span>
                    <span className="ml-auto text-sm font-bold">{inStock}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block size-2.5 rounded-full bg-red-500" />
                    <span className="text-xs text-muted-foreground">Out of Stock</span>
                    <span className="ml-auto text-sm font-bold text-red-500">{outOfStock}</span>
                  </div>
                  <div className="pt-1 text-[10px] text-muted-foreground">
                    {inStock + outOfStock > 0
                      ? `${Math.round((inStock / (inStock + outOfStock)) * 100)}% in stock`
                      : "No listings tracked"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Latest Alerts */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Latest Alerts</CardTitle>
              <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                <Link href="/B2B/dashboard/alerts">
                  View all <ArrowRight className="ml-1 size-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {notifications.slice(0, 3).map((n) => (
                <div key={String(n.id ?? n.created_at)} className="rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium">{String(n.type ?? "Alert")}</p>
                    <Badge variant="outline" className="text-[10px]">{String(n.severity ?? "info")}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{String(n.message ?? "-")}</p>
                </div>
              ))}
              {notifications.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">No alerts yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Trust Score Trend */}
      {trendError ? (
        <B2BErrorState message={trendError} onRetry={fetchTrend} />
      ) : (
      <section className="grid gap-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-4 text-emerald-500" />
              Trust Score Trend
            </CardTitle>
            <CardDescription>
              Daily average trust score across your listings over the last 90 days.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {trustScoreTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trustScoreTrend.map((d) => ({ date: d.date, score: Number(d.avg_score ?? 0), count: Number(d.listing_count ?? 0) }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} className="fill-muted-foreground" />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
                    formatter={(value: number) => [`${value.toFixed(2)} / 100`, "Avg Trust Score"]}
                  />
                  <Line type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} name="Avg Trust Score" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <div className="text-center">
                  <Shield className="mx-auto mb-2 size-8 text-muted-foreground/40" />
                  <p>No trust score history yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Data appears after the next scheduled recalculation.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
      )}
      {mode === "market" && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/50 shadow-sm bg-gradient-to-br from-white to-sky-50/30 dark:from-slate-900 dark:to-sky-950/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total Products</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{fmt(productsCount)}</p>
              {newProductsThisWeek > 0 && <p className="text-[10px] text-emerald-600 mt-1">+{newProductsThisWeek} this week</p>}
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-sm bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">In Stock Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {inStock + outOfStock > 0 ? Math.round((inStock / (inStock + outOfStock)) * 100) : 0}%
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">{inStock} of {inStock + outOfStock} listings</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-sm bg-gradient-to-br from-white to-amber-50/30 dark:from-slate-900 dark:to-amber-950/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Avg Trust Score</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{fmt(avgTrust)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">out of 100</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-sm bg-gradient-to-br from-white to-cyan-50/30 dark:from-slate-900 dark:to-cyan-950/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Active Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{notificationsCount}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{notifications.filter((n) => !n.is_read).length} unread</p>
            </CardContent>
          </Card>
        </section>
      )}
      {mode === "vendor" && (
        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border/50 bg-gradient-to-br from-white to-amber-50/30 shadow-sm dark:from-slate-900 dark:to-amber-950/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Lightbulb className="size-5" />
                Growth Opportunities
              </CardTitle>
              <CardDescription>Intelligent recommendations based on market gaps and stock status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {opportunities.length > 0 ? (
                opportunities.map((op, i) => {
                  const oppType = String(op.type ?? "")
                  const isStock = oppType === "STOCK_OPPORTUNITY"
                  const isPrice = oppType === "PRICE_OPPORTUNITY"
                  const isTrust = oppType === "TRUST_ALERT"
                  const Icon = isStock ? ShoppingCart : isPrice ? DollarSign : Zap
                  const badgeColor = isStock
                    ? "border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
                    : isPrice
                      ? "border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400"
                      : "border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400"
                  const bgColor = isStock
                    ? "bg-emerald-100 dark:bg-emerald-900/30"
                    : isPrice
                      ? "bg-blue-100 dark:bg-blue-900/30"
                      : "bg-amber-100 dark:bg-amber-900/30"
                  const iconColor = isStock
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isPrice
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-amber-600 dark:text-amber-400"

                  return (
                    <div key={i} className="flex items-start gap-4 rounded-xl border border-amber-100 bg-white/50 p-4 shadow-sm dark:border-amber-900/30 dark:bg-slate-950/50">
                      <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${bgColor}`}>
                        <Icon className={`size-5 ${iconColor}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{String(op.product_name ?? "Opportunity")}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{String(op.reason ?? "Competitive advantage detected.")}</p>
                        <Badge variant="outline" className={`mt-2 ${badgeColor}`}>
                          {isStock ? "Stock Opportunity" : isPrice ? "Pricing" : "Trust Alert"}
                        </Badge>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <CheckCircle2 className="mb-3 size-10 opacity-20" />
                  <p className="text-sm">No new opportunities detected today.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Smart Alerts */}
      {dismissError && (
        <B2BErrorState message={dismissError} onRetry={() => setDismissError(null)} />
      )}
      {mode === "vendor" && (
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-blue-500" />
              <CardTitle className="text-sm">Intelligence Feed</CardTitle>
              {(() => {
                const critical = notifications.filter((n) => !dismissedAlerts.has(Number(n.id)) && String(n.severity ?? "").toUpperCase() === "CRITICAL").length
                return critical > 0 ? (
                  <Badge className="bg-red-500 text-[10px] text-white">{critical} critical</Badge>
                ) : null
              })()}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-border/50 p-0.5 bg-muted/30">
                <button type="button" onClick={() => setAlertFilter("competitive")}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors ${alertFilter === "competitive" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  Competitive
                </button>
                <button type="button" onClick={() => setAlertFilter("all")}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors ${alertFilter === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  All
                </button>
              </div>
              <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                <Link href="/B2B/dashboard/alerts">View all <ArrowRight className="ml-1 size-3" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {(() => {
              const active = notifications.filter((n) => !dismissedAlerts.has(Number(n.id)))
              const filtered = alertFilter === "competitive" ? active.filter((n) => competitiveTypes.has(String(n.type ?? ""))) : active
              const emptyLabel = alertFilter === "competitive" ? "No competitive intelligence alerts right now." : "No alerts need your attention right now."
              if (filtered.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle2 className="mb-3 size-10 text-emerald-400/40" />
                    <p className="text-sm font-medium text-muted-foreground">{emptyLabel}</p>
                  </div>
                )
              }
              const severityRank: Record<string, number> = { CRITICAL: 0, WARNING: 1, SUCCESS: 2, INFO: 3 }
              const sorted = [...filtered].sort((a, b) => {
                const ra = severityRank[String(a.severity ?? "").toUpperCase()] ?? 99
                const rb = severityRank[String(b.severity ?? "").toUpperCase()] ?? 99
                if (ra !== rb) return ra - rb
                return String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))
              })
              return sorted.slice(0, 8).map((n) => {
                const nType = String(n.type ?? "")
                const isUndercut = nType === "COMPETITOR_UNDERCUT"
                const isStockShortage = nType === "STOCK_SHORTAGE"
                const isTrustDrop = nType === "COMPETITOR_TRUST_DROP" || nType === "TRUST_DROP"
                const isDispersion = nType === "DISPERSION_ANOMALY"
                const isNewCompetitor = nType === "NEW_COMPETITOR"
                const isStockOpportunity = nType === "STOCK_OPPORTUNITY"
                const isCompetitorOos = nType === "COMPETITOR_OOS"
                const isAds = nType.includes("ADS")
                const isScraping = nType.includes("SCRAPING")
                const isSub = nType.includes("SUBSCRIPTION")
                const isMarketBrandOOS = nType === "MARKET_BRAND_OOS"
                const isMarketPriceSpike = nType === "MARKET_PRICE_SPIKE"
                const isMarketShelfDrop = nType === "MARKET_SHELF_DROP"
                const isMarketSentimentShift = nType === "MARKET_SENTIMENT_SHIFT"
                const FeedIcon = isUndercut ? TrendingDown : isTrustDrop ? TrendingDown : isStockShortage ? AlertTriangle : isNewCompetitor ? Zap : isStockOpportunity ? CheckCircle2 : isCompetitorOos ? XCircle : isDispersion ? BarChart3 : isAds ? DollarSign : isScraping ? Package : isSub ? Shield : isMarketBrandOOS ? XCircle : isMarketPriceSpike ? TrendingUp : isMarketShelfDrop ? TrendingDown : isMarketSentimentShift ? TrendingDown : Bell
                const feedColor = isUndercut ? "text-red-500 bg-red-50 dark:bg-red-950/30" : isStockShortage ? "text-amber-500 bg-amber-50 dark:bg-amber-950/30" : isTrustDrop ? "text-orange-500 bg-orange-50 dark:bg-orange-950/30" : isNewCompetitor ? "text-blue-500 bg-blue-50 dark:bg-blue-950/30" : isStockOpportunity ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : isCompetitorOos ? "text-slate-500 bg-slate-50 dark:bg-slate-950/30" : isDispersion ? "text-violet-500 bg-violet-50 dark:bg-violet-950/30" : isAds ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : isMarketBrandOOS ? "text-red-500 bg-red-50 dark:bg-red-950/30" : isMarketPriceSpike ? "text-orange-500 bg-orange-50 dark:bg-orange-950/30" : isMarketShelfDrop ? "text-rose-500 bg-rose-50 dark:bg-rose-950/30" : isMarketSentimentShift ? "text-amber-500 bg-amber-50 dark:bg-amber-950/30" : "text-blue-500 bg-blue-50 dark:bg-blue-950/30"
                const nid = Number(n.id)
                return (
                  <div key={String(n.id ?? n.created_at)} className="flex items-start gap-3 rounded-xl border border-border/50 bg-card p-3">
                    <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${feedColor}`}>
                      <FeedIcon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{String(n.message ?? "").slice(0, 150)}</p>
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="size-3" />
                        {timeAgo(n.created_at as string | undefined | null)}
                        <Badge variant="outline" className="text-[8px] ml-1">{String(n.severity ?? "info")}</Badge>
                      </p>
                      {Boolean((isUndercut || isStockShortage || isNewCompetitor || isStockOpportunity || isCompetitorOos || isTrustDrop) && n.product_listing_id) && (
                        <Link
                          href={`/B2B/dashboard/comparison?listingId=${n.product_listing_id as number}`}
                          className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Eye className="size-3" />
                          {isUndercut ? "Compare prices" : isTrustDrop ? "View trust details" : isNewCompetitor ? "View competitor" : "View listing"}
                        </Link>
                      )}
                      {isMarketBrandOOS && (
                        <Link href="/B2B/dashboard/distribution-coverage" className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                          <Eye className="size-3" /> View stock
                        </Link>
                      )}
                      {isMarketPriceSpike && (
                        <Link href="/B2B/dashboard/price-dispersion" className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                          <Eye className="size-3" /> View dispersion
                        </Link>
                      )}
                      {isMarketShelfDrop && (
                        <Link href="/B2B/dashboard/share-of-shelf" className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                          <Eye className="size-3" /> View shelf
                        </Link>
                      )}
                      {isMarketSentimentShift && (
                        <Link href="/B2B/dashboard/reviews-sentiment" className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                          <Eye className="size-3" /> View sentiment
                        </Link>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDismissedAlerts((prev) => new Set(prev).add(nid))
                        handleDismissAlert(nid)
                      }}
                      className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Dismiss alert"
                    >
                      <XCircle className="size-3.5" />
                    </button>
                  </div>
                )
              })
            })()}
          </CardContent>
        </Card>
      )}

      {/* Price Position Range Chart (vendor only) */}
      {mode === "vendor" && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-4 text-blue-500" />
              Your Price Position
            </CardTitle>
            <CardDescription>Where your prices sit in the market range per product.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {(() => {
              const topListings = (metrics?.top_listings ?? []) as Array<Record<string, unknown>>
              const display = topListings.slice(0, 6)
              return display.length > 0 ? display.map((listing, i) => {
                const price = typeof listing.price === "number" ? listing.price : 0
                const cheapest = typeof listing.cheapest_price === "number" ? listing.cheapest_price : null
                const min = cheapest !== null ? Math.min(cheapest, price) : price * 0.8
                const max = price > min ? price * 1.3 : price * 1.5
                const range = Math.max(max - min, 1)
                const position = ((price - min) / range) * 100
                const rank = typeof listing.vendor_rank === "number" ? listing.vendor_rank : null
                const total = typeof listing.total_sellers === "number" ? listing.total_sellers : null
                const isCheapest = rank === 1
                const isMostExpensive = rank === total && total !== null

                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium truncate max-w-[200px]">{String(listing.productName ?? "Product")}</span>
                      <span className="font-mono font-bold">{price.toFixed(2)} DT</span>
                    </div>
                    <div className="relative h-4 w-full">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-200 via-amber-200 to-red-200 dark:from-emerald-950 dark:via-amber-950 dark:to-red-950" />
                      <div className="absolute inset-0 rounded-full border border-border/30" />
                      <div
                        className="absolute top-1/2 size-3 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-white shadow-lg transition-all"
                        style={{
                          left: `${Math.max(2, Math.min(98, position))}%`,
                          backgroundColor: isCheapest ? "#22c55e" : isMostExpensive ? "#ef4444" : "#3b82f6",
                        }}
                      />
                      <span
                        className="absolute -top-4 -translate-x-1/2 text-[9px] font-bold text-muted-foreground whitespace-nowrap"
                        style={{ left: `${Math.max(2, Math.min(98, position))}%` }}
                      >
                        {rank && total ? `${rank}${ordinalSuffix(rank)}` : ""}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{cheapest !== null ? `${cheapest.toFixed(2)} DT` : "min"}</span>
                      <span>{max.toFixed(2)} DT</span>
                    </div>
                  </div>
                )
              }) : (
                <div className="py-8 text-center text-sm text-muted-foreground">Add listings to see your price position.</div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Per-Product Stock Status Table (vendor only) */}
      {mode === "vendor" && stockMonitoring.length > 0 && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="size-4 text-emerald-500" />
              Product Stock Status
            </CardTitle>
            <CardDescription>Stock health overview across your product catalog.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium text-center">Stock Status</th>
                    <th className="px-4 py-3 font-medium text-center">OOS Rate</th>
                    <th className="px-4 py-3 font-medium text-center">Trust</th>
                    <th className="px-4 py-3 font-medium text-center">Opportunities</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {stockMonitoring.slice(0, 10).map((item, i) => {
                    const oosRate = Number(item.out_of_stock_rate ?? 0)
                    const oppCount = opportunities.filter((o) => String(o.product_name ?? "").toLowerCase() === String(item.product_name ?? "").toLowerCase()).length
                    return (
                      <tr key={(item.product_id as number | undefined) ?? i} className="transition-colors hover:bg-muted/20">
                        <td className="max-w-[200px] truncate px-4 py-3 font-medium">{String(item.product_name ?? "-")}</td>
                        <td className="px-4 py-3 text-center">
                          {oosRate >= 100 ? (
                            <Badge variant="destructive" className="text-[10px]"><XCircle className="mr-0.5 size-3" /> Out of Stock</Badge>
                          ) : oosRate > 0 ? (
                            <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"><AlertTriangle className="mr-0.5 size-3" /> Partial</Badge>
                          ) : (
                            <Badge variant="default" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"><CheckCircle2 className="mr-0.5 size-3" /> In Stock</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-mono font-bold ${oosRate > 50 ? "text-red-600" : oosRate > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                            {oosRate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {typeof item.trust_score === "number" && item.trust_score > 0 ? (
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                              item.trust_score >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" :
                              item.trust_score >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" :
                              "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                            }`}>{Number(item.trust_score).toFixed(0)}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {oppCount > 0 ? (
                            <Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">{oppCount}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  )
}

