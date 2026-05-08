"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts"
import {
  AlertTriangle, ArrowRight, BarChart3, Bell, CheckCircle2, Clock, DollarSign, Download, Eye,
  FileText, Lightbulb, Package, RefreshCw, Shield, ShoppingCart, TrendingDown, TrendingUp, XCircle, Zap,
} from "lucide-react"

import { useDemo } from "./layout-client"
import { DEMO_HEALTH_SCORE, DEMO_TRUST_SCORE_HISTORY } from "@/lib/demo-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8", "#7c3aed"]

function fmt(value: unknown): string {
  if (typeof value === "number") return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)
  return "-"
}

function timeAgo(dateStr: string | undefined | null): string {
  if (!dateStr) return ""
  const now = Date.now()
  const diff = now - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return s[(v - 20) % 10] ?? s[v] ?? s[0]
}

export default function DemoOverviewPage() {
  const { summary, mode, planType, isGold } = useDemo()
  const metrics = summary.metrics as Record<string, any>
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<number>>(new Set())
  const healthScore = DEMO_HEALTH_SCORE
  const trustScoreTrend = DEMO_TRUST_SCORE_HISTORY

  const planLabel = "Gold"
  const productsCount = Number(metrics?.products_count ?? 0)
  const newProductsThisWeek = Number(metrics?.new_products_this_week ?? 0)
  const listingsCount = Number(metrics?.listings_count ?? 0)
  const avgTrust = metrics?.average_trust_score
  const inStock = Number(metrics?.in_stock_count ?? 0)
  const outOfStock = Number(metrics?.out_of_stock_count ?? 0)
  const notificationsCount = Number(metrics?.notifications_count ?? 0)

  const stockData = [
    { name: "In Stock", value: inStock, color: "#22c55e" },
    { name: "Out of Stock", value: outOfStock, color: "#ef4444" },
  ].filter((d) => d.value > 0)

  const chartData =
    mode === "market"
      ? ((metrics?.share_of_shelf ?? []) as Array<Record<string, any>>).slice(0, 6).map((item: any) => ({
          name: String(item.category ?? "Category"),
          value: Number(item.share_of_shelf ?? 0),
        }))
      : ((metrics?.competitor_pricing ?? []) as Array<Record<string, any>>).slice(0, 6).map((item: any) => ({
          name: String(item.product_name ?? item.product_id ?? "Product").slice(0, 16),
          value: Math.abs(Number(item.gap_to_cheapest ?? 0)),
        }))

  const notifications = (summary.notifications ?? []) as Array<Record<string, any>>
  const opportunities = (metrics?.opportunities ?? []) as Array<Record<string, any>>
  const demandIntel = metrics?.demand_intelligence as Record<string, any> | undefined
  const demandQueries = (demandIntel?.top_queries ?? {}) as Record<string, number>
  const zeroResults = (demandIntel?.zero_result_queries ?? {}) as Record<string, number>
  const stockMonitoring = (metrics?.stock_monitoring ?? []) as Array<Record<string, any>>

  const handleExportDashboard = () => {
    const lines = [
      "Metric,Value",
      `Products,${productsCount}`,
      `New This Week,${newProductsThisWeek}`,
      `Listings,${listingsCount}`,
      `Avg Trust Score,${avgTrust ?? "-"}`,
      `In Stock,${inStock}`,
      `Out of Stock,${outOfStock}`,
      `Active Alerts,${notificationsCount}`,
      `Opportunities,${opportunities.length}`,
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `dashboard-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/50 bg-gradient-to-br from-indigo-950/95 via-slate-900/95 to-violet-950/95 p-6 text-white shadow-sm dark:from-indigo-950 dark:via-slate-950 dark:to-violet-950">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{summary.user?.company_name ?? "Demo Workspace"}</h1>
              <Badge className="rounded-full bg-amber-500/20 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 ring-1 ring-amber-500/30">
                {planLabel}
              </Badge>
              <Badge className="rounded-full bg-emerald-500/20 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 ring-1 ring-emerald-500/30">
                Active
              </Badge>
            </div>
            <p className="text-sm text-indigo-200/70">
              {mode === "market" ? "Market Intelligence Dashboard" : "Vendor Performance Dashboard"}
              <span className="ml-3 text-xs text-indigo-300/50">Demo mode</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleExportDashboard} className="h-8 gap-1.5 bg-white/10 text-xs text-white hover:bg-white/20">
              <Download className="size-3.5" />
              Export
            </Button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Products", value: productsCount, sub: newProductsThisWeek > 0 ? `+${newProductsThisWeek} this week` : null, color: "text-indigo-300" },
            { label: "Listings", value: listingsCount, sub: null, color: "text-violet-300" },
            { label: "Avg Trust Score", value: avgTrust, sub: "out of 100", color: "text-emerald-300" },
            { label: "Active Alerts", value: notificationsCount, sub: "needs attention", color: notificationsCount > 0 ? "text-amber-300" : "text-emerald-300" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-200/60">{item.label}</p>
              <p className={`mt-0.5 text-2xl font-black tracking-tight ${item.color}`}>{fmt(item.value)}</p>
              {item.sub && <p className="text-[10px] text-indigo-200/50">{item.sub}</p>}
            </div>
          ))}
        </div>
      </section>

      {healthScore?.overall != null && mode === "vendor" && (
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="grid gap-4 lg:grid-cols-[1fr_2px_2fr]">
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
                          { label: "Trust", value: Number(healthScore.trust_dimension ?? 0) },
                          { label: "Pricing", value: Number(healthScore.pricing_dimension ?? 0) },
                          { label: "Stock", value: Number(healthScore.stock_dimension ?? 0) },
                        ].map((d) => {
                          const c = d.value >= 75 ? "text-emerald-500" : d.value >= 50 ? "text-amber-500" : "text-red-500"
                          return (
                            <div key={d.label} className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-1.5">
                              <span className="font-medium text-muted-foreground">{d.label}</span>
                              <span className={`font-bold ${c}`}>{d.value}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
              </div>
              <div className="hidden lg:block w-px bg-border/50 self-stretch my-4" />
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
                    <p className="text-lg font-bold text-indigo-500">{opportunities.length}</p>
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

      <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4 text-indigo-500" />
              {mode === "market" ? "Share of Shelf" : "Price Gap to Competitors"}
            </CardTitle>
            <CardDescription>
              {mode === "market" ? "Your brand's percentage share per category." : "Gap between your price and the cheapest competitor."}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} className="fill-muted-foreground" />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} className="fill-muted-foreground" />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: "12px" }} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
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
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Stock Overview</CardTitle>
            </CardHeader>
            <CardContent className="h-40">
              {stockData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stockData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={4}>
                      {stockData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No stock data</div>
              )}
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Latest Alerts</CardTitle>
              <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                <Link href="/B2B/demo/alerts">View all <ArrowRight className="ml-1 size-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {notifications.slice(0, 3).map((n: any) => (
                <div key={String(n.id ?? n.created_at)} className="rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium">{String(n.type ?? "Alert")}</p>
                    <Badge variant="outline" className="text-[10px]">{String(n.severity ?? "info")}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{String(n.message ?? "-")}</p>
                </div>
              ))}
              {notifications.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">No alerts yet</p>}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-4 text-emerald-500" />
              Trust Score Trend
            </CardTitle>
            <CardDescription>Daily average trust score across your listings over the last 90 days.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {trustScoreTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trustScoreTrend.map((d: any) => ({ date: d.date, score: Number(d.avg_score ?? 0), count: Number(d.listing_count ?? 0) }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} className="fill-muted-foreground" />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} className="fill-muted-foreground" />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
                    formatter={(value: number) => [`${value.toFixed(2)} / 100`, "Avg Trust Score"]} />
                  <Line type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} name="Avg Trust Score" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <div className="text-center">
                  <Shield className="mx-auto mb-2 size-8 text-muted-foreground/40" />
                  <p>No trust score history yet</p>
                  <p className="mt-1 text-xs text-muted-foreground/60">Data appears after the next scheduled recalculation.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {mode === "vendor" ? (
          <Card className="border-border/50 bg-gradient-to-br from-white to-amber-50/30 shadow-sm dark:from-slate-900 dark:to-amber-950/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Lightbulb className="size-5" />
                Growth Opportunities
              </CardTitle>
              <CardDescription>Intelligent recommendations based on market gaps and stock status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {opportunities.length > 0 ? opportunities.map((op: any, i: number) => {
                const oppType = String(op.type ?? "")
                const isStock = oppType === "STOCK_OPPORTUNITY"
                const isPrice = oppType === "PRICE_OPPORTUNITY"
                const Icon = isStock ? ShoppingCart : isPrice ? DollarSign : Zap
                const bgColor = isStock ? "bg-emerald-100 dark:bg-emerald-900/30" : isPrice ? "bg-blue-100 dark:bg-blue-900/30" : "bg-amber-100 dark:bg-amber-900/30"
                const iconColor = isStock ? "text-emerald-600 dark:text-emerald-400" : isPrice ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"
                return (
                  <div key={i} className="flex items-start gap-4 rounded-xl border border-amber-100 bg-white/50 p-4 shadow-sm dark:border-amber-900/30 dark:bg-slate-950/50">
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${bgColor}`}>
                      <Icon className={`size-5 ${iconColor}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{String(op.product_name ?? "Opportunity")}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{String(op.reason ?? "Competitive advantage detected.")}</p>
                      <Badge variant="outline" className={`mt-2 ${isStock ? "border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400" : isPrice ? "border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400" : "border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400"}`}>
                        {isStock ? "Stock Opportunity" : isPrice ? "Pricing" : "Trust Alert"}
                      </Badge>
                    </div>
                  </div>
                )
              }) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <CheckCircle2 className="mb-3 size-10 opacity-20" />
                  <p className="text-sm">No new opportunities detected today.</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50 bg-gradient-to-br from-white to-indigo-50/30 shadow-sm dark:from-slate-900 dark:to-indigo-950/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Zap className="size-5" />
                Demand Intelligence
              </CardTitle>
              <CardDescription>Top search trends and unfulfilled demand in your categories.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Trending Queries</h4>
                {Object.entries(demandQueries).slice(0, 5).map(([query, count]) => (
                  <div key={query} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                    <span className="text-xs font-medium capitalize">{query}</span>
                    <Badge variant="secondary" className="text-[10px]">{count} hits</Badge>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-red-500/70">Unfulfilled Demand</h4>
                {Object.entries(zeroResults).slice(0, 5).map(([query, count]) => (
                  <div key={query} className="flex items-center justify-between rounded-lg bg-red-50/50 px-3 py-2 dark:bg-red-950/10">
                    <span className="text-xs font-medium capitalize text-red-700 dark:text-red-400">{query}</span>
                    <Badge variant="outline" className="border-red-200 text-[10px] text-red-600 dark:border-red-900">{count} missed</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-5 text-emerald-500" />
              Quick Workspace Stats
            </CardTitle>
            <CardDescription>Real-time health of your product portfolio.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stock Stability</p>
                <p className="mt-1 text-2xl font-bold">{inStock > 0 ? Math.round((inStock / (inStock + outOfStock)) * 100) : 0}%</p>
                <p className="text-[10px] text-muted-foreground">Availability Index</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Market Trust</p>
                <p className="mt-1 text-2xl font-bold">{fmt(avgTrust)}</p>
                <p className="text-[10px] text-muted-foreground">Avg. Product Score</p>
              </div>
            </div>
            <div className="rounded-2xl border border-border/50 bg-indigo-50/50 p-4 dark:bg-indigo-950/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Active Monitoring</p>
                  <p className="text-xs text-muted-foreground">Your listings are being tracked across 12 marketplaces.</p>
                </div>
                <CheckCircle2 className="size-6 text-indigo-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {mode === "vendor" && (
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-indigo-500" />
              <CardTitle className="text-sm">Smart Alerts</CardTitle>
              {(() => {
                const critical = notifications.filter((n: any) => String(n.severity ?? "").toUpperCase() === "CRITICAL" && !dismissedAlerts.has(Number(n.id))).length
                return critical > 0 ? <Badge className="bg-red-500 text-[10px] text-white">{critical} critical</Badge> : null
              })()}
            </div>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
              <Link href="/B2B/demo/alerts">View all <ArrowRight className="ml-1 size-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {(() => {
              const active = notifications.filter((n: any) => !dismissedAlerts.has(Number(n.id)))
              if (active.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle2 className="mb-3 size-10 text-emerald-400/40" />
                    <p className="text-sm font-medium text-muted-foreground">All clear</p>
                    <p className="mt-1 text-xs text-muted-foreground/70">No alerts need your attention right now.</p>
                  </div>
                )
              }
              const severityRank: Record<string, number> = { CRITICAL: 0, WARNING: 1, SUCCESS: 2, INFO: 3 }
              const sorted = [...active].sort((a: any, b: any) => {
                const ra = severityRank[String(a.severity ?? "").toUpperCase()] ?? 99
                const rb = severityRank[String(b.severity ?? "").toUpperCase()] ?? 99
                if (ra !== rb) return ra - rb
                return String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))
              })
              return sorted.slice(0, 8).map((n: any) => {
                const nType = String(n.type ?? "")
                const isUndercut = nType === "COMPETITOR_UNDERCUT"
                const isStockShortage = nType === "STOCK_SHORTAGE"
                const FeedIcon = isUndercut ? TrendingDown : isStockShortage ? AlertTriangle : Bell
                const feedColor = isUndercut ? "text-red-500 bg-red-50 dark:bg-red-950/30" : isStockShortage ? "text-amber-500 bg-amber-50 dark:bg-amber-950/30" : "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
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
                        {timeAgo(n.created_at)}
                        <Badge variant="outline" className="text-[8px] ml-1">{String(n.severity ?? "info")}</Badge>
                      </p>
                    </div>
                    <button type="button" onClick={() => setDismissedAlerts((prev) => new Set(prev).add(nid))}
                      className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Dismiss">
                      <XCircle className="size-3.5" />
                    </button>
                  </div>
                )
              })
            })()}
          </CardContent>
        </Card>
      )}

      {mode === "vendor" && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-4 text-indigo-500" />
              Your Price Position
            </CardTitle>
            <CardDescription>Where your prices sit in the market range per product.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {(() => {
              const topListings = (metrics?.top_listings ?? []) as Array<Record<string, any>>
              return topListings.slice(0, 6).map((listing: any, i: number) => {
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
                      <div className="absolute top-1/2 size-3 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-white shadow-lg transition-all"
                        style={{ left: `${Math.max(2, Math.min(98, position))}%`, backgroundColor: isCheapest ? "#22c55e" : isMostExpensive ? "#ef4444" : "#6366f1" }} />
                      <span className="absolute -top-4 -translate-x-1/2 text-[9px] font-bold text-muted-foreground whitespace-nowrap"
                        style={{ left: `${Math.max(2, Math.min(98, position))}%` }}>
                        {rank && total ? `${rank}${ordinalSuffix(rank)}` : ""}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{cheapest !== null ? `${cheapest.toFixed(2)} DT` : "min"}</span>
                      <span>{max.toFixed(2)} DT</span>
                    </div>
                  </div>
                )
              })
            })()}
          </CardContent>
        </Card>
      )}

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
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {stockMonitoring.slice(0, 10).map((item: any, i: number) => {
                    const oosRate = Number(item.out_of_stock_rate ?? 0)
                    return (
                      <tr key={i} className="transition-colors hover:bg-muted/20">
                        <td className="max-w-[200px] truncate px-4 py-3 font-medium">{String(item.product_name ?? "-")}</td>
                        <td className="px-4 py-3 text-center">
                          {oosRate >= 100 ? <Badge variant="destructive" className="text-[10px]"><XCircle className="mr-0.5 size-3" /> Out of Stock</Badge>
                            : oosRate > 0 ? <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"><AlertTriangle className="mr-0.5 size-3" /> Partial</Badge>
                            : <Badge variant="default" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"><CheckCircle2 className="mr-0.5 size-3" /> In Stock</Badge>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-mono font-bold ${oosRate > 50 ? "text-red-600" : oosRate > 0 ? "text-amber-600" : "text-emerald-600"}`}>{oosRate}%</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {typeof item.trust_score === "number" && item.trust_score > 0 ? (
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${item.trust_score >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : item.trust_score >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"}`}>
                              {Number(item.trust_score).toFixed(0)}
                            </span>
                          ) : <span className="text-xs text-muted-foreground">&mdash;</span>}
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(() => {
          const undercutCount = notifications.filter((n: any) => String(n.type ?? "") === "COMPETITOR_UNDERCUT").length
          const stockAlertCount = notifications.filter((n: any) => String(n.type ?? "") === "STOCK_SHORTAGE").length
          return [
            { title: "Reports", desc: undercutCount > 0 ? `${undercutCount} products need pricing review` : "Generate and download business reports", href: "/B2B/demo/reports", icon: FileText, color: "text-violet-500", bgHover: "hover:bg-violet-50/80 dark:hover:bg-violet-950/30" },
            { title: mode === "market" ? "Share of Shelf" : "Competitor Pricing", desc: mode === "market" ? "Category shelf analysis" : "Price comparison analysis", href: mode === "market" ? "/B2B/demo/share-of-shelf" : "/B2B/demo/competitor-pricing", icon: TrendingUp, color: "text-indigo-500", bgHover: "hover:bg-indigo-50/80 dark:hover:bg-indigo-950/30" },
            { title: mode === "market" ? "Stock Intelligence" : "Stock Monitoring", desc: stockAlertCount > 0 ? `${stockAlertCount} stock alerts to review` : "Availability and stock-out tracking", href: mode === "market" ? "/B2B/demo/stock-intelligence" : "/B2B/demo/stock-monitoring", icon: AlertTriangle, color: "text-amber-500", bgHover: "hover:bg-amber-50/80 dark:hover:bg-amber-950/30" },
            { title: "Watchlist", desc: "Follow and monitor competitor products", href: "/B2B/demo/watchlist", icon: ShoppingCart, color: "text-emerald-500", bgHover: "hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30" },
          ].map((action) => (
            <Card key={action.title} className={`border-border/50 shadow-sm ${action.bgHover}`}>
              <CardContent className="flex flex-col items-start p-6">
                <div className="mb-4 rounded-2xl bg-background/80 p-3.5 shadow-sm ring-1 ring-border/50 backdrop-blur-sm">
                  <action.icon className={`size-6 ${action.color}`} />
                </div>
                <h3 className="font-bold tracking-tight">{action.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{action.desc}</p>
                <Button variant="link" asChild className="mt-4 h-auto p-0 text-xs font-semibold">
                  <Link href={action.href}>Explore <ArrowRight className="ml-1.5 size-3.5" /></Link>
                </Button>
              </CardContent>
            </Card>
          ))
        })()}
      </section>
    </div>
  )
}
