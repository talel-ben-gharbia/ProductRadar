"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  BarChart3,
  CheckCircle2,
  Package,
  Plus,
  Search,
  ShoppingBag,
  X,
} from "lucide-react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { toast } from "sonner"

import { useB2B } from "@/components/B2B/b2b-context"
import B2BPlanGate from "@/components/B2B/b2b-plan-gate"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

type Category = {
  id: number
  name: string
  parentId: number | null
}

type ProductOption = {
  id: number
  name: string
  brand: string | null
}

type PriceHistoryPoint = {
  date: string
  price: number
}

type CompareProduct = {
  product_id: number
  product_name: string
  product_brand: string | null
  product_image: string | null
  category_name: string | null
  lowest_price: number | null
  highest_price: number | null
  avg_trust: number | null
  active_sellers: number
  oos_rate_30d: number | null
  oos_count: number
  total_listings: number
  review_count: number
  avg_rating: number | null
  price_dispersion_pct: number | null
  price_history?: PriceHistoryPoint[]
  match_type?: "Direct Match" | "Step-Up Alternative" | "Budget Alternative" | null
  match_reason?: string | null
  specs?: Record<string, any>
}

const MATCH_TYPE_STYLES: Record<string, { badge: string; label: string }> = {
  "Direct Match": { badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400", label: "Direct Match" },
  "Step-Up Alternative": { badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400", label: "Step-Up" },
  "Budget Alternative": { badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400", label: "Budget" },
  "No Direct Match": { badge: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", label: "No Match" },
}

const CHART_COLORS = ["#6366f1", "#f59e0b", "#10b981"]

function getCategoryDescendantIds(catId: number, allCats: Category[]): number[] {
  const ids = [catId]
  for (const cat of allCats) {
    if (cat.parentId === catId) {
      ids.push(...getCategoryDescendantIds(cat.id, allCats))
    }
  }
  return ids
}

function toMoney(value: number | null): string {
  if (value === null) return "-"
  return `${value.toFixed(3)} DT`
}

type RowKey = "lowest_price" | "avg_trust" | "active_sellers" | "oos_rate_30d" | "avg_rating" | "review_count" | "price_dispersion_pct" | "total_listings"

const METRIC_ROWS: { key: RowKey; label: string; format: (v: number | null) => string; higherIsBetter: boolean }[] = [
  { key: "lowest_price", label: "Lowest Price (DT)", format: (v) => v !== null ? v.toFixed(3) + " DT" : "-", higherIsBetter: false },
  { key: "avg_trust", label: "Avg Trust Score", format: (v) => v !== null ? v.toFixed(1) : "-", higherIsBetter: true },
  { key: "active_sellers", label: "Active Sellers", format: (v) => v !== null ? v.toString() : "0", higherIsBetter: true },
  { key: "oos_rate_30d", label: "OOS Rate (30d)", format: (v) => v !== null ? v.toFixed(1) + "%" : "-", higherIsBetter: false },
  { key: "avg_rating", label: "Avg Rating", format: (v) => v !== null ? v.toFixed(2) + "/5" : "-", higherIsBetter: true },
  { key: "review_count", label: "Reviews", format: (v) => v !== null ? v.toString() : "0", higherIsBetter: true },
  { key: "price_dispersion_pct", label: "Price Dispersion", format: (v) => v !== null ? v.toFixed(1) + "%" : "-", higherIsBetter: false },
  { key: "total_listings", label: "Total Listings", format: (v) => v !== null ? v.toString() : "0", higherIsBetter: true },
]

export default function ProductComparePage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [userCategoryIds, setUserCategoryIds] = useState<Set<number>>(new Set())
  const [userCategoryNames, setUserCategoryNames] = useState<Set<string>>(new Set())
  const [userBrand, setUserBrand] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [products, setProducts] = useState<ProductOption[]>([])
  const [selectedBrand, setSelectedBrand] = useState<string>("all")
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [compareResults, setCompareResults] = useState<CompareProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [comparing, setComparing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [progressText, setProgressText] = useState<string | null>(null)
  const COOLDOWN_MS = 5000
  const lastClickRef = useRef(0)
  const { mode, isGold } = useB2B()
  const fetchedRef = useRef(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])



  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories")
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setCategories(data)
      }
    } catch {
      console.error("Failed to fetch categories")
    }
  }, [])

  useEffect(() => {
    fetchCategories()
    if (fetchedRef.current) return
    fetchedRef.current = true

    const url = mode === "market"
      ? "/api/b2b/workspace?endpoint=brand-products&perPage=2000"
      : "/api/b2b/workspace?endpoint=listings&limit=1000"

    fetch(url)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return
        const items = data.products ?? data.items ?? data ?? []
        const brandSet = new Set<string>()
        const catNameSet = new Set<string>()
        const catIdSet = new Set<number>()
        for (const item of items) {
          const brand = item.brand ?? item.productBrand ?? null
          if (brand) brandSet.add(brand)
          const catName = (item.categoryName ?? item.category_name ?? "").toLowerCase().trim()
          if (catName) catNameSet.add(catName)
          const catId = item.categoryId ?? null
          if (catId) catIdSet.add(catId)
        }
        setUserBrand(brandSet.size > 0 ? Array.from(brandSet)[0] : null)
        setUserCategoryNames(catNameSet)
        setUserCategoryIds(catIdSet)
      })
      .catch(() => {})
  }, [fetchCategories, mode])

  const visibleCategories = useMemo(() => {
    const hasBrandFilter = userCategoryIds.size > 0 || userCategoryNames.size > 0
    if (!hasBrandFilter) return categories
    return categories.filter((cat) => {
      if (userCategoryIds.has(cat.id)) return true
      if (userCategoryNames.has(cat.name.toLowerCase().trim())) return true
      const descendants = getCategoryDescendantIds(cat.id, categories)
      return descendants.some((d) => userCategoryIds.has(d) || userCategoryNames.has(
        categories.find((c) => c.id === d)?.name.toLowerCase().trim() ?? ""
      ))
    })
  }, [categories, userCategoryIds, userCategoryNames])

  const handleCategoryChange = async (value: string) => {
    setSelectedCategory(value)
    setSelectedBrand("all")
    setSelectedIds([])
    setCompareResults([])
    setLoading(true)
    const catIds = new Set(getCategoryDescendantIds(Number(value), categories))
    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=listings&limit=500`)
      if (res.ok) {
        const data = await res.json()
        const items = data.items ?? data ?? []
        const seen = new Map<number, ProductOption>()
        for (const item of items) {
          const pid = item.productId
          if (pid && item.productName) {
            const catId = item.categoryId
            if (catId && catIds.has(catId) && !seen.has(pid)) {
              seen.set(pid, {
                id: pid,
                name: item.productName,
                brand: item.productBrand ?? null,
              })
            }
          }
        }
        setProducts(Array.from(seen.values()))
      }
    } catch {
      console.error("Failed to fetch products")
    }
    setLoading(false)
  }

  const brandOptions = useMemo(() => {
    const brands = new Set<string>()
    for (const p of products) {
      if (p.brand) brands.add(p.brand)
    }
    return Array.from(brands).sort()
  }, [products])

  const toggleProduct = (id: number) => {
    const product = products.find((p) => p.id === id)
    if (!product) return

    setSelectedIds((prev) => {
      if (prev.includes(id)) return []
      return [id]
    })
  }

  const clearAll = () => {
    setSelectedIds([])
    setCompareResults([])
    setSelectedBrand("all")
    setSearchTerm("")
  }

  const handleCompare = async () => {
    if (selectedIds.length < 1) return
    const now = Date.now()
    if (now - lastClickRef.current < COOLDOWN_MS) {
      toast.warning(`Please wait ${Math.ceil((COOLDOWN_MS - (now - lastClickRef.current)) / 1000)}s before comparing again.`)
      return
    }
    lastClickRef.current = now
    setComparing(true)
    setCompareResults([])
    setProgressText("Gathering\u2026")

    const t1 = setTimeout(() => setProgressText("Analyzing\u2026"), 600)
    const t2 = setTimeout(() => setProgressText("Building\u2026"), 1800)

    try {
      const ids = selectedIds.join(",")
      const res = await fetch(`/api/b2b/workspace?endpoint=compare-products&product_ids=${ids}&auto_compete=1&refresh=1`)
      if (res.ok) {
        const data = await res.json()
        setCompareResults(data.products ?? [])
        if (data.warning) {
          toast.warning(data.warning)
        } else if (data.products && data.products.length < 2) {
          toast.error("AI could not find competitors for this product.")
        }
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data?.error ?? `Compare failed (${res.status})`)
      }
    } catch {
      toast.error("Network error while comparing products")
    }

    clearTimeout(t1)
    clearTimeout(t2)
    setProgressText(null)
    setComparing(false)
  }

  const filteredProducts = useMemo(() => {
    let result = products

    if (selectedBrand !== "all") {
      result = result.filter((p) => p.brand === selectedBrand)
    }

    if (searchTerm) {
      const needle = searchTerm.toLowerCase()
      result = result.filter((p) => p.name.toLowerCase().includes(needle))
    }

    return result
  }, [products, selectedBrand, searchTerm])

  const searchMatchCount = useMemo(() => {
    if (!searchTerm) return null
    let base = products
    if (selectedBrand !== "all") base = base.filter((p) => p.brand === selectedBrand)
    const needle = searchTerm.toLowerCase()
    return base.filter((p) => p.name.toLowerCase().includes(needle)).length
  }, [products, selectedBrand, searchTerm])

  const getBestValue = (key: RowKey): number | null => {
    const values = compareResults.map((p) => {
      const v = p[key]
      return typeof v === "number" ? v : null
    }).filter((v): v is number => v !== null)
    if (values.length === 0) return null
    const metric = METRIC_ROWS.find((m) => m.key === key)
    return metric?.higherIsBetter ? Math.max(...values) : Math.min(...values)
  }

  const chartData = useMemo(() => {
    if (compareResults.length < 2) return []
    const dateMap = new Map<string, Record<number, number | null>>()
    for (const p of compareResults) {
      for (const ph of p.price_history ?? []) {
        if (!dateMap.has(ph.date)) dateMap.set(ph.date, {})
        dateMap.get(ph.date)![p.product_id] = ph.price
      }
    }
    const sorted = Array.from(dateMap.entries()).sort(([a], [b]) => a.localeCompare(b))
    return sorted.map(([date, prices]) => {
      const point: Record<string, string | number | null> = { date }
      for (const p of compareResults) {
        point[String(p.product_id)] = prices[p.product_id] ?? null
      }
      return point
    })
  }, [compareResults])

  const allSpecsKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const p of compareResults) {
      if (p.specs) {
        for (const k of Object.keys(p.specs)) {
          keys.add(k)
        }
      }
    }
    return Array.from(keys).sort()
  }, [compareResults])

  if (!mounted) {
    return null
  }

  if (!isGold) return <B2BPlanGate featureName="Multi-Product AI Comparison" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Product Comparison</h1>
        <p className="text-sm text-muted-foreground">Select a product to compare with competitors in your brand&apos;s categories.</p>
      </div>

      {/* Category + Brand + Product Selection */}
      <Card className="border-border/50">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Category:</span>
            </div>
            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-56" suppressHydrationWarning data-lpignore="true" data-1p-ignore="true">
                <span suppressHydrationWarning>
                  <SelectValue placeholder="Select category..." />
                </span>
              </SelectTrigger>
              <SelectContent>
                {visibleCategories.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}><span>{cat.name}</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-4">
            {selectedCategory && (
              <div className="space-y-4">
                {/* Brand filter */}
                {brandOptions.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Brand:</span>
                    <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                      <SelectTrigger className="w-44 h-8 text-xs" suppressHydrationWarning data-lpignore="true" data-1p-ignore="true">
                        <span suppressHydrationWarning>
                          <SelectValue />
                        </span>
                      </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all"><span>All Brands</span></SelectItem>
                      {brandOptions.map((brand) => (
                        <SelectItem key={brand} value={brand}><span>{brand}</span></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedBrand !== "all" && (
                    <button
                      type="button"
                      onClick={() => setSelectedBrand("all")}
                      className="inline-flex items-center gap-0.5 rounded-full border border-slate-200 px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted/50"
                    >
                      <X className="h-3 w-3" /> <span>Clear</span>
                    </button>
                  )}
                </div>
              )}

              {/* Search */}
              <div className="flex items-center gap-2 border-t pt-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-xs"
                />
                {searchMatchCount !== null && searchTerm && (
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    <span>{searchMatchCount} match{searchMatchCount !== 1 ? "es" : ""}</span>
                  </span>
                )}
              </div>

              {/* Product chips */}
              <div className="flex flex-wrap gap-2">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-40 rounded-full" />
                  ))
                ) : filteredProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No products in this category.
                  </p>
                ) : (
                  filteredProducts.map((product) => {
                    const isSelected = selectedIds.includes(product.id)
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => toggleProduct(product.id)}
                        disabled={!isSelected && selectedIds.length >= 1}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                            : selectedIds.length >= 1
                              ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                              : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50"
                        }`}
                      >
                        {isSelected ? <CheckCircle2 className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                        <span>{product.name}</span>
                        {product.brand && <span className="text-[10px] opacity-60">({product.brand})</span>}
                      </button>
                    )
                  })
                )}
              </div>

              {/* Compare button */}
              {selectedIds.length >= 1 && (
                <div className="flex items-center gap-2 border-t pt-4">
                  <Button onClick={handleCompare} disabled={comparing}>
                    <span>{progressText ?? "Compare with Competitors"}</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearAll}>
                    <X className="mr-1 h-3.5 w-3.5" /> <span>Clear all</span>
                  </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      <div className={compareResults.length >= 2 ? "block" : "hidden"}>
        <Card className="border-border/50 overflow-hidden">
          <CardHeader className="border-b bg-muted/20 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-indigo-500" />
              <span>Head-to-Head Comparison</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y text-sm">
                <thead>
                  <tr className="bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Metric</th>
                    {compareResults.map((p) => (
                      <th key={p.product_id} className="px-4 py-3 text-center font-medium">
                        <div className="space-y-1">
                          <div className="flex justify-center">
                            {p.product_image ? (
                              <img src={p.product_image} alt={p.product_name} className="h-10 w-10 rounded-lg border object-contain p-1" />
                            ) : (
                              <ShoppingBag className="h-8 w-8 text-slate-300" />
                            )}
                          </div>
                          <p className="text-xs font-semibold text-foreground">{p.product_name}</p>
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {p.product_brand && (
                              <Badge variant="outline" className="text-[9px]">{p.product_brand}</Badge>
                            )}
                            {p.match_type && MATCH_TYPE_STYLES[p.match_type] && (
                              <Badge className={`text-[9px] ${MATCH_TYPE_STYLES[p.match_type].badge}`}>
                                {MATCH_TYPE_STYLES[p.match_type].label}
                              </Badge>
                            )}
                          </div>
                          {p.match_reason && (
                            <p className="text-[9px] text-muted-foreground leading-tight max-w-40 mx-auto" title={p.match_reason}>
                              {p.match_reason}
                            </p>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {METRIC_ROWS.map((metric) => {
                    const bestVal = getBestValue(metric.key)
                    return (
                      <tr key={metric.key} className="transition-colors hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium text-muted-foreground">{metric.label}</td>
                        {compareResults.map((p) => {
                          const val = p[metric.key] as number | null
                          const isBest = bestVal !== null && val !== null && val === bestVal
                          return (
                            <td key={p.product_id} className={`px-4 py-3 text-center font-bold ${
                              isBest ? "text-emerald-600" : "text-foreground"
                            }`}>
                              <div className="flex items-center justify-center gap-1">
                                {isBest && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                                <span>{metric.format(val)}</span>
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
                {allSpecsKeys.length > 0 && (
                  <tbody className="divide-y border-t-2 border-muted">
                    <tr>
                      <td colSpan={compareResults.length + 1} className="bg-muted/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <span>Specifications</span>
                      </td>
                    </tr>
                    {allSpecsKeys.map((key) => (
                      <tr key={key} className="transition-colors hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium text-muted-foreground capitalize"><span>{key.replace(/_/g, " ")}</span></td>
                        {compareResults.map((p) => (
                          <td key={p.product_id} className="px-4 py-3 text-center text-foreground">
                            <span className="text-xs">{p.specs?.[key] ? String(p.specs[key]) : "-"}</span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>
          </CardContent>

          {/* Price History Chart */}
          <div className={chartData.length > 1 ? "block" : "hidden"}>
            <CardHeader className="border-t bg-muted/10 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <BarChart3 className="h-4 w-4 text-indigo-500" />
                <span>Price History (60 days)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} className="fill-muted-foreground" />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} className="fill-muted-foreground" domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: "12px" }} />
                  {compareResults.map((p, idx) => (
                    <Line
                      key={p.product_id}
                      type="monotone"
                      dataKey={String(p.product_id)}
                      name={p.product_name}
                      stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  )
}
