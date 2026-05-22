"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts"
import { ChevronLeft, ChevronRight, CheckCircle2, Grid3x3, Package, Store, XCircle, AlertTriangle, ArrowUpDown } from "lucide-react"
import { useB2B } from "@/components/B2B/b2b-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type CoverageProduct = {
  id: number
  name: string
  brand: string | null
  category_name: string | null
  in_stock_sellers: number
  out_of_stock_sellers: number
  total_sellers: number
  coverage_rate: number
}

type CoverageSeller = {
  id: number
  name: string
  in_stock_count: number
  out_of_stock_count: number
  products_carried: number
}

type CoverageCell = {
  product_id: number
  seller_id: number
  in_stock: boolean
  price: number | null
}

type ReliabilityItem = { seller_id?: number; seller_name?: string; total_records?: number; out_of_stock_count?: number; oos_rate_30d?: number }
type TrendItem = { seller_id?: number; seller_name?: string; daily_rates?: (number | null)[] }

type CoverageResponse = {
  products: CoverageProduct[]
  sellers: CoverageSeller[]
  matrix: CoverageCell[]
  self_seller_id: number | null
  competitor_reliability?: ReliabilityItem[]
  oos_trend?: TrendItem[]
}

const PER_PAGE = 10

export default function DistributionCoveragePage() {
  const { loading: summaryLoading, isGold } = useB2B()

  const [data, setData] = useState<CoverageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<"coverage" | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [filterCategory, setFilterCategory] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/b2b/workspace?endpoint=distribution-coverage")
      if (res.ok) {
        const json: CoverageResponse = await res.json()
        setData(json)
      }
    } catch {
      console.error("Failed to fetch distribution coverage")
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const loading_ = loading || summaryLoading

  const { products, sellers, matrix, self_seller_id, competitor_reliability, oos_trend } = data ?? {}

  const orderedSellers = useMemo(() => {
    if (!sellers) return []
    const you = sellers.filter((s) => s.id === self_seller_id)
    const others = sellers.filter((s) => s.id !== self_seller_id)
    return [...you, ...others]
  }, [sellers, self_seller_id])

  const matrixMap = useMemo(() => {
    if (!matrix) return new Map<string, CoverageCell>()
    const map = new Map<string, CoverageCell>()
    for (const cell of matrix) {
      map.set(`${cell.product_id}-${cell.seller_id}`, cell)
    }
    return map
  }, [matrix])

  const yourSeller = useMemo(() => {
    if (!sellers || self_seller_id == null) return null
    return sellers.find((s) => s.id === self_seller_id) ?? null
  }, [sellers, self_seller_id])

  const totalCovered = products ? products.filter((p) => p.coverage_rate > 0).length : 0
  const avgCoverage = products && products.length > 0
    ? Math.round(products.reduce((s, p) => s + p.coverage_rate, 0) / products.length)
    : 0

  const yourGaps = useMemo(() => {
    if (!products || self_seller_id == null || !matrixMap) return 0
    return products.filter((p) => !matrixMap.has(`${p.id}-${self_seller_id}`)).length
  }, [products, self_seller_id, matrixMap])

  const yourOOS = yourSeller?.out_of_stock_count ?? 0
  const yourStockRate = yourSeller && yourSeller.products_carried > 0
    ? Math.round((yourSeller.in_stock_count / yourSeller.products_carried) * 100)
    : 0

  const reliabilityMap = useMemo(() => {
    if (!competitor_reliability) return new Map<number, ReliabilityItem>()
    const map = new Map<number, ReliabilityItem>()
    for (const r of competitor_reliability) {
      if (r.seller_id != null) map.set(r.seller_id, r)
    }
    return map
  }, [competitor_reliability])

  const worstReliability = competitor_reliability?.length
    ? [...competitor_reliability].sort((a, b) => Number(b.oos_rate_30d ?? 0) - Number(a.oos_rate_30d ?? 0))[0]
    : null

  const worstTrend = useMemo(() => {
    if (!worstReliability?.seller_id || !oos_trend) return null
    return oos_trend.find((t) => t.seller_id === worstReliability.seller_id) ?? null
  }, [worstReliability, oos_trend])

  const categories = useMemo(() => {
    if (!products) return [] as string[]
    const set = new Set<string>()
    for (const p of products) {
      if (p.category_name) set.add(p.category_name)
    }
    return Array.from(set).sort()
  }, [products])

  const filtered = useMemo(() => {
    if (!products) return []
    if (!filterCategory) return products
    return products.filter((p) => p.category_name === filterCategory)
  }, [products, filterCategory])

  const sorted = useMemo(() => {
    if (!filtered) return []
    let list = [...filtered]
    if (sortBy === "coverage") {
      list.sort((a, b) => sortDir === "asc" ? a.coverage_rate - b.coverage_rate : b.coverage_rate - a.coverage_rate)
    }
    return list
  }, [filtered, sortBy, sortDir])

  const filteredCount = filtered.length
  const totalPages = products ? Math.max(1, Math.ceil(sorted.length / PER_PAGE)) : 1
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * PER_PAGE
  const pageProducts = sorted.slice(pageStart, pageStart + PER_PAGE)

  const toggleSort = (col: "coverage") => {
    if (sortBy === col) {
      if (sortDir === "desc") {
        setSortDir("asc")
      } else {
        setSortBy(null)
        setSortDir("desc")
      }
    } else {
      setSortBy(col)
      setSortDir("desc")
    }
    setPage(1)
  }

  if (loading_) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-4 w-80 animate-pulse rounded bg-muted/30" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  if (!data || !products || products.length === 0 || !sellers || sellers.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Distribution Coverage</h1>
          <p className="text-sm text-muted-foreground">Product x Seller coverage matrix showing stock status across all sellers.</p>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Grid3x3 className="mb-3 size-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No distribution data yet</p>
            <p className="text-xs text-muted-foreground mt-1">Data will appear once your brand scope is configured and products are synced.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Distribution Coverage</h1>
          {isGold && (
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-semibold uppercase tracking-wider">
              Gold
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Product x Seller coverage matrix showing stock status across all sellers.
        </p>
      </div>

      {yourSeller && (
        <Card className="border-indigo-200/50 bg-gradient-to-r from-indigo-50/50 to-white dark:from-indigo-950/10">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <Store className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium">Your Store</p>
                <p className="text-lg font-bold">{yourSeller.name.replace(/\s*\(You\)$/, "")}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-600">{yourSeller.products_carried}</p>
                <p className="text-xs text-muted-foreground">Products carried</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-bold ${yourStockRate >= 50 ? "text-emerald-600" : "text-red-500"}`}>{yourStockRate}%</p>
                <p className="text-xs text-muted-foreground">In stock rate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">{yourSeller.in_stock_count}</p>
                <p className="text-xs text-muted-foreground">In stock</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">{yourOOS}</p>
                <p className="text-xs text-muted-foreground">Out of stock</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">{yourGaps}</p>
                <p className="text-xs text-muted-foreground">Products you don&apos;t carry</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Products</p>
            <p className="mt-2 text-3xl font-bold">{products.length}</p>
            <p className="text-xs text-muted-foreground">{totalCovered} with at least one seller</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Sellers</p>
            <p className="mt-2 text-3xl font-bold">
              {sellers.length}
              {self_seller_id != null && <span className="text-base font-normal text-muted-foreground"> (You + {sellers.length - 1} others)</span>}
            </p>
            <p className="text-xs text-muted-foreground">carrying your brand</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg Coverage Rate</p>
            <p className="mt-2 text-3xl font-bold">{avgCoverage}%</p>
            <p className="text-xs text-muted-foreground">products x sellers</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Your Gaps</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">{yourGaps}</p>
            <p className="text-xs text-muted-foreground">products you don&apos;t carry</p>
          </CardContent>
        </Card>
      </section>

      {isGold && (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40">
                  <AlertTriangle className="size-4 text-red-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Worst Seller (30d)</p>
                  <p className="text-sm font-bold">{worstReliability?.seller_name ?? "\u2014"}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-red-600">{Number(worstReliability?.oos_rate_30d ?? 0).toFixed(1)}%</p>
                <p className="text-[10px] text-muted-foreground">30-day OOS rate</p>
              </div>
            </div>
            {worstTrend?.daily_rates && (
              <div className="mt-2 h-8">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={worstTrend.daily_rates.map((r, di) => ({ day: di, rate: r ?? 0 }))}>
                    <Area dataKey="rate" stroke="#ef4444" fill="#ef4444" fillOpacity={0.08} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", fontSize: "10px", padding: "4px 8px" }}
                      formatter={(val: number) => [`${val.toFixed(1)}%`, "OOS"]}
                      labelFormatter={(l) => `${l + 1}d ago`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {orderedSellers.map((s) => {
          const isYou = s.id === self_seller_id
          const stockRate = s.products_carried > 0 ? Math.round((s.in_stock_count / s.products_carried) * 100) : 0
          const rel = isGold ? reliabilityMap.get(s.id) : undefined
          const relRate = rel ? Number(rel.oos_rate_30d ?? 0) : null
          return (
            <Card key={s.id} className={`border-border/50 shadow-sm ${isYou ? "ring-1 ring-indigo-200" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className={`size-4 ${isYou ? "text-indigo-500" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${isYou ? "text-indigo-700" : ""}`}>{s.name}</span>
                  </div>
                  <Badge variant={isYou ? "default" : "outline"} className={`text-[10px] ${isYou ? "bg-indigo-100 text-indigo-700" : ""}`}>
                    {stockRate}% in stock
                  </Badge>
                </div>
                <div className="mt-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${stockRate >= 50 ? "bg-emerald-500" : stockRate >= 25 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${stockRate}%` }}
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{s.products_carried} products</span>
                  <span className="text-emerald-600 font-medium">{s.in_stock_count} in stock</span>
                  {s.out_of_stock_count > 0 && (
                    <span className="text-red-500 font-medium">{s.out_of_stock_count} OOS</span>
                  )}
                  {relRate !== null && (
                    <span className={`font-mono font-medium ${relRate > 50 ? "text-red-600" : relRate > 20 ? "text-amber-600" : "text-emerald-600"}`}>
                      30d: {relRate.toFixed(1)}% OOS
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>



      <Card className="border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Grid3x3 className="size-4 text-indigo-500" />
              Coverage Matrix
            </CardTitle>
            <CardDescription>
              Rows = products, Columns = sellers. Green = in stock, Red = out of stock, Gray = not listed.
            </CardDescription>
          </div>
          {categories.length > 0 && (
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setPage(1) }}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm outline-none focus:border-indigo-500"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-background z-10">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="sticky left-0 bg-background z-10 px-3 py-2 font-medium min-w-[200px]">Product</th>
                  <th className="px-3 py-2 font-medium text-center min-w-[60px] cursor-pointer select-none hover:bg-muted/30 transition-colors" onClick={() => toggleSort("coverage")}>
                    <span className="inline-flex items-center gap-1">
                      Cov.
                      <ArrowUpDown className={`size-3 transition-opacity ${sortBy === "coverage" ? "opacity-100 text-indigo-500" : "opacity-30"}`} />
                    </span>
                    {sortBy === "coverage" && (
                      <span className="ml-0.5 text-[10px] text-indigo-500">{sortDir === "desc" ? "▼" : "▲"}</span>
                    )}
                  </th>
                  {orderedSellers.map((s) => {
                    const isYou = s.id === self_seller_id
                    const rel2 = isGold ? reliabilityMap.get(s.id) : undefined
                    const relRate2 = rel2 ? Number(rel2.oos_rate_30d ?? 0) : null
                    return (
                      <th key={s.id} className={`px-2 py-2 font-medium text-center min-w-[90px] ${isYou ? "bg-indigo-50/80 dark:bg-indigo-950/20" : ""}`} title={s.name}>
                        <div className="flex flex-col items-center gap-1">
                          <Store className={`size-3 ${isYou ? "text-indigo-500" : ""}`} />
                          <span className={`truncate max-w-[80px] block ${isYou ? "text-indigo-700 font-semibold dark:text-indigo-300" : ""}`}>{s.name}</span>
                          <Badge variant={isYou ? "default" : "outline"} className={`text-[9px] font-normal ${isYou ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200" : ""}`}>
                            {s.in_stock_count}/{s.products_carried}
                          </Badge>
                          {relRate2 !== null && (
                            <div className="mt-0.5 flex items-center gap-1">
                              <div className="h-1 w-8 overflow-hidden rounded-full bg-muted">
                                <div className={`h-full rounded-full ${relRate2 <= 10 ? "bg-emerald-500" : relRate2 <= 30 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.min(100, relRate2)}%` }} />
                              </div>
                              <span className={`text-[8px] font-mono font-bold ${relRate2 <= 10 ? "text-emerald-600" : relRate2 <= 30 ? "text-amber-600" : "text-red-600"}`}>{relRate2.toFixed(0)}%</span>
                            </div>
                          )}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {pageProducts.map((p) => {
                  const pct = p.coverage_rate
                  const pctColor = pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-600"
                  const isMissingYou = self_seller_id != null && !matrixMap.has(`${p.id}-${self_seller_id}`)
                  return (
                    <tr key={p.id} className={`transition-colors hover:bg-muted/20 ${isMissingYou ? "bg-amber-50/30 dark:bg-amber-950/5" : ""}`}>
                      <td className="sticky left-0 bg-background px-3 py-2">
                        <div className="flex items-center gap-2">
                          {isMissingYou ? (
                            <AlertTriangle className="size-3.5 shrink-0 text-amber-400" />
                          ) : (
                            <Package className="size-3.5 shrink-0 text-muted-foreground" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate max-w-[160px] font-medium text-xs">{p.name}</p>
                            {p.category_name && (
                              <p className="text-[10px] text-muted-foreground">{p.category_name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={`px-3 py-2 text-center font-bold text-xs ${pctColor}`}>
                        {pct}%
                      </td>
                      {orderedSellers.map((s) => {
                        const isYou = s.id === self_seller_id
                        const cell = matrixMap.get(`${p.id}-${s.id}`)
                        if (!cell) {
                          return (
                            <td key={s.id} className={`px-2 py-2 text-center ${isYou ? "bg-indigo-50/50 dark:bg-indigo-950/10" : ""}`}>
                              <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted/30">
                                <span className="text-[9px] text-muted-foreground/50">&mdash;</span>
                              </span>
                            </td>
                          )
                        }
                        return (
                          <td key={s.id} className={`px-2 py-2 text-center ${isYou ? "bg-indigo-50/50 dark:bg-indigo-950/10" : ""}`}>
                            {cell.in_stock ? (
                              <span className="inline-flex items-center justify-center" title={`${cell.price?.toFixed(3)} DT`}>
                                <CheckCircle2 className="size-4 text-emerald-500" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center">
                                <XCircle className="size-4 text-red-400" />
                              </span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Showing {pageStart + 1}&ndash;{Math.min(pageStart + PER_PAGE, filteredCount)} of {filteredCount} product{filteredCount !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                  <ChevronLeft className="size-3.5 mr-1" /> Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {safePage} of {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                  Next <ChevronRight className="size-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
