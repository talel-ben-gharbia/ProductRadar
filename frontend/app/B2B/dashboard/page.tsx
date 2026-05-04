"use client"

import Link from "next/link"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  CheckCircle2,
  FileText,
  Lightbulb,
  Package,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import B2BSubscriptionBanner from "@/components/B2B/b2b-subscription-banner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8", "#7c3aed"]

function fmt(value: unknown): string {
  if (typeof value === "number") return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)
  return "-"
}

export default function B2BOverviewPage() {
  const { summary, mode, planType, isGold } = useB2B()
  const metrics = summary?.metrics as Record<string, unknown> | undefined

  // Clean up plan label: B2B_GOLD -> Gold, B2B_SILVER -> Silver
  const planLabel = planType
    ? planType.replace(/^B2B_/i, "").charAt(0).toUpperCase() + planType.replace(/^B2B_/i, "").slice(1).toLowerCase()
    : "—"

  const productsCount = Number(metrics?.products_count ?? 0)
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
      ? ((metrics?.share_of_shelf ?? []) as Array<Record<string, unknown>>).slice(0, 6).map((item) => ({
          name: String(item.category ?? "Category"),
          value: Number(item.share_of_shelf ?? 0),
        }))
      : ((metrics?.competitor_pricing ?? []) as Array<Record<string, unknown>>).slice(0, 6).map((item) => ({
          name: String(item.product_name ?? item.product_id ?? "Product").slice(0, 16),
          value: Math.abs(Number(item.gap_to_cheapest ?? 0)),
        }))

  const notifications = (summary?.notifications ?? []) as Array<Record<string, unknown>>
  const opportunities = (metrics?.opportunities ?? []) as Array<Record<string, unknown>>
  const demandIntel = metrics?.demand_intelligence as Record<string, any> | undefined
  const demandQueries = (demandIntel?.top_queries ?? {}) as Record<string, number>
  const zeroResults = (demandIntel?.zero_result_queries ?? {}) as Record<string, number>

  return (
    <div className="space-y-6">
      {/* Subscription Status Banner */}
      <B2BSubscriptionBanner />

      {/* Hero header */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-950 p-8 text-white shadow-2xl dark:from-indigo-950 dark:via-slate-950 dark:to-violet-950">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute -left-32 -top-32 size-96 rounded-full bg-indigo-500/20 blur-[120px]"></div>
        <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-violet-500/20 blur-[120px]"></div>
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge className="rounded-full bg-white/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-white/90 shadow-sm backdrop-blur-md ring-1 ring-white/20">
              {mode === "market" ? "Market Intelligence" : "Seller Intelligence"}
            </Badge>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl drop-shadow-sm">
              {summary?.user?.company_name ?? "B2B Workspace"}
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-indigo-100/70">
              {mode === "market"
                ? "Monitor your brand's presence, pricing dispersion, shelf share, and competitor activity across the entire marketplace."
                : "Track your listings, competitor pricing, stock availability, and market opportunities in real-time."}
            </p>
          </div>
          <div className="grid gap-4 text-sm text-white/80 sm:grid-cols-3 lg:text-right">
            <div className="rounded-xl bg-white/5 p-3 backdrop-blur-sm ring-1 ring-white/10">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-200/60">Plan Tier</p>
              <p className={`mt-1 font-black ${isGold ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "text-indigo-300 drop-shadow-[0_0_8px_rgba(165,180,252,0.5)]"}`}>{planLabel}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3 backdrop-blur-sm ring-1 ring-white/10">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-200/60">Status</p>
              <p className="mt-1 font-bold text-emerald-400">{summary?.user?.b2b_status ?? "—"}</p>
            </div>
            {summary?.subscription?.days_remaining != null && (
              <div className="rounded-xl bg-white/5 p-3 backdrop-blur-sm ring-1 ring-white/10">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-200/60">Days Left</p>
                <p className="mt-1 font-bold">{String(summary.subscription.days_remaining)}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Products", value: productsCount, icon: Package, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/40" },
          { label: "Listings", value: listingsCount, icon: BarChart3, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/40" },
          { label: "Avg Trust Score", value: avgTrust, icon: Shield, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
          { label: "Active Alerts", value: notificationsCount, icon: Bell, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40" },
        ].map((kpi) => (
          <Card key={kpi.label} className="group relative overflow-hidden border-border/50 bg-background shadow-sm transition-all duration-500 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/30">
            <div className={`absolute -right-6 -top-6 size-32 rounded-full opacity-20 transition-transform duration-700 ease-out group-hover:scale-[2.5] ${kpi.bg}`} />
            <CardContent className="relative z-10 flex flex-col gap-3 p-6">
              <div className="flex items-center justify-between">
                <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${kpi.bg} ring-1 ring-border/50 backdrop-blur-sm`}>
                  <kpi.icon className={`size-6 ${kpi.color}`} />
                </div>
                <Badge variant="outline" className="border-border/50 text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
                  {kpi.label}
                </Badge>
              </div>
              <div className="mt-2">
                <p className="text-4xl font-black tracking-tight">{fmt(kpi.value)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Charts + Alerts Row */}
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
          {/* Stock Donut */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Stock Overview</CardTitle>
            </CardHeader>
            <CardContent className="h-40">
              {stockData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stockData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={4}>
                      {stockData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No stock data</div>
              )}
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

      {/* Insights Row: Opportunities for Vendor / Demand for Market */}
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
              {opportunities.length > 0 ? (
                opportunities.map((op, i) => (
                  <div key={i} className="flex items-start gap-4 rounded-xl border border-amber-100 bg-white/50 p-4 shadow-sm dark:border-amber-900/30 dark:bg-slate-950/50">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                      <Zap className="size-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{String(op.product_name ?? "Opportunity")}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{String(op.reason ?? "Competitive advantage detected.")}</p>
                      <Badge variant="outline" className="mt-2 border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400">
                        {String(op.seller_name ?? "Market Signal")}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
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
                {Object.keys(demandQueries).length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">No trends yet</p>}
              </div>
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-red-500/70">Unfulfilled Demand</h4>
                {Object.entries(zeroResults).slice(0, 5).map(([query, count]) => (
                  <div key={query} className="flex items-center justify-between rounded-lg bg-red-50/50 px-3 py-2 dark:bg-red-950/10">
                    <span className="text-xs font-medium capitalize text-red-700 dark:text-red-400">{query}</span>
                    <Badge variant="outline" className="border-red-200 text-[10px] text-red-600 dark:border-red-900">{count} missed</Badge>
                  </div>
                ))}
                {Object.keys(zeroResults).length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">No missed opportunities</p>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Breakdown Section */}
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

      {/* Quick Action Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { title: "Reports", desc: "Generate and download business reports", href: "/B2B/dashboard/reports", icon: FileText, color: "text-violet-500 dark:text-violet-400", bgHover: "hover:bg-violet-50/80 dark:hover:bg-violet-950/30 hover:border-violet-200 dark:hover:border-violet-800" },
          { title: mode === "market" ? "Share of Shelf" : "Competitor Pricing", desc: mode === "market" ? "Category shelf analysis" : "Price comparison analysis", href: mode === "market" ? "/B2B/dashboard/share-of-shelf" : "/B2B/dashboard/competitor-pricing", icon: TrendingUp, color: "text-indigo-500 dark:text-indigo-400", bgHover: "hover:bg-indigo-50/80 dark:hover:bg-indigo-950/30 hover:border-indigo-200 dark:hover:border-indigo-800" },
          { title: mode === "market" ? "Stock Intelligence" : "Stock Monitoring", desc: "Availability and stock-out tracking", href: mode === "market" ? "/B2B/dashboard/stock-intelligence" : "/B2B/dashboard/stock-monitoring", icon: AlertTriangle, color: "text-amber-500 dark:text-amber-400", bgHover: "hover:bg-amber-50/80 dark:hover:bg-amber-950/30 hover:border-amber-200 dark:hover:border-amber-800" },
          { title: "Scraping Requests", desc: "Request new product/category tracking", href: "/B2B/dashboard/scraping-requests", icon: Package, color: "text-emerald-500 dark:text-emerald-400", bgHover: "hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30 hover:border-emerald-200 dark:hover:border-emerald-800" },
        ].map((action) => (
          <Card key={action.title} className={`group border-border/50 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${action.bgHover}`}>
            <CardContent className="flex flex-col items-start p-6">
              <div className="mb-4 rounded-2xl bg-background/80 p-3.5 shadow-sm ring-1 ring-border/50 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 group-hover:shadow-md">
                <action.icon className={`size-6 ${action.color}`} />
              </div>
              <h3 className="font-bold tracking-tight">{action.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{action.desc}</p>
              <Button variant="link" asChild className="mt-4 h-auto p-0 text-xs font-semibold">
                <Link href={action.href}>
                  Explore Dashboard <ArrowRight className="ml-1.5 size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  )
}

