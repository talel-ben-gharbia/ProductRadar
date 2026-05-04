"use client"

import { useCallback, useEffect, useState } from "react"
import { Download, Filter, Package, Search } from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type Listing = Record<string, unknown>
type PaginationInfo = { limit: number; offset: number; total: number }

export default function ListingsPage() {
  const { firebaseUid } = useB2B()
  const [listings, setListings] = useState<Listing[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({ limit: 25, offset: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [stockFilter, setStockFilter] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  const fetchListings = useCallback(async (offset = 0) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ endpoint: "listings", limit: "25", offset: String(offset) })
      if (categoryFilter) params.set("category", categoryFilter)
      if (stockFilter) params.set("in_stock", stockFilter)
      const res = await fetch(`/api/b2b/workspace?${params}`)
      if (res.ok) {
        const data = await res.json()
        setListings(data.items ?? [])
        setPagination(data.pagination ?? { limit: 25, offset, total: 0 })
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [categoryFilter, stockFilter])

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
          <CardContent className="grid gap-4 p-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Category</label>
              <Input placeholder="Filter by category..." value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Stock Status</label>
              <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">All</option>
                <option value="true">In Stock</option>
                <option value="false">Out of Stock</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button size="sm" onClick={() => fetchListings(0)} className="h-9">Apply</Button>
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
                  <th className="px-4 py-3 font-medium">Seller</th>
                  <th className="px-4 py-3 font-medium text-right">Price</th>
                  <th className="px-4 py-3 font-medium text-center">Trust</th>
                  <th className="px-4 py-3 font-medium text-center">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-muted" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No listings found</td></tr>
                ) : (
                  filtered.map((listing) => (
                    <tr key={String(listing.id ?? listing.ref)} className="transition-colors hover:bg-muted/20">
                      <td className="max-w-[200px] truncate px-4 py-3 font-medium">{String(listing.productName ?? listing.ref ?? "-")}</td>
                      <td className="px-4 py-3 text-muted-foreground">{String(listing.productBrand ?? "-")}</td>
                      <td className="px-4 py-3 text-muted-foreground">{String(listing.categoryName ?? "-")}</td>
                      <td className="px-4 py-3 text-muted-foreground">{String(listing.sellerName ?? "-")}</td>
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
