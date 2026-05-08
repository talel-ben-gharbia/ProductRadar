"use client"

import React, { useCallback, useEffect, useState } from "react"
import { BookmarkCheck, BookmarkPlus, ChevronDown, ChevronRight, Download, Eye, Filter, Loader2, Package, Search } from "lucide-react"

import Link from "next/link"
import { useB2B } from "@/components/B2B/b2b-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type Listing = Record<string, unknown>
type PaginationInfo = { limit: number; offset: number; total: number }

function normalizeBreakdown(b: Record<string, unknown> | null): Record<string, Record<string, unknown>> | null {
  if (b?.components) return b.components as Record<string, Record<string, unknown>>
  const h = (b?.history ?? {}) as Record<string, unknown>
  const l = (b?.listing ?? {}) as Record<string, unknown>
  if (typeof h.price_stability !== 'number' && typeof l.freshness !== 'number' && typeof l.seller_score !== 'number') return null
  const comps: Record<string, Record<string, unknown>> = {}
  if (typeof h.price_stability === 'number') comps.price_stability = { score: Math.round(h.price_stability * 100) }
  if (typeof h.stock_reliability === 'number') comps.stock_consistency = { score: Math.round(h.stock_reliability * 100) }
  if (typeof h.anomaly_reliability === 'number') comps.anomaly_penalty = { score: Math.round(h.anomaly_reliability * 100) }
  if (typeof l.freshness === 'number') comps.data_freshness = { score: Math.round(l.freshness * 100) }
  if (typeof l.seller_score === 'number') comps.seller_reliability = { score: Math.round(l.seller_score * 100) }
  return Object.keys(comps).length > 0 ? comps : null
}

function TrustBreakdown({ breakdown }: { breakdown: unknown }) {
  const b = typeof breakdown === "object" && breakdown !== null ? breakdown as Record<string, unknown> : null
  const comps = normalizeBreakdown(b)
  if (!comps) return <span className="text-xs text-muted-foreground">No breakdown data</span>

  const labels: Record<string, string> = {
    price_stability: "Price Stability",
    seller_reliability: "Seller Reliability",
    stock_consistency: "Stock Consistency",
    data_freshness: "Data Freshness",
    anomaly_penalty: "Anomaly Penalty",
  }

  const items = Object.entries(comps).map(([key, val]) => {
    const score = typeof val?.score === "number" ? val.score : 0
    const pct = Math.min(100, Math.max(0, score))
    const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"
    return { key, label: labels[key] ?? key, pct, color }
  })

  return (
    <div className="space-y-2 py-2">
      {items.map(({ key, label, pct, color }) => (
        <div key={key} className="grid grid-cols-[140px_1fr_40px] items-center gap-2 text-xs">
          <span className="text-right font-medium text-muted-foreground">{label}</span>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="font-mono text-right text-xs font-bold">{pct.toFixed(0)}</span>
        </div>
      ))}
    </div>
  )
}

function RankBadge({ rank, total }: { rank?: unknown; total?: unknown }) {
  const r = typeof rank === "number" ? rank : null
  const t = typeof total === "number" ? total : null
  if (r === null || t === null || t === 0) return <span className="text-xs text-muted-foreground">—</span>
  const color = r === 1
    ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400"
    : r === t
      ? "text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400"
      : "text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400"
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${color}`}>
      {r}{ordinalSuffix(r)} / {t}
    </span>
  )
}

function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return s[(v - 20) % 10] ?? s[v] ?? s[0]
}

export default function ListingsPage() {
  const { firebaseUid } = useB2B()
  const [listings, setListings] = useState<Listing[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({ limit: 25, offset: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [brandFilter, setBrandFilter] = useState("")
  const [stockFilter, setStockFilter] = useState("")
  const [trustMinFilter, setTrustMinFilter] = useState("")
  const [trustMaxFilter, setTrustMaxFilter] = useState("")
  const [priceMinFilter, setPriceMinFilter] = useState("")
  const [priceMaxFilter, setPriceMaxFilter] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
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
    } finally {
      setTrackingLoading((prev) => ({ ...prev, [productId]: false }))
    }
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
    } finally {
      setTrackingLoading((prev) => ({ ...prev, [productId]: false }))
    }
  }

  const fetchListings = useCallback(async (offset = 0) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ endpoint: "listings", limit: "25", offset: String(offset) })
      if (categoryFilter) params.set("category", categoryFilter)
      if (brandFilter) params.set("brand", brandFilter)
      if (stockFilter) params.set("in_stock", stockFilter)
      if (trustMinFilter) params.set("trust_score_min", trustMinFilter)
      if (trustMaxFilter) params.set("trust_score_max", trustMaxFilter)
      if (priceMinFilter) params.set("price_min", priceMinFilter)
      if (priceMaxFilter) params.set("price_max", priceMaxFilter)
      const res = await fetch(`/api/b2b/workspace?${params}`)
      if (res.ok) {
        const data = await res.json()
        setListings(data.items ?? [])
        setPagination(data.pagination ?? { limit: 25, offset, total: 0 })
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [categoryFilter, brandFilter, stockFilter, trustMinFilter, trustMaxFilter, priceMinFilter, priceMaxFilter])

  useEffect(() => { fetchListings(0) }, [fetchListings])

  const filtered = search
    ? listings.filter((l) => {
        const name = String(l.productName ?? l.ref ?? "").toLowerCase()
        return name.includes(search.toLowerCase())
      })
    : listings

  const totalPages = Math.ceil(pagination.total / pagination.limit)
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Listings</h1>
          <p className="text-sm text-muted-foreground">All product listings linked to your seller account.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1.5">
            <Filter className="size-3.5" />
            Filters
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="size-3.5" />
            Export
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card className="border-border/50">
          <CardContent className="grid gap-4 p-4 sm:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Category</label>
              <Input placeholder="Filter by category..." value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Brand</label>
              <Input placeholder="Filter by brand..." value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Stock Status</label>
              <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">All</option>
                <option value="true">In Stock</option>
                <option value="false">Out of Stock</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Trust Min</label>
                <Input type="number" min={0} max={100} placeholder="0" value={trustMinFilter} onChange={(e) => setTrustMinFilter(e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Trust Max</label>
                <Input type="number" min={0} max={100} placeholder="100" value={trustMaxFilter} onChange={(e) => setTrustMaxFilter(e.target.value)} className="h-9" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Price Min</label>
                <Input type="number" min={0} placeholder="0" value={priceMinFilter} onChange={(e) => setPriceMinFilter(e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Price Max</label>
                <Input type="number" min={0} placeholder="999" value={priceMaxFilter} onChange={(e) => setPriceMaxFilter(e.target.value)} className="h-9" />
              </div>
            </div>
            <div className="flex items-end">
              <Button size="sm" onClick={() => fetchListings(0)} className="h-9 w-full">Apply Filters</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search listings..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 pl-10" />
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Brand</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Position</th>
                  <th className="px-4 py-3 font-medium text-right">Price</th>
                  <th className="px-4 py-3 font-medium text-center">Trust</th>
                  <th className="px-4 py-3 font-medium text-center">Stock</th>
                  <th className="px-4 py-3 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-muted" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-16 text-center">
                    <Package className="mx-auto mb-3 size-10 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">No listings found</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Add products to your catalog or adjust your filters to see listings here.</p>
                  </td></tr>
                ) : (
                  filtered.map((listing) => {
                    const lid = String(listing.id ?? listing.ref ?? "")
                    const isExpanded = expandedId === lid
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
                                const pid = listing.productId as number | undefined
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
