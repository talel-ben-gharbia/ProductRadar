"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { BookmarkCheck, BookmarkPlus, ChevronDown, ChevronRight, Download, Eye, Filter, Loader2, Package, Search, TrendingUp, X } from "lucide-react"

import Link from "next/link"
import { useB2B } from "@/components/B2B/b2b-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import B2BErrorState from "@/components/B2B/b2b-error-state"
import { ListingFilters, type ActiveFilter } from "@/components/B2B/b2b-listing-filters"
import { normalizeBreakdown, TrustBreakdown, ordinalSuffix, RankBadge } from "@/components/B2B/b2b-utils"

import type { B2BListing as Listing, B2BPaginationInfo as PaginationInfo } from "@/types/b2b"


function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export default function ListingsPage() {
  const { firebaseUid } = useB2B()
  const [listings, setListings] = useState<Listing[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({ limit: 25, offset: 0, total: 0 })
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const [categoryFilter, setCategoryFilter] = useState("")
  const [brandFilter, setBrandFilter] = useState("")
  const [stockFilter, setStockFilter] = useState("")
  const [trustMinFilter, setTrustMinFilter] = useState("")
  const [trustMaxFilter, setTrustMaxFilter] = useState("")
  const [priceMinFilter, setPriceMinFilter] = useState("")
  const [priceMaxFilter, setPriceMaxFilter] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [priceHistoryProduct, setPriceHistoryProduct] = useState<number | null>(null)
  const [priceHistoryData, setPriceHistoryData] = useState<Record<string, unknown> | { merged: Record<string, string | number>[]; sellers: string[]; raw: Record<string, Array<{ recordedAt: string; recordedPrice: number }>> }>({})
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(false)
  const isMounted = useRef(false)
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        const names = (Array.isArray(data) ? data : data?.data ?? data?.categories ?? [])
          .map((c: Record<string, unknown>) => String(c.name ?? ""))
          .filter(Boolean)
        setAllCategories(names.sort())
      })
      .catch(() => setError("Failed to load categories"))
  }, [])

  const activeFilters = useMemo(() => [
    { key: "category", label: "Category", value: categoryFilter },
    { key: "brand", label: "Brand", value: brandFilter },
    { key: "stock", label: "Stock", value: stockFilter === "true" ? "In Stock" : stockFilter === "false" ? "Out of Stock" : "" },
    { key: "trust", label: "Trust", value: trustMinFilter || trustMaxFilter ? `${trustMinFilter || "0"}–${trustMaxFilter || "100"}` : "" },
    { key: "price", label: "Price", value: priceMinFilter || priceMaxFilter ? `${priceMinFilter || "0"}–${priceMaxFilter || "∞"}` : "" },
  ].filter((f) => f.value), [categoryFilter, brandFilter, stockFilter, trustMinFilter, trustMaxFilter, priceMinFilter, priceMaxFilter])

  const hasActiveFilters = activeFilters.length > 0
  const [trackedProducts, setTrackedProducts] = useState<Record<number, number>>({})
  const [trackingLoading, setTrackingLoading] = useState<Record<number, boolean>>({})
  const [fetchingWatchlist, setFetchingWatchlist] = useState(true)

  useEffect(() => {
    const fetchWatchlist = async () => {
      setFetchingWatchlist(true)
      try {
        const res = await fetch("/api/b2b/workspace?endpoint=watchlist")
        if (res.ok) {
          const json = await res.json()
          const map: Record<number, number> = {}
          for (const item of json.items ?? []) {
            if (item.product_id) map[item.product_id] = item.id
          }
          setTrackedProducts(map)
        }
      } catch {
        setError("Failed to load watchlist")
      } finally {
        setFetchingWatchlist(false)
      }
    }
    fetchWatchlist()
  }, [])

  const handleTrack = async (productId: number) => {
    setTrackingLoading((prev) => ({ ...prev, [productId]: true }))
    try {
      const res = await fetch("/api/b2b/workspace?endpoint=watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId }),
      })
      if (res.ok) {
        const json = await res.json()
        setTrackedProducts((prev) => ({ ...prev, [productId]: json.id }))
      }
    } catch {
      setError("Failed to add to watchlist")
    } finally {
      setTrackingLoading((prev) => ({ ...prev, [productId]: false }))
    }
  }

  const fetchPriceHistory = async (productId: number) => {
    if (priceHistoryProduct === productId) {
      setPriceHistoryProduct(null)
      return
    }
    setPriceHistoryLoading(true)
    setPriceHistoryProduct(productId)
    try {
      const res = await fetch(`/api/price-history?productId=${productId}`, { headers: { 'X-Firebase-Uid': firebaseUid ?? '' } })
      if (res.ok) {
        const raw = await res.json()
        // Group by seller name
        const grouped: Record<string, Array<{ recordedAt: string; recordedPrice: number }>> = {}
        for (const entry of raw) {
          const key = String(entry.sellerFromListingName ?? entry.listingId ?? "unknown")
          if (!grouped[key]) grouped[key] = []
          grouped[key].push({
            recordedAt: entry.recordedAt,
            recordedPrice: entry.recordedPrice,
          })
        }
        // Sort each group by date
        for (const key of Object.keys(grouped)) {
          grouped[key].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
        }
        // Merge by date for Recharts: { date, sellerA: price, sellerB: price, ... }
        const dateMap: Record<string, Record<string, number | string>> = {}
        for (const [seller, entries] of Object.entries(grouped)) {
          for (const entry of entries) {
            const dateKey = new Date(entry.recordedAt).toLocaleDateString()
            if (!dateMap[dateKey]) dateMap[dateKey] = { date: dateKey }
            dateMap[dateKey][seller] = entry.recordedPrice
          }
        }
        const merged = Object.values(dateMap).sort(
          (a, b) => new Date(String(a.date)).getTime() - new Date(String(b.date)).getTime()
        )
        setPriceHistoryData({ merged, sellers: Object.keys(grouped), raw: grouped })
      }
    } catch {
      setPriceHistoryData({})
    }
    setPriceHistoryLoading(false)
  }

  const handleUntrack = async (productId: number, watchlistId: number) => {
    setTrackingLoading((prev) => ({ ...prev, [productId]: true }))
    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=watchlist/${watchlistId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setTrackedProducts((prev) => {
          const next = { ...prev }
          delete next[productId]
          return next
        })
      }
    } catch {
      setError("Failed to remove from watchlist")
    } finally {
      setTrackingLoading((prev) => ({ ...prev, [productId]: false }))
    }
  }

  const [forceFetch, setForceFetch] = useState(0)
  const latestFetch = useRef(0)

  const debouncedBrand = useDebounce(brandFilter, 300)
  const debouncedTrustMin = useDebounce(trustMinFilter, 300)
  const debouncedTrustMax = useDebounce(trustMaxFilter, 300)
  const debouncedPriceMin = useDebounce(priceMinFilter, 300)
  const debouncedPriceMax = useDebounce(priceMaxFilter, 300)

  const fetchListings = useCallback(async (offset = 0) => {
    const fetchId = ++latestFetch.current
    if (!isMounted.current) {
      setInitialLoading(true)
    } else {
      setRefreshing(true)
    }
    try {
      const params = new URLSearchParams({ endpoint: "listings", limit: "25", offset: String(offset) })
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (categoryFilter) params.set("category", categoryFilter)
      if (brandFilter) params.set("brand", brandFilter)
      if (stockFilter) params.set("in_stock", stockFilter)
      if (trustMinFilter) params.set("trust_score_min", trustMinFilter)
      if (trustMaxFilter) params.set("trust_score_max", trustMaxFilter)
      if (priceMinFilter) params.set("price_min", priceMinFilter)
      if (priceMaxFilter) params.set("price_max", priceMaxFilter)
      if (sortBy) { params.set("sort_by", sortBy); params.set("sort_order", sortOrder) }
      const res = await fetch(`/api/b2b/workspace?${params}`)
      if (res.ok) {
        const data = await res.json()
        if (fetchId === latestFetch.current) {
          setListings(data.items ?? [])
          setPagination(data.pagination ?? { limit: 25, offset, total: 0 })
        }
      }
    } catch { setError("Failed to load listings") }
    if (!isMounted.current) {
      setInitialLoading(false)
      isMounted.current = true
    }
    setRefreshing(false)
  }, [debouncedSearch, categoryFilter, brandFilter, stockFilter, trustMinFilter, trustMaxFilter, priceMinFilter, priceMaxFilter, sortBy, sortOrder])

  useEffect(() => { fetchListings(0) }, [fetchListings, forceFetch])

  const exportCSV = () => {
    window.open(`/api/b2b/workspace?endpoint=listings/export`, "_blank")
  }

  const totalPages = Math.ceil(pagination.total / pagination.limit)
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
  }

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <th
      className="cursor-pointer select-none px-4 py-3 font-medium transition-colors hover:text-foreground"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortBy === field ? (
          <span className="text-[10px]">{sortOrder === "asc" ? "▲" : "▼"}</span>
        ) : (
          <span className="text-[10px] text-transparent">◇</span>
        )}
      </span>
    </th>
  )

  const handleClearAll = useCallback(() => {
    setCategoryFilter(""); setBrandFilter(""); setStockFilter("")
    setTrustMinFilter(""); setTrustMaxFilter("")
    setPriceMinFilter(""); setPriceMaxFilter("")
    setForceFetch(n => n + 1)
  }, [])

  const handleClearFilter = useCallback((key: string) => {
    if (key === "category") setCategoryFilter("")
    else if (key === "brand") { setBrandFilter(""); setForceFetch(n => n + 1) }
    else if (key === "stock") setStockFilter("")
    else if (key === "trust") { setTrustMinFilter(""); setTrustMaxFilter(""); setForceFetch(n => n + 1) }
    else if (key === "price") { setPriceMinFilter(""); setPriceMaxFilter(""); setForceFetch(n => n + 1) }
  }, [])

  return (
    <div className="space-y-6">
      <ListingFilters
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters((v) => !v)}
        hasActiveFilters={hasActiveFilters}
        activeFilters={activeFilters as ActiveFilter[]}
        allCategories={allCategories}
        search={search}
        onSearchChange={setSearch}
        onSearchClear={() => setSearch("")}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        brandFilter={brandFilter}
        onBrandFilterChange={setBrandFilter}
        stockFilter={stockFilter}
        onStockFilterChange={setStockFilter}
        trustMinFilter={trustMinFilter}
        trustMaxFilter={trustMaxFilter}
        onTrustMinChange={setTrustMinFilter}
        onTrustMaxChange={setTrustMaxFilter}
        priceMinFilter={priceMinFilter}
        priceMaxFilter={priceMaxFilter}
        onPriceMinChange={setPriceMinFilter}
        onPriceMaxChange={setPriceMaxFilter}
        onClearAll={handleClearAll}
        onClearFilter={handleClearFilter}
        onExport={exportCSV}
      />

      {error && (
        <B2BErrorState
          message={error}
          onRetry={() => { setError(null); setForceFetch(n => n + 1) }}
        />
      )}

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <SortHeader field="productName">Product</SortHeader>
                  <th className="px-4 py-3 font-medium">Brand</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <SortHeader field="vendor_rank">Position</SortHeader>
                  <SortHeader field="price">Price</SortHeader>
                  <SortHeader field="trust_score">Trust</SortHeader>
                  <th className="px-4 py-3 font-medium text-center">Stock</th>
                  <th className="px-4 py-3 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {initialLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-muted" /></td>
                      ))}
                    </tr>
                  ))
                ) : refreshing && listings.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-16 text-center">
                    <Loader2 className="mx-auto mb-3 size-8 animate-spin text-muted-foreground/40" />
                    <p className="text-sm font-medium text-muted-foreground">Applying filters...</p>
                  </td></tr>
                ) : listings.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-16 text-center">
                    <Package className="mx-auto mb-3 size-10 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">No listings found</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Add products to your catalog or adjust your filters to see listings here.</p>
                  </td></tr>
                ) : (
                  listings.map((listing) => {
                    const lid = String(listing.id ?? listing.ref ?? "")
                    const pid = listing.productId as number | undefined
                    const isExpanded = expandedId === lid
                    const isPriceHistoryOpen = priceHistoryProduct === pid
                    const phData = isPriceHistoryOpen && 'merged' in priceHistoryData && Array.isArray(priceHistoryData.merged)
                      ? (priceHistoryData as { merged: Record<string, string | number>[]; sellers: string[] })
                      : null
                    return (
                      <React.Fragment key={lid}>
                        <tr className="transition-colors hover:bg-muted/20">
                          <td className="max-w-[200px] truncate px-4 py-3 font-medium">{String(listing.productName ?? listing.ref ?? "-")}</td>
                          <td className="px-4 py-3 text-muted-foreground">{String(listing.productBrand ?? "-")}</td>
                          <td className="px-4 py-3 text-muted-foreground">{String(listing.categoryName ?? "-")}</td>
                          <td className="px-4 py-3">
                            <RankBadge rank={listing.vendor_rank} total={listing.total_sellers} />
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm">
                            {typeof listing.price === "number" ? `${listing.price.toFixed(2)} DT` : "-"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {typeof listing.trust_score === "number" ? (
                              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                                listing.trust_score >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" :
                                listing.trust_score >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" :
                                "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                              }`}>
                                {listing.trust_score.toFixed(0)}
                              </span>
                            ) : "-"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant={listing.availability === true ? "default" : "destructive"} className="text-[10px]">
                              {listing.availability === true ? "In Stock" : listing.availability === false ? "Out" : "—"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {(() => {
                                if (pid == null) return null
                                const isTracked = trackedProducts[pid] != null
                                const isLoading = trackingLoading[pid]
                                return (
                                  <button
                                    type="button"
                                    disabled={isLoading || fetchingWatchlist}
                                    onClick={() =>
                                      isTracked
                                        ? handleUntrack(pid, trackedProducts[pid])
                                        : handleTrack(pid)
                                    }
                                    className={`rounded-md p-1.5 transition-colors ${
                                      isTracked
                                        ? "text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }`}
                                    title={isTracked ? "Remove from watchlist" : "Add to watchlist"}
                                  >
                                    {isLoading ? (
                                      <Loader2 className="size-3.5 animate-spin" />
                                    ) : isTracked ? (
                                      <BookmarkCheck className="size-3.5" />
                                    ) : (
                                      <BookmarkPlus className="size-3.5" />
                                    )}
                                  </button>
                                )
                              })()}
                              {Boolean(listing.trust_score_breakdown) && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedId(isExpanded ? null : lid)}
                                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                  title="View trust score breakdown"
                                >
                                  {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                                </button>
                              )}
                              {pid != null && (
                                <button
                                  type="button"
                                  onClick={() => fetchPriceHistory(pid)}
                                  className={`rounded-md p-1.5 transition-colors ${
                                    isPriceHistoryOpen
                                      ? "text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/30"
                                      : "text-muted-foreground hover:bg-muted hover:text-indigo-600"
                                  }`}
                                  title="View price history"
                                >
                                  {priceHistoryLoading && priceHistoryProduct === pid ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <TrendingUp className="size-3.5" />
                                  )}
                                </button>
                              )}
                              <Link
                                href={`/B2B/dashboard/comparison?listingId=${listing.id}`}
                                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-indigo-600 inline-flex"
                                title="Compare with competitors"
                              >
                                <Eye className="size-3.5" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-muted/20">
                            <td colSpan={8} className="px-8 py-3">
                              <div className="rounded-xl border border-border/50 bg-background p-4">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trust Score Breakdown</p>
                                <TrustBreakdown breakdown={listing.trust_score_breakdown} />
                              </div>
                            </td>
                          </tr>
                        )}
                        {isPriceHistoryOpen && (
                          <tr className="bg-muted/20">
                            <td colSpan={8} className="px-8 py-3">
                              <div className="rounded-xl border border-border/50 bg-background p-4">
                                <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  <TrendingUp className="size-3.5 text-indigo-500" />
                                  Price History — {String(listing.productName ?? listing.ref ?? "Product")}
                                </p>
                                {priceHistoryLoading ? (
                                  <div className="flex h-48 items-center justify-center">
                                    <Loader2 className="size-6 animate-spin text-muted-foreground/40" />
                                  </div>
                                ) : !phData || phData.sellers.length === 0 || phData.merged.length === 0 ? (
                                  <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                                    No price history data available
                                  </div>
                                ) : (
                                  <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <LineChart data={phData.merged}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
                                        <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={10} className="fill-muted-foreground" />
                                        <YAxis tickLine={false} axisLine={false} fontSize={10} className="fill-muted-foreground" domain={['auto', 'auto']} />
                                        <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: "12px" }} />
                                        {phData.sellers.map((seller, idx) => {
                                          const colors = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"]
                                          const color = colors[idx % colors.length]
                                          return (
                                            <Line
                                              key={seller}
                                              type="monotone"
                                              dataKey={seller}
                                              stroke={color}
                                              strokeWidth={idx === 0 ? 2.5 : 1.5}
                                              dot={false}
                                              strokeDasharray={idx === 0 ? "none" : "3 2"}
                                              name={seller}
                                              connectNulls
                                            />
                                          )}
                                        )}
                                      </LineChart>
                                    </ResponsiveContainer>
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

          {pagination.total > pagination.limit && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Showing {pagination.offset + 1}–{Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => fetchListings(pagination.offset - pagination.limit)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => fetchListings(pagination.offset + pagination.limit)}>
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



