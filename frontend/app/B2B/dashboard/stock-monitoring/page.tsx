"use client"

import React, { useMemo, useState, useEffect } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Clock, DollarSign, Filter, Package, Search, Shield, Store, XCircle, Zap } from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import B2BErrorState from "@/components/B2B/b2b-error-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type StockItem = { product_id?: number; product_name?: string; category?: string; out_of_stock_rate?: number; trust_score?: number; listing_url?: string; updated_at?: string; sellers?: SellerStock[] }
type SellerStock = { seller_id: number; seller_name: string; in_stock: boolean; price: number | null; trust_score: number | null; is_vendor: boolean }

function StockBar({ rate }: { rate: number }) {
  const color = rate === 0 ? "bg-emerald-500" : rate <= 10 ? "bg-amber-500" : "bg-red-500"
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, rate)}%` }} />
      </div>
      <span className={`font-mono text-xs font-bold ${color.replace("bg-", "text-")}`}>{rate}%</span>
    </div>
  )
}

function RiskBadge({ rate }: { rate: number }) {
  if (rate === 0) return <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400">Healthy</Badge>
  if (rate <= 10) return <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">Low Risk</Badge>
  if (rate <= 50) return <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Medium Risk</Badge>
  return <Badge variant="destructive" className="text-[10px]">Critical</Badge>
}

export default function StockMonitoringPage() {
  const { summary, loading, error, refresh } = useB2B()
  const metrics = summary?.metrics as Record<string, unknown> | undefined
  const data = ((metrics?.stock_monitoring ?? []) as StockItem[])
  const inStock = Number(metrics?.in_stock_count ?? 0)
  const outOfStock = Number(metrics?.out_of_stock_count ?? 0)
  const total = inStock + outOfStock
  const outOfStockRate = total > 0 ? ((outOfStock / total) * 100).toFixed(1) : "0"
  const opportunities = ((metrics?.opportunities ?? []) as Array<Record<string, unknown>>)

  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [riskFilter, setRiskFilter] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const ITEMS_PER_PAGE = 20

  const categories = useMemo(() =>
    [...new Set(data.map((d) => d.category ?? d.product_name?.split(" ")[0] ?? "General"))],
    [data])

  const filtered = useMemo(() => data.filter((item) => {
    const name = String(item.product_name ?? "").toLowerCase()
    const matchesSearch = !search || name.includes(search.toLowerCase())
    const matchesCategory = !categoryFilter || (item.category ?? "").toLowerCase() === categoryFilter.toLowerCase()
    const rate = Number(item.out_of_stock_rate ?? 0)
    const matchesRisk = !riskFilter || (
      riskFilter === "healthy" ? rate === 0 :
      riskFilter === "low" ? rate > 0 && rate <= 10 :
      riskFilter === "medium" ? rate > 10 && rate <= 50 :
      riskFilter === "critical" ? rate > 50 : true
    )
    return matchesSearch && matchesCategory && matchesRisk
  }).sort((a, b) => {
    if (!sortBy) return 0
    const valA = sortBy === "trust_score" ? Number(a.trust_score ?? 0) : Number(a.out_of_stock_rate ?? 0)
    const valB = sortBy === "trust_score" ? Number(b.trust_score ?? 0) : Number(b.out_of_stock_rate ?? 0)
    return sortOrder === "asc" ? valA - valB : valB - valA
  }), [data, search, categoryFilter, riskFilter, sortBy, sortOrder])

  const totalPages = useMemo(() => Math.ceil(filtered.length / ITEMS_PER_PAGE), [filtered])
  const paginatedData = useMemo(() => filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  ), [filtered, page])

  const pieData = useMemo(() => [
    { name: "In Stock", value: inStock, color: "#22c55e" },
    { name: "Out of Stock", value: outOfStock, color: "#ef4444" },
  ].filter((d) => d.value > 0), [inStock, outOfStock])

  useEffect(() => {
    setPage(1)
  }, [search, categoryFilter, riskFilter])

  if (error && !summary) {
    return <B2BErrorState message={error} onRetry={refresh} />
  }

  if (loading && !summary) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted/30" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Monitoring</h1>
          <p className="text-sm text-muted-foreground">Track product availability, stock-out rates, and market opportunities.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1.5">
          <Filter className="size-3.5" /> Filters
        </Button>
      </div>

      {showFilters && (
        <Card className="border-border/50">
          <CardContent className="grid gap-4 p-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Category</label>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">All Categories</option>
                {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Risk Level</label>
              <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">All</option>
                <option value="healthy">Healthy (0%)</option>
                <option value="low">Low Risk (1-10%)</option>
                <option value="medium">Medium Risk (11-50%)</option>
                <option value="critical">Critical (&gt;50%)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Search Product</label>
              <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9" />
            </div>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40"><CheckCircle2 className="size-5 text-emerald-600" /></div>
            <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">In Stock</p><p className="mt-1 text-2xl font-bold text-emerald-600">{inStock}</p></div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/40"><XCircle className="size-5 text-red-600" /></div>
            <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Out of Stock</p><p className="mt-1 text-2xl font-bold text-red-600">{outOfStock}</p></div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40"><AlertTriangle className="size-5 text-amber-600" /></div>
            <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Out-of-Stock Rate</p><p className="mt-1 text-2xl font-bold">{outOfStockRate}%</p></div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40"><Shield className="size-5 text-indigo-600" /></div>
            <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Opportunities</p><p className="mt-1 text-2xl font-bold text-indigo-600">{opportunities.length}</p></div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1.5fr]">
        <Card className="border-border/50 shadow-sm">
          <CardHeader><CardTitle>Stock Distribution</CardTitle></CardHeader>
          <CardContent className="flex h-72 items-center justify-center pb-2">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" key={pieData.length}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="55%" innerRadius={35} outerRadius={85} dataKey="value" paddingAngle={4}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No stock data</div>}
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap className="size-4 text-emerald-500" /> Market Opportunities</CardTitle>
            <CardDescription>Products where you have a competitive advantage (e.g. competitors out of stock).</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 max-h-80 space-y-3 overflow-y-auto">
            {opportunities.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <Shield className="size-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No opportunities detected</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Check back later when competitor stock fluctuates.</p>
              </div>
            ) : (
              opportunities.slice(0, 8).map((opp, i) => (
                <div key={i} className="group/item relative rounded-xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 to-emerald-100/50 px-4 py-3 dark:border-emerald-900/50 dark:from-emerald-950/40 dark:to-emerald-900/20 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-0.5">
                  <div className="absolute -left-px top-2 bottom-2 w-1 rounded-r-md bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  <p className="text-sm font-bold text-emerald-950 dark:text-emerald-100">{String(opp.product_name ?? "Product")}</p>
                  <p className="mt-1 text-xs font-medium text-emerald-800/80 dark:text-emerald-300/80">{String(opp.reason ?? "Opportunity detected")}</p>
                  {typeof opp.seller_name === "string" && opp.seller_name !== "" && (
                    <Badge variant="outline" className="mt-2 text-[10px] bg-white/50 dark:bg-black/20 border-emerald-200 dark:border-emerald-800">
                      Competitor: {String(opp.seller_name)}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Package className="size-4" /> Product Stock Details</CardTitle>
          <CardDescription>
            {filtered.length > ITEMS_PER_PAGE
              ? `Showing ${(page - 1) * ITEMS_PER_PAGE + 1}–${Math.min(page * ITEMS_PER_PAGE, filtered.length)} of ${filtered.length} products`
              : `${filtered.length} product${filtered.length !== 1 ? "s" : ""} in your catalog`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium text-center">Stock Status</th>
                  <th className="cursor-pointer select-none px-4 py-3 font-medium text-center hover:text-foreground" onClick={() => { if (sortBy === "oos") setSortOrder(o => o === "asc" ? "desc" : "asc"); else { setSortBy("oos"); setSortOrder("asc") } }}>
                    OOS Rate {sortBy === "oos" ? (sortOrder === "asc" ? "▲" : "▼") : <span className="text-transparent">◇</span>}
                  </th>
                  <th className="px-4 py-3 font-medium text-center">Risk Level</th>
                  <th className="cursor-pointer select-none px-4 py-3 font-medium text-center hover:text-foreground" onClick={() => { if (sortBy === "trust_score") setSortOrder(o => o === "asc" ? "desc" : "asc"); else { setSortBy("trust_score"); setSortOrder("asc") } }}>
                    Trust Score {sortBy === "trust_score" ? (sortOrder === "asc" ? "▲" : "▼") : <span className="text-transparent">◇</span>}
                  </th>
                  <th className="px-4 py-3 font-medium text-right">Last Updated</th>
                  <th className="px-4 py-3 font-medium text-center">Sellers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Search className="mx-auto mb-2 size-6 text-muted-foreground/40" />
                    No stock data matches your filters
                  </td></tr>
                ) : (
                  paginatedData.map((item, i) => {
                    const rate = Number(item.out_of_stock_rate ?? 0)
                    const pid = item.product_id ?? i
                    const isExpanded = expandedId === pid
                    const sellers = item.sellers ?? []
                    const competitorCount = sellers.filter((s) => !s.is_vendor).length
                    return (
                      <React.Fragment key={pid}>
                        <tr className="transition-colors hover:bg-muted/20">
                          <td className="px-4 py-3 font-medium max-w-[200px] truncate">{String(item.product_name ?? "-")}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant={rate === 0 ? "default" : rate <= 50 ? "secondary" : "destructive"} className="text-[10px]">
                              {rate === 0 ? "In Stock" : rate <= 50 ? "Low Stock" : "Out of Stock"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StockBar rate={rate} />
                          </td>
                          <td className="px-4 py-3 text-center"><RiskBadge rate={rate} /></td>
                          <td className="px-4 py-3 text-center">
                            {typeof item.trust_score === "number" ? (
                              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${item.trust_score >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : item.trust_score >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"}`}>
                                {item.trust_score.toFixed(0)}
                              </span>
                            ) : "-"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="size-3" />
                              {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : "N/A"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {sellers.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setExpandedId(isExpanded ? null : pid)}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              >
                                <Store className="size-3" />
                                {competitorCount}
                                {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                              </button>
                            )}
                          </td>
                        </tr>
                        {isExpanded && sellers.length > 0 && (
                          <tr className="bg-muted/20">
                            <td colSpan={7} className="px-8 py-3">
                              <div className="rounded-xl border border-border/50 bg-background p-4">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  <Store className="mr-1 inline size-3" />
                                  All Sellers — {item.product_name}
                                </p>
                                <div className="overflow-x-auto">
                                  <table className="min-w-full text-xs">
                                    <thead>
                                      <tr className="border-b text-left text-muted-foreground">
                                        <th className="pb-2 pr-4 font-medium">Seller</th>
                                        <th className="pb-2 pr-4 font-medium text-right">Price</th>
                                        <th className="pb-2 pr-4 font-medium text-center">Stock</th>
                                        <th className="pb-2 font-medium text-right">Trust</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {sellers
                                        .sort((a, b) => {
                                          if (a.is_vendor && !b.is_vendor) return -1
                                          if (!a.is_vendor && b.is_vendor) return 1
                                          return (a.price ?? Infinity) - (b.price ?? Infinity)
                                        })
                                        .map((s) => (
                                          <tr key={s.seller_id} className="border-b border-border/30 last:border-0">
                                            <td className="py-2 pr-4">
                                              <span className="inline-flex items-center gap-1">
                                                {s.is_vendor && (
                                                  <Badge variant="outline" className="mr-1 text-[9px] border-indigo-300 text-indigo-600 dark:border-indigo-700 dark:text-indigo-400">You</Badge>
                                                )}
                                                {s.seller_name}
                                              </span>
                                            </td>
                                            <td className="py-2 pr-4 text-right font-mono">
                                              {s.price != null ? (
                                                <span className="inline-flex items-center gap-0.5">
                                                  <DollarSign className="size-2.5 text-muted-foreground/60" />
                                                  {s.price.toFixed(2)}
                                                </span>
                                              ) : "-"}
                                            </td>
                                            <td className="py-2 pr-4 text-center">
                                              <Badge variant={s.in_stock ? "default" : "destructive"} className="text-[9px]">
                                                {s.in_stock ? "In Stock" : "OOS"}
                                              </Badge>
                                            </td>
                                            <td className="py-2 text-right font-mono">
                                              {s.trust_score != null ? (
                                                <span className={s.trust_score >= 80 ? "text-emerald-600" : s.trust_score >= 50 ? "text-amber-600" : "text-red-600"}>
                                                  {s.trust_score.toFixed(0)}
                                                </span>
                                              ) : "-"}
                                            </td>
                                          </tr>
                                        ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const start = Math.max(1, page - 3)
                  const pageNum = start + i
                  if (pageNum > totalPages) return null
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? "default" : "outline"}
                      size="sm"
                      className="min-w-[32px]"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
