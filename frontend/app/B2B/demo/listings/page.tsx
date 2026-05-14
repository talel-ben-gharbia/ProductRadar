"use client"

import React, { useState } from "react"
import { BookmarkCheck, BookmarkPlus, ChevronDown, ChevronRight, Download, Eye, Filter, Package, Search } from "lucide-react"
import Link from "next/link"

import { useDemo } from "../layout-client"
import { DEMO_LISTINGS } from "@/lib/demo-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { normalizeBreakdown, TrustBreakdown, RankBadge } from "@/components/B2B/b2b-utils"

export default function DemoListingsPage() {
  const [listings] = useState(DEMO_LISTINGS)
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

  const brands = [...new Set(listings.map((l) => l.productBrand ?? "").filter(Boolean))].sort()
  const categories = [...new Set(listings.map((l) => l.categoryName ?? "").filter(Boolean))].sort()

  const filtered = listings.filter((l) => {
    const name = String(l.productName ?? l.ref ?? "").toLowerCase()
    const matchesSearch = !search || name.includes(search.toLowerCase())
    const matchesCategory = !categoryFilter || l.categoryName === categoryFilter
    const matchesBrand = !brandFilter || l.productBrand === brandFilter
    const matchesStock = !stockFilter || (stockFilter === "true" ? l.availability : !l.availability)
    const ts = typeof l.trust_score === "number" ? l.trust_score : -1
    const matchesTrustMin = !trustMinFilter || ts >= Number(trustMinFilter)
    const matchesTrustMax = !trustMaxFilter || ts <= Number(trustMaxFilter)
    const pr = typeof l.price === "number" ? l.price : -1
    const matchesPriceMin = !priceMinFilter || pr >= Number(priceMinFilter)
    const matchesPriceMax = !priceMaxFilter || pr <= Number(priceMaxFilter)
    return matchesSearch && matchesCategory && matchesBrand && matchesStock && matchesTrustMin && matchesTrustMax && matchesPriceMin && matchesPriceMax
  })

  const handleTrack = (productId: number) => {
    setTrackingLoading((prev) => ({ ...prev, [productId]: true }))
    setTimeout(() => {
      setTrackedProducts((prev) => ({ ...prev, [productId]: Date.now() }))
      setTrackingLoading((prev) => ({ ...prev, [productId]: false }))
    }, 300)
  }

  const handleUntrack = (productId: number) => {
    setTrackedProducts((prev) => { const next = { ...prev }; delete next[productId]; return next })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Listings</h1>
          <p className="text-sm text-muted-foreground">All product listings linked to your seller account.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1.5">
            <Filter className="size-3.5" /> Filters
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="size-3.5" /> Export
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card className="border-border/50">
          <CardContent className="grid gap-4 p-4 sm:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Category</label>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Brand</label>
              <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">All Brands</option>
                {brands.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
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
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-16 text-center">
                    <Package className="mx-auto mb-3 size-10 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">No listings found</p>
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
                          <td className="px-4 py-3"><RankBadge rank={listing.vendor_rank} total={listing.total_sellers} /></td>
                          <td className="px-4 py-3 text-right font-mono text-sm">{typeof listing.price === "number" ? `${listing.price.toFixed(2)} DT` : "-"}</td>
                          <td className="px-4 py-3 text-center">
                            {typeof listing.trust_score === "number" ? (
                              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${listing.trust_score >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : listing.trust_score >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"}`}>
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
                                  <button type="button" disabled={isLoading}
                                    onClick={() => isTracked ? handleUntrack(pid) : handleTrack(pid)}
                                    className={`rounded-md p-1.5 transition-colors ${isTracked ? "text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                                    title={isTracked ? "Remove from watchlist" : "Add to watchlist"}>
                                    {isLoading ? <BookmarkCheck className="size-3.5" /> : isTracked ? <BookmarkCheck className="size-3.5" /> : <BookmarkPlus className="size-3.5" />}
                                  </button>
                                )
                              })()}
                              {Boolean(listing.trust_score_breakdown) && (
                                <button type="button" onClick={() => setExpandedId(isExpanded ? null : lid)}
                                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title="View trust score breakdown">
                                  {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                                </button>
                              )}
                              <Link href={`/B2B/demo/comparison?listingId=${listing.id}`}
                                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-indigo-600 inline-flex" title="Compare">
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
        </CardContent>
      </Card>
    </div>
  )
}
