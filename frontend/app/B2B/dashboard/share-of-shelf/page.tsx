"use client"

import { Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { BarChart3, CheckCircle2, ChevronDown, ChevronRight, Eye, EyeOff, HelpCircle, PieChartIcon, ShoppingBag, TrendingDown, TrendingUp } from "lucide-react"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useB2B } from "@/components/B2B/b2b-context"
import B2BPlanGate from "@/components/B2B/b2b-plan-gate"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8", "#7c3aed", "#4f46e5", "#6d28d9"]
const OWN_COLOR = "#22c55e"

type CatalogProduct = {
  productId: number
  productName: string
  productBrand: string
  categoryName: string
  price: number | null
  trust_score: number | null
  availability: boolean | null
}

type CompetitorItem = { name: string; count: number; is_own?: boolean }
type ShelfItem = { category?: string; category_id?: number; your_products?: number; brand_products?: number; total_products?: number; share_of_shelf?: number; delta?: number | null; top_competitors?: CompetitorItem[] }

export default function ShareOfShelfPage() {
  const { summary, loading, mode, isGold } = useB2B()
  const metrics = summary?.metrics as Record<string, unknown> | undefined
  const raw = ((metrics?.share_of_shelf ?? []) as ShelfItem[])
  const [selectedBarCategory, setSelectedBarCategory] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [allProducts, setAllProducts] = useState<CatalogProduct[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [productPage, setProductPage] = useState<Record<string, number>>({})
  const fetchedRef = useRef(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const data = raw.map((item) => ({
    ...item,
    share_of_shelf: Number(item.share_of_shelf ?? 0),
    your_products: Number(item.your_products ?? 0),
    brand_products: Number(item.brand_products ?? 0),
    total_products: Number(item.total_products ?? 0),
    delta: item.delta !== undefined ? item.delta : null,
  }))

  const chartData = data.map((item) => ({
    name: String(item.category ?? "Category").slice(0, 20),
    share: item.share_of_shelf,
    yours: item.your_products,
    brand: item.brand_products,
    total: item.total_products,
    delta: item.delta,
  }))

  const avgShare = data.length > 0 ? data.reduce((s, d) => s + d.share_of_shelf, 0) / data.length : 0
  const topCategory = [...data].sort((a, b) => b.share_of_shelf - a.share_of_shelf)[0]

  // Pie chart data for selected bar category
  const pieData = useMemo(() => {
    if (!selectedBarCategory) return []
    const cat = data.find((d) => d.category === selectedBarCategory)
    if (!cat?.top_competitors) return []
    const total = cat.top_competitors.reduce((s, c) => s + c.count, 0)
    if (total === 0) return []
    return cat.top_competitors.map((c) => ({
      name: c.name,
      value: c.count,
      share: total > 0 ? ((c.count / total) * 100).toFixed(1) + "%" : "0%",
      is_own: c.is_own ?? false,
    }))
  }, [selectedBarCategory, data])

  // Fetch products once — use brand-products for market, listings for vendor
  useEffect(() => {
    if (!summary || fetchedRef.current) return
    fetchedRef.current = true
    setLoadingProducts(true)
    setFetchError(false)

    const url = mode === "market"
      ? "/api/b2b/workspace?endpoint=brand-products&perPage=2000"
      : "/api/b2b/workspace?endpoint=listings&limit=1000"

    fetch(url)
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => {
        const rawItems = data.products ?? data.items ?? data ?? []
        const seen = new Map<number, CatalogProduct>()
        for (const item of rawItems) {
          const pid = item.productId ?? item.id
          const name = item.productName ?? item.name
          if (pid && name && !seen.has(pid)) {
            seen.set(pid, {
              productId: pid,
              productName: name,
              productBrand: item.productBrand ?? item.brand ?? "",
              categoryName: item.categoryName ?? item.category_name ?? "",
              price: item.price ?? item.lowest_price ?? null,
              trust_score: item.trust_score ?? item.avg_trust ?? null,
              availability: item.availability ?? null,
            })
          }
        }
        setAllProducts(Array.from(seen.values()))
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoadingProducts(false))
  }, [summary, mode])

  const getExpandedProducts = useCallback((categoryName: string): CatalogProduct[] => {
    const needle = categoryName.toLowerCase().trim()
    return allProducts.filter((p) => p.categoryName.toLowerCase().trim() === needle)
  }, [allProducts])

  const showMore = (cat: string) => {
    setProductPage((prev) => ({ ...prev, [cat]: (prev[cat] ?? 1) + 1 }))
  }

  const PER_PAGE = 10

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

  if (!mounted) {
    return null
  }

  if (!isGold) return <B2BPlanGate featureName="Share of Shelf" />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Share of Shelf</h1>
          <p className="text-sm text-muted-foreground">
            Your brand&apos;s product presence per category — Your Products (your listings with this brand),
            Same Brand (all products with this brand across all sellers), Total Products (all products in the category).
            Green = gaining share, red = losing share.
          </p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Categories</p>
              <span className="group relative inline-flex">
                <HelpCircle className="size-3 text-muted-foreground/40" />
                <span className="absolute bottom-full left-1/2 z-10 mb-1 hidden w-56 -translate-x-1/2 rounded-md bg-popover p-2 text-xs text-popover-foreground shadow-md group-hover:block">
                  Number of categories where your brand has at least one product listing.
                </span>
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold">{data.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg Share</p>
              <span className="group relative inline-flex">
                <HelpCircle className="size-3 text-muted-foreground/40" />
                <span className="absolute bottom-full left-1/2 z-10 mb-1 hidden w-56 -translate-x-1/2 rounded-md bg-popover p-2 text-xs text-popover-foreground shadow-md group-hover:block">
                  Average brand share across all categories (same-brand products ÷ total products × 100).
                </span>
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold text-indigo-600">{avgShare.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Top Category</p>
              <span className="group relative inline-flex">
                <HelpCircle className="size-3 text-muted-foreground/40" />
                <span className="absolute bottom-full left-1/2 z-10 mb-1 hidden w-48 -translate-x-1/2 rounded-md bg-popover p-2 text-xs text-popover-foreground shadow-md group-hover:block">
                  Category with the highest share of shelf for your brand.
                </span>
              </span>
            </div>
            <p className="mt-2 text-xl font-bold">{topCategory?.category ?? "\u2014"}</p>
            <p className="text-sm text-indigo-600">{topCategory?.share_of_shelf.toFixed(1) ?? "0"}%</p>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/50 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="size-4 text-indigo-500" />Share of Shelf by Category</CardTitle>
            <CardDescription>
              Percentage of same-brand products out of all products per category. Green = gaining, red = losing.
              Click a bar to see seller breakdown. Click a category in the table below to see products.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-96">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 120, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/30" />
                  <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} unit="%" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    width={120}
                    onClick={(entry) => setSelectedBarCategory(entry.name as string)}
                    style={{ cursor: "pointer" }}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
                    formatter={(val: number, name: string) => {
                      if (name === "share") return [`${val.toFixed(1)}%`, "Share"]
                      return [val, name]
                    }}
                  />
                  <Bar dataKey="share" radius={[0, 8, 8, 0]} cursor="pointer" onClick={(entry) => setSelectedBarCategory(entry.name as string)}>
                    {chartData.map((entry, i) => {
                      const delta = entry.delta
                      const fill = delta !== null && delta < 0 ? "#ef4444" : delta !== null && delta > 0 ? "#22c55e" : COLORS[i % COLORS.length]
                      return <Cell key={i} fill={fill} cursor="pointer" />
                    })}
                    <LabelList
                      dataKey="delta"
                      position="right"
                      formatter={(v: number | null | undefined) => {
                        if (v == null || v === 0) return ""
                        return v > 0 ? `▲${v.toFixed(1)}%` : `▼${Math.abs(v).toFixed(1)}%`
                      }}
                      style={{ fontSize: "11px", fontWeight: 600, fill: "hsl(var(--foreground))", pointerEvents: "none" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-sm text-muted-foreground">
                <BarChart3 className="mb-2 size-8 opacity-30" />
                <span>No share of shelf data available</span>
                <span className="text-xs text-muted-foreground/70 mt-1">Category presence data will appear once listings are categorized.</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="size-4 text-indigo-500" />
              Seller Breakdown
            </CardTitle>
            <CardDescription>
              {selectedBarCategory
                ? `Seller distribution in "${selectedBarCategory}"`
                : "Click a category bar to see seller breakdown."}
              {" "}Green = your store.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-96">
            {pieData.length > 0 ? (
              <div className="flex h-full flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height="70%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.is_own ? OWN_COLOR : COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
                      formatter={(val: number, name: string) => [val, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 w-full space-y-1">
                  {pieData.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between px-4 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: entry.is_own ? OWN_COLOR : COLORS[i % COLORS.length] }} />
                        <span className={entry.is_own ? "font-semibold text-green-600" : "text-muted-foreground"}>
                          {entry.name}{entry.is_own ? " (You)" : ""}
                        </span>
                      </div>
                      <span className="font-mono font-medium">{entry.share}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-sm text-muted-foreground">
                <PieChartIcon className="mb-2 size-8 opacity-30" />
                <span>{selectedBarCategory ? "No competitor data" : "Select a category"}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
          <CardDescription>
            Your Products = your listings with this brand. Same Brand = all products with this brand across all sellers.
            Total Products = all products in the category. Share = (Same Brand ÷ Total) × 100
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium text-right">
                    <span className="group relative inline-flex items-center gap-1">
                      Your Products
                      <HelpCircle className="size-3 text-muted-foreground/40" />
                      <span className="absolute bottom-full left-1/2 z-10 mb-1 hidden w-48 -translate-x-1/2 rounded-md bg-popover p-2 text-xs text-popover-foreground shadow-md group-hover:block">
                        Your active listings with this brand in this category.
                      </span>
                    </span>
                  </th>
                  <th className="px-4 py-3 font-medium text-right">
                    <span className="group relative inline-flex items-center gap-1">
                      Same Brand
                      <HelpCircle className="size-3 text-muted-foreground/40" />
                      <span className="absolute bottom-full left-1/2 z-10 mb-1 hidden w-48 -translate-x-1/2 rounded-md bg-popover p-2 text-xs text-popover-foreground shadow-md group-hover:block">
                        All active products with this brand across all sellers in this category.
                      </span>
                    </span>
                  </th>
                  <th className="px-4 py-3 font-medium text-right">
                    <span className="group relative inline-flex items-center gap-1">
                      Total Products
                      <HelpCircle className="size-3 text-muted-foreground/40" />
                      <span className="absolute bottom-full left-1/2 z-10 mb-1 hidden w-48 -translate-x-1/2 rounded-md bg-popover p-2 text-xs text-popover-foreground shadow-md group-hover:block">
                        All active product listings from every seller in this category.
                      </span>
                    </span>
                  </th>
                  <th className="px-4 py-3 font-medium text-right">Share (%)</th>
                  <th className="px-4 py-3 font-medium text-right">vs Last Week</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-16 text-center">
                    <BarChart3 className="mx-auto mb-3 size-10 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">No category data yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Category breakdown will populate as products are assigned to categories.</p>
                  </td></tr>
                ) : (
                  data.map((item, i) => {
                    const cat = item.category ?? ""
                    const isOpen = expandedCategory === cat
                    const products = cat ? getExpandedProducts(cat) : []
                    return (
                      <React.Fragment key={item.category_id ?? i}>
                        <tr
                          className={`cursor-pointer transition-colors hover:bg-muted/30 ${isOpen ? "bg-indigo-50/60 dark:bg-indigo-950/20" : ""}`}
                          onClick={() => setExpandedCategory(isOpen ? null : cat)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {isOpen ? <ChevronDown className="size-3.5 shrink-0 text-indigo-500" /> : <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
                              <span className="font-medium">{item.category ?? "-"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{item.your_products}</td>
                          <td className="px-4 py-3 text-right font-mono">{item.brand_products}</td>
                          <td className="px-4 py-3 text-right font-mono">{item.total_products}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(item.share_of_shelf, 100)}%` }} />
                              </div>
                              <span className="w-12 text-right font-mono font-bold text-indigo-600">{item.share_of_shelf.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {item.delta !== null && item.delta !== undefined && item.delta !== 0 ? (
                              <span className={`inline-flex items-center gap-1 font-mono text-xs font-bold ${item.delta > 0 ? "text-emerald-600" : "text-red-600"}`}>
                                {item.delta > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                                {Math.abs(item.delta).toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/50">\u2014</span>
                            )}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td colSpan={6} className="px-0 py-0">
                              <div className="border-t border-border/30 bg-muted/10 px-4 py-4">
                                {loadingProducts ? (
                                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {Array.from({ length: 6 }).map((_, si) => (
                                      <Skeleton key={si} className="h-20 w-full rounded-lg" />
                                    ))}
                                  </div>
                                ) : fetchError ? (
                                  <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
                                    <ShoppingBag className="mb-2 size-8 opacity-30" />
                                    <span>Could not load products</span>
                                  </div>
                                ) : products.length > 0 ? (
                                  <div>
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                      {products.slice(0, (productPage[cat] ?? 1) * PER_PAGE).map((p) => (
                                        <div key={p.productId} className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-3 transition-colors hover:bg-muted/30">
                                          <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs font-semibold">{p.productName}</p>
                                            <div className="mt-1 flex items-center gap-2">
                                              {p.productBrand && (
                                                <Badge variant="outline" className="text-[9px]">{p.productBrand}</Badge>
                                              )}
                                              {p.trust_score != null && (
                                                <span className="text-[10px] text-muted-foreground">
                                                  Trust: <span className="font-bold">{Number(p.trust_score).toFixed(0)}</span>
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="ml-3 flex shrink-0 flex-col items-end gap-1">
                                            {p.price != null && (
                                              <span className="font-mono text-xs font-bold">{Number(p.price).toFixed(3)} DT</span>
                                            )}
                                            <span className={`inline-flex items-center gap-0.5 text-[10px] ${p.availability === false ? "text-red-500" : "text-emerald-500"}`}>
                                              {p.availability === false ? (
                                                <><span className="size-1.5 rounded-full bg-red-500" /> OOS</>
                                              ) : p.availability === true ? (
                                                <><CheckCircle2 className="size-3" /> In Stock</>
                                              ) : null}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    {products.length > (productPage[cat] ?? 1) * PER_PAGE && (
                                      <div className="mt-4 text-center">
                                        <Button variant="outline" size="sm" onClick={() => showMore(cat)} className="gap-2 text-xs">
                                          <Eye className="size-3.5" />
                                          Show {Math.min(PER_PAGE, products.length - (productPage[cat] ?? 1) * PER_PAGE)} more of {products.length}
                                        </Button>
                                      </div>
                                    )}
                                    {products.length > PER_PAGE && products.length <= (productPage[cat] ?? 1) * PER_PAGE && (
                                      <div className="mt-4 text-center">
                                        <Button variant="ghost" size="sm" onClick={() => setProductPage((prev) => ({ ...prev, [cat]: 1 }))} className="gap-2 text-xs">
                                          <EyeOff className="size-3.5" />
                                          Show less
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
                                    <ShoppingBag className="mb-2 size-8 opacity-30" />
                                    <span>No products found in this category</span>
                                  </div>
                                )}
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
        </CardContent>
      </Card>
    </div>
  )
}
