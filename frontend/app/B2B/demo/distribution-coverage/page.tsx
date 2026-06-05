"use client"

import { useMemo, useState } from "react"
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts"
import { ChevronLeft, ChevronRight, CheckCircle2, Grid3x3, Package, Store, XCircle, AlertTriangle, ArrowUpDown } from "lucide-react"
import { useDemo } from "../layout-client"
import { DEMO_METRICS } from "@/lib/demo-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const DEMO_PRODUCTS = [
  { id: 1, name: "Wireless Bluetooth Headphones Pro", brand: "SoundMax", category_name: "Electronics", in_stock_sellers: 5, out_of_stock_sellers: 2, total_sellers: 7, coverage_rate: 71 },
  { id: 2, name: "Smart Home Security Camera 4K", brand: "SafeHome", category_name: "Security", in_stock_sellers: 4, out_of_stock_sellers: 1, total_sellers: 5, coverage_rate: 80 },
  { id: 3, name: "Ergonomic Office Chair Mesh", brand: "ComfortPlus", category_name: "Furniture", in_stock_sellers: 3, out_of_stock_sellers: 5, total_sellers: 8, coverage_rate: 38 },
  { id: 4, name: "Portable External SSD 2TB", brand: "DataFast", category_name: "Storage", in_stock_sellers: 7, out_of_stock_sellers: 2, total_sellers: 9, coverage_rate: 78 },
  { id: 5, name: "Organic Green Tea Matcha Powder", brand: "ZenLeaf", category_name: "Groceries", in_stock_sellers: 3, out_of_stock_sellers: 1, total_sellers: 4, coverage_rate: 75 },
  { id: 6, name: "Professional Chef Knife Set", brand: "KitchenElite", category_name: "Kitchen", in_stock_sellers: 4, out_of_stock_sellers: 2, total_sellers: 6, coverage_rate: 67 },
  { id: 8, name: "LED Desk Lamp with Wireless Charger", brand: "BrightTech", category_name: "Lighting", in_stock_sellers: 4, out_of_stock_sellers: 1, total_sellers: 5, coverage_rate: 80 },
]

const DEMO_SELLERS = [
  { id: 1, name: "Your Store (Demo)", in_stock_count: 6, out_of_stock_count: 2, products_carried: 8 },
  { id: 10, name: "PriceBuster", in_stock_count: 28, out_of_stock_count: 7, products_carried: 35 },
  { id: 11, name: "TechDeals", in_stock_count: 37, out_of_stock_count: 5, products_carried: 42 },
  { id: 12, name: "OfficeMart", in_stock_count: 12, out_of_stock_count: 6, products_carried: 18 },
  { id: 13, name: "DataWorld", in_stock_count: 13, out_of_stock_count: 2, products_carried: 15 },
  { id: 14, name: "HomeBright", in_stock_count: 9, out_of_stock_count: 1, products_carried: 10 },
]

const DEMO_MATRIX: { product_id: number; seller_id: number; in_stock: boolean; price: number | null }[] = [
  { product_id: 1, seller_id: 1, in_stock: true, price: 79.99 },
  { product_id: 1, seller_id: 10, in_stock: true, price: 69.99 },
  { product_id: 1, seller_id: 11, in_stock: true, price: 74.99 },
  { product_id: 1, seller_id: 12, in_stock: false, price: 89.99 },
  { product_id: 2, seller_id: 1, in_stock: true, price: 129.99 },
  { product_id: 2, seller_id: 11, in_stock: true, price: 119.99 },
  { product_id: 2, seller_id: 13, in_stock: true, price: 139.99 },
  { product_id: 3, seller_id: 1, in_stock: false, price: 249.99 },
  { product_id: 3, seller_id: 10, in_stock: false, price: 219.99 },
  { product_id: 3, seller_id: 12, in_stock: false, price: 259.99 },
  { product_id: 4, seller_id: 1, in_stock: true, price: 149.99 },
  { product_id: 4, seller_id: 13, in_stock: true, price: 139.99 },
  { product_id: 4, seller_id: 10, in_stock: true, price: 145.99 },
  { product_id: 5, seller_id: 1, in_stock: true, price: 29.99 },
  { product_id: 5, seller_id: 11, in_stock: true, price: 27.99 },
  { product_id: 6, seller_id: 1, in_stock: true, price: 89.99 },
  { product_id: 6, seller_id: 12, in_stock: false, price: 79.99 },
  { product_id: 6, seller_id: 10, in_stock: true, price: 85.99 },
  { product_id: 8, seller_id: 1, in_stock: true, price: 54.99 },
  { product_id: 8, seller_id: 14, in_stock: true, price: 49.99 },
  { product_id: 8, seller_id: 10, in_stock: true, price: 52.99 },
]

const PER_PAGE = 10

export default function DemoDistributionCoveragePage() {
  const { isGold } = useDemo()
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<"coverage" | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [filterCategory, setFilterCategory] = useState("")

  const stockBySeller = DEMO_METRICS.stock_by_seller as Array<Record<string, unknown>>
  const reliability = (DEMO_METRICS as { competitor_reliability?: Array<Record<string, unknown>> }).competitor_reliability ?? stockBySeller
  const oosTrend = DEMO_METRICS.oos_trend as Array<Record<string, unknown>> | undefined

  const products = DEMO_PRODUCTS
  const sellers = DEMO_SELLERS
  const selfSellerId = 1

  const matrixMap = useMemo(() => {
    const map = new Map<string, { product_id: number; seller_id: number; in_stock: boolean; price: number | null }>()
    for (const cell of DEMO_MATRIX) {
      map.set(`${cell.product_id}-${cell.seller_id}`, cell)
    }
    return map
  }, [])

  const orderedSellers = useMemo(() => {
    const you = sellers.filter((s) => s.id === selfSellerId)
    const others = sellers.filter((s) => s.id !== selfSellerId)
    return [...you, ...others]
  }, [selfSellerId])

  const yourSeller = sellers.find((s) => s.id === selfSellerId) ?? null

  const totalCovered = products.filter((p) => p.coverage_rate > 0).length
  const avgCoverage = Math.round(products.reduce((s, p) => s + p.coverage_rate, 0) / products.length)

  const yourGaps = products.filter((p) => !matrixMap.has(`${p.id}-${selfSellerId}`)).length

  const reliabilityMap = useMemo(() => {
    const map = new Map<number, Record<string, unknown>>()
    for (const r of reliability) {
      if (r.seller_id != null) map.set(Number(r.seller_id), r)
    }
    return map
  }, [reliability])

  const worstReliability = oosTrend?.length
    ? [...oosTrend].sort((a, b) => Number(b.oos_rate_30d ?? 0) - Number(a.oos_rate_30d ?? 0))[0]
    : null

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const p of products) {
      if (p.category_name) set.add(p.category_name)
    }
    return Array.from(set).sort()
  }, [])

  const filtered = useMemo(() => {
    if (!filterCategory) return products
    return products.filter((p) => p.category_name === filterCategory)
  }, [filterCategory])

  const sorted = useMemo(() => {
    const list = [...filtered]
    if (sortBy === "coverage") {
      list.sort((a, b) => sortDir === "asc" ? a.coverage_rate - b.coverage_rate : b.coverage_rate - a.coverage_rate)
    }
    return list
  }, [filtered, sortBy, sortDir])

  const filteredCount = filtered.length
  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * PER_PAGE
  const pageProducts = sorted.slice(pageStart, pageStart + PER_PAGE)

  const toggleSort = (col: "coverage") => {
    if (sortBy === col) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"))
    } else {
      setSortBy(col)
      setSortDir("desc")
    }
    setPage(1)
  }

  const yourOOS = yourSeller?.out_of_stock_count ?? 0
  const yourStockRate = yourSeller && yourSeller.products_carried > 0
    ? Math.round((yourSeller.in_stock_count / yourSeller.products_carried) * 100)
    : 0

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
              {selfSellerId != null && <span className="text-base font-normal text-muted-foreground"> (You + {sellers.length - 1} others)</span>}
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

      {isGold && worstReliability && (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40">
                  <AlertTriangle className="size-4 text-red-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Worst Seller (30d)</p>
                  <p className="text-sm font-bold">{String(worstReliability.seller_name ?? "\u2014")}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-red-600">{Number(worstReliability.oos_rate_30d ?? 0).toFixed(1)}%</p>
                <p className="text-[10px] text-muted-foreground">30-day OOS rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {orderedSellers.map((s) => {
          const isYou = s.id === selfSellerId
          const stockRate = s.products_carried > 0 ? Math.round((s.in_stock_count / s.products_carried) * 100) : 0
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
                    <div className={`h-full rounded-full transition-all ${stockRate >= 50 ? "bg-emerald-500" : stockRate >= 25 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${stockRate}%` }} />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{s.products_carried} products</span>
                  <span className="text-emerald-600 font-medium">{s.in_stock_count} in stock</span>
                  {s.out_of_stock_count > 0 && (
                    <span className="text-red-500 font-medium">{s.out_of_stock_count} OOS</span>
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
                  </th>
                  {orderedSellers.map((s) => (
                    <th key={s.id} className={`px-2 py-2 font-medium text-center min-w-[90px] ${s.id === selfSellerId ? "bg-indigo-50/80 dark:bg-indigo-950/20" : ""}`} title={s.name}>
                      <div className="flex flex-col items-center gap-1">
                        <Store className={`size-3 ${s.id === selfSellerId ? "text-indigo-500" : ""}`} />
                        <span className={`truncate max-w-[80px] block ${s.id === selfSellerId ? "text-indigo-700 font-semibold dark:text-indigo-300" : ""}`}>{s.name}</span>
                        <Badge variant={s.id === selfSellerId ? "default" : "outline"} className={`text-[9px] font-normal ${s.id === selfSellerId ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200" : ""}`}>
                          {s.in_stock_count}/{s.products_carried}
                        </Badge>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {pageProducts.map((p) => {
                  const pct = p.coverage_rate
                  const pctColor = pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-600"
                  const isMissingYou = selfSellerId != null && !matrixMap.has(`${p.id}-${selfSellerId}`)
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
                        const cell = matrixMap.get(`${p.id}-${s.id}`)
                        if (!cell) {
                          return (
                            <td key={s.id} className={`px-2 py-2 text-center ${s.id === selfSellerId ? "bg-indigo-50/50 dark:bg-indigo-950/10" : ""}`}>
                              <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted/30">
                                <span className="text-[9px] text-muted-foreground/50">&mdash;</span>
                              </span>
                            </td>
                          )
                        }
                        return (
                          <td key={s.id} className={`px-2 py-2 text-center ${s.id === selfSellerId ? "bg-indigo-50/50 dark:bg-indigo-950/10" : ""}`}>
                            {cell.in_stock ? (
                              <span className="inline-flex items-center justify-center">
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
