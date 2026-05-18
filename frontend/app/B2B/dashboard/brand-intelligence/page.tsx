"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CheckCircle2, ChevronDown, ChevronRight, ChevronsUpDown,
  Eye, Package, RefreshCw, Search, ArrowUpDown,
  Store, Tag, XCircle, Shield,
} from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

type BrandProductSeller = {
  seller_name: string
  seller_id: number
  price: number | null
  old_price: number | null
  in_stock: boolean
  trust_score: number | null
  updated_at: string | null
  is_my_listing: boolean
}

type BrandProduct = {
  id: number
  name: string
  brand: string | null
  image_url: string | null
  category_name: string | null
  active_sellers: number
  lowest_price: number | null
  avg_trust: number | null
  oos_count: number
  total_listings: number
  sellers: BrandProductSeller[]
  is_own: boolean
}

type BrandScopeResponse = {
  brand_keywords: {
    brand_name: string | null
    brands: string[]
    seller_id: number | null
    last_discovered_at: string | null
  }
  brand_summary: { brand: string; product_count: number; listing_count: number; avg_trust: number | null }[]
  stats: { total_products: number; own_count: number; shared_count: number; other_count?: number }
}

type BrandProductsResponse = {
  products: BrandProduct[]
  stats: { total: number; own: number; shared: number; other?: number }
  pagination: { page: number; perPage: number; total: number; totalPages: number }
}

function toMoney(value: number | null): string {
  if (value === null) return "-"
  return `${value.toFixed(3)} DT`
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return ""
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function ProductCard({ product, sellerId, currentFilter }: { product: BrandProduct; sellerId: number | null; currentFilter: string }) {
  const [open, setOpen] = useState(false)
  const hasMyListing = product.sellers.some((s) => s.is_my_listing)
  const oosCount = product.sellers.filter((s) => !s.in_stock).length

  return (
    <Card className="border-border/50 overflow-hidden">
      <div
        onClick={() => setOpen(!open)}
        className="flex cursor-pointer items-center gap-4 p-4 transition-colors hover:bg-muted/30"
      >
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white p-2">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="size-full object-contain" />
          ) : (
            <Package className="size-6 text-slate-300" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium leading-snug">{product.name}</p>
            {currentFilter === "mine" && (
              <Badge variant="default" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-[10px] shrink-0">Mine</Badge>
            )}
            {currentFilter === "all" && product.is_own && (
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-[10px]">Confirmed</Badge>
            )}
            {hasMyListing && currentFilter !== "mine" && (
              <Badge variant="outline" className="border-emerald-200 text-emerald-600 text-[10px]">You sell this</Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">{product.category_name ?? "Uncategorized"}</Badge>
            <span className="text-xs text-muted-foreground">
              {product.active_sellers} seller{product.active_sellers !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="hidden text-right sm:block">
          <p className="font-bold text-orange-600">{toMoney(product.lowest_price)}</p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            {product.avg_trust !== null && <span>Trust {product.avg_trust.toFixed(0)}</span>}
            {oosCount > 0 && <span className="text-red-500">{oosCount} OOS</span>}
          </div>
        </div>
        <div className="shrink-0 text-muted-foreground">
          {open ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
        </div>
      </div>

      {open && (
        <div className="border-t bg-muted/20">
          {product.sellers.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">No active listings found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Seller</th>
                    <th className="px-4 py-2 font-medium text-right">Price</th>
                    <th className="px-4 py-2 font-medium text-right">Old Price</th>
                    <th className="px-4 py-2 font-medium text-center">Stock</th>
                    <th className="px-4 py-2 font-medium text-center">Trust</th>
                    <th className="px-4 py-2 font-medium text-right">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {product.sellers.map((seller, idx) => (
                    <tr key={idx} className={`transition-colors hover:bg-muted/20 ${seller.is_my_listing ? "bg-emerald-50/50 dark:bg-emerald-950/10" : ""}`}>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{seller.seller_name}{seller.is_my_listing ? " (You)" : ""}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right font-bold">
                        {seller.price ? `${seller.price.toFixed(3)} DT` : "-"}
                      </td>
                      <td className="px-4 py-2 text-right text-muted-foreground">
                        {seller.old_price ? `${seller.old_price.toFixed(3)} DT` : "-"}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {seller.in_stock ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <CheckCircle2 className="size-3.5" /> In Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                            <XCircle className="size-3.5" /> OOS
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {seller.trust_score !== null ? (
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                            seller.trust_score >= 80 ? "bg-emerald-100 text-emerald-700" :
                            seller.trust_score >= 50 ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"
                          }`}>{seller.trust_score.toFixed(0)}</span>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                        {timeAgo(seller.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

const PER_PAGE = 20

type SortKey = "name" | "price" | "sellers" | "trust"

export default function BrandIntelligencePage() {
  const { firebaseUid } = useB2B()

  const [brandScope, setBrandScope] = useState<BrandScopeResponse | null>(null)
  const [scopeLoading, setScopeLoading] = useState(true)
  const [allProducts, setAllProducts] = useState<BrandProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<"all" | "mine" | "shared" | "others">("all")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("sellers")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const brandName = brandScope?.brand_keywords?.brand_name
  const scopeStats = brandScope?.stats
  const sellerId = brandScope?.brand_keywords?.seller_id ?? null

  const loadProducts = useCallback(async (q: string) => {
    setLoading(true)
    setPage(1)
    try {
      const params = new URLSearchParams({ endpoint: "brand-products", page: "1", perPage: "2000", filter: "all" })
      if (q) params.set("search", q)
      const res = await fetch(`/api/b2b/workspace?${params}`)
      if (res.ok) {
        const data: BrandProductsResponse = await res.json()
        setAllProducts(data.products ?? [])
      }
    } catch {
      console.error("Failed to fetch brand products")
    }
    setLoading(false)
  }, [firebaseUid])

  const loadScope = useCallback(async () => {
    setScopeLoading(true)
    try {
      const res = await fetch("/api/b2b/workspace?endpoint=brand-scope")
      if (res.ok) {
        const data: BrandScopeResponse = await res.json()
        setBrandScope(data)
        if (data.brand_keywords?.brand_name) {
          loadProducts("")
        }
      }
    } catch {
      console.error("Failed to fetch brand scope")
    }
    setScopeLoading(false)
  }, [firebaseUid, loadProducts])

  useEffect(() => { loadScope() }, [loadScope])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await fetch("/api/b2b/workspace?endpoint=refresh-brand-scope", { method: "POST" })
      if (res.ok) {
        toast.success("Brand scope refreshed")
        setAllProducts([])
        await loadScope()
      } else {
        const data = await res.json()
        toast.error(data.error ?? "Refresh failed")
      }
    } catch {
      toast.error("Network error during refresh")
    }
    setRefreshing(false)
  }

  const doSearch = useCallback(() => {
    loadProducts(searchInput)
  }, [searchInput, loadProducts])

  const availableCategories = useMemo(() => {
    const cats = new Set<string>()
    for (const p of allProducts) {
      if (p.category_name) cats.add(p.category_name)
    }
    return Array.from(cats).sort()
  }, [allProducts])

  const changeFilter = useCallback((f: "all" | "mine" | "shared" | "others") => {
    setFilter(f)
    setPage(1)
  }, [])

  const changeCategory = useCallback((cat: string) => {
    setCategoryFilter(cat === "__all" ? "" : cat)
    setPage(1)
  }, [])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"))
    } else {
      setSortKey(key)
      setSortDir(key === "name" ? "asc" : "desc")
    }
    setPage(1)
  }

  const visibleProducts = useMemo(() => {
    let result = allProducts
    if (filter === "mine") result = allProducts.filter((p) => {
      const hasMy = p.sellers.some((s) => s.is_my_listing)
      const hasOther = p.sellers.some((s) => !s.is_my_listing)
      return hasMy && !hasOther
    })
    else if (filter === "shared") result = allProducts.filter((p) => {
      const hasMy = p.sellers.some((s) => s.is_my_listing)
      const hasOther = p.sellers.some((s) => !s.is_my_listing)
      return hasMy && hasOther
    })
    else if (filter === "others") result = allProducts.filter((p) => {
      return !p.sellers.some((s) => s.is_my_listing)
    })
    if (categoryFilter) {
      result = result.filter((p) => p.category_name === categoryFilter)
    }
    result = [...result]
    result.sort((a, b) => {
      let cmp = 0
      if (sortKey === "name") cmp = a.name.localeCompare(b.name)
      else if (sortKey === "price") cmp = (a.lowest_price ?? 99999) - (b.lowest_price ?? 99999)
      else if (sortKey === "sellers") cmp = a.active_sellers - b.active_sellers
      else if (sortKey === "trust") cmp = (a.avg_trust ?? 0) - (b.avg_trust ?? 0)
      return sortDir === "desc" ? -cmp : cmp
    })
    return result
  }, [allProducts, filter, categoryFilter, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(visibleProducts.length / PER_PAGE))
  const safePage = page > totalPages ? totalPages : page
  const pageStart = (safePage - 1) * PER_PAGE
  const pageProducts = visibleProducts.slice(pageStart, pageStart + PER_PAGE)

  const handlePrev = () => setPage(Math.max(1, safePage - 1))
  const handleNext = () => setPage(Math.min(totalPages, safePage + 1))

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ChevronsUpDown className="ml-1 size-3 opacity-30" />
    return <ArrowUpDown className={`ml-1 size-3 ${sortDir === "desc" ? "text-indigo-500" : "text-indigo-500 rotate-180"}`} />
  }

  const brandBreakdown = brandScope?.brand_summary ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Brand Intelligence</h1>
          <p className="text-sm text-muted-foreground">
            {brandName ? `${brandName} products across all sellers` : "Brand discovery for your market account"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {brandName && (
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`mr-2 size-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Syncing..." : "Sync"}
            </Button>
          )}
        </div>
      </div>

      {scopeLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : !brandName ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Eye className="mb-3 size-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No brand assigned to this market yet.</p>
            <p className="text-xs text-muted-foreground mt-1">An admin must assign a brand name during approval.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-border/50 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/10">
            <CardContent className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                      <Store className="size-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{brandName}</h2>
                      <p className="text-sm text-muted-foreground">
                        {scopeStats?.total_products ?? 0} products across all sellers
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-600">{scopeStats?.own_count ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Exclusive</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{scopeStats?.shared_count ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Shared</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-600">{scopeStats?.other_count ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Other Sellers</p>
                  </div>
                </div>
              </div>
              {brandScope?.brand_keywords?.last_discovered_at && (
                <p className="mt-2 text-xs text-muted-foreground">Last synced: {timeAgo(brandScope.brand_keywords.last_discovered_at)}</p>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center gap-2">
            <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => changeFilter("all")}>
              All ({allProducts.length})
            </Button>
            <Button variant={filter === "mine" ? "default" : "outline"} size="sm" onClick={() => changeFilter("mine")}>
              <Store className="mr-1 size-3.5" /> Exclusive
            </Button>
            <Button variant={filter === "shared" ? "default" : "outline"} size="sm" onClick={() => changeFilter("shared")}>
              <Tag className="mr-1 size-3.5" /> Shared
            </Button>
            <Button variant={filter === "others" ? "default" : "outline"} size="sm" onClick={() => changeFilter("others")}>
              <Eye className="mr-1 size-3.5" /> Other Sellers
            </Button>
            {availableCategories.length > 0 && (
              <Select value={categoryFilter || "__all"} onValueChange={changeCategory}>
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All categories</SelectItem>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Search className="size-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") doSearch() }}
                className="h-8 w-48 text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
            </div>
          ) : visibleProducts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <Package className="mb-3 size-10 text-muted-foreground/30" />
                <p className="text-sm font-medium">No products found</p>
                <p className="text-xs text-muted-foreground">
                  {filter === "mine" ? "No products where you're the exclusive seller." :
                   filter === "shared" ? "No products where you compete with other sellers." :
                   filter === "others" ? "No products from other sellers only." :
                   "No brand-matching products discovered yet. Sync to refresh."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {brandBreakdown.length > 0 && (
                <Card className="border-border/50 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm"><Shield className="size-3.5 text-indigo-500" />Brand Variants</CardTitle>
                    <CardDescription className="text-xs">Products grouped by brand variant name.</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-3 pt-0">
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {brandBreakdown.slice(0, 8).map((b) => (
                        <div key={b.brand} className="rounded-lg border border-border/50 px-3 py-2">
                          <p className="text-xs font-medium truncate">{b.brand}</p>
                          <p className="text-lg font-bold">{b.product_count} <span className="text-xs font-normal text-muted-foreground">products</span></p>
                          {b.avg_trust !== null && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                                <div className={`h-full rounded-full ${b.avg_trust >= 80 ? "bg-emerald-500" : b.avg_trust >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${b.avg_trust}%` }} />
                              </div>
                              <span className="text-[10px] text-muted-foreground font-mono">{b.avg_trust.toFixed(0)}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div className="space-y-2">
                {pageProducts.map((p) => <ProductCard key={p.id} product={p} sellerId={sellerId} currentFilter={filter} />)}
              </div>
            </>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={handlePrev}>Previous</Button>
              <span className="text-xs text-muted-foreground">
                Page {safePage} of {totalPages} ({visibleProducts.length} products)
              </span>
              <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={handleNext}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
