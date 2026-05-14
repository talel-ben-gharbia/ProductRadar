"use client"

import { useCallback, useEffect, useState } from "react"
import { Bookmark, BookmarkPlus, Eye, Heart, Search, Star, Trash2 } from "lucide-react"

import B2BErrorState from "@/components/B2B/b2b-error-state"
import { useB2B } from "@/components/B2B/b2b-context"
import { QuotaBar } from "@/components/B2B/b2b-quota-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

import type { B2BWatchlistItem as WatchlistItem } from "@/types/b2b"

function formatFollowedAt(value: string | null): string {
  if (!value) {
    return "Tracked recently"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "Tracked recently"
  }

  return `Tracked since ${date.toLocaleDateString()}`
}

export default function WatchlistPage() {
  const { isGold } = useB2B()
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<Array<{ id: number; name: string; brand: string | null }>>([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const maxItems = isGold ? 15 : 5

  const fetchWatchlist = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=watchlist`)
      if (res.ok) {
        const data = await res.json()
        setItems(data.items ?? [])
      }
    } catch {
      setFetchError("Failed to load watchlist")
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchWatchlist() }, [fetchWatchlist])

  const handleSearch = useCallback(async (q: string) => {
    setSearch(q)
    if (q.length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    setSearchError(null)
    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=watchlist/search&q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.items ?? [])
      }
    } catch {
      setSearchError("Failed to search products")
    }
    setSearching(false)
  }, [])

  const handleAdd = useCallback(async (productId: number) => {
    setAdding(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=watchlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId }),
      })
      if (res.ok) {
        setSearch("")
        setSearchResults([])
        fetchWatchlist()
      } else {
        const data = await res.json()
        setActionError(data.error ?? "Failed to add")
      }
    } catch {
      setActionError("Failed to add product to watchlist")
    }
    setAdding(false)
  }, [fetchWatchlist])

  const handleRemove = useCallback(async (id: number) => {
    try {
      setActionError(null)
      await fetch(`/api/b2b/workspace?endpoint=watchlist/${id}`, { method: "DELETE" })
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch {
      setActionError("Failed to remove product from watchlist")
    }
  }, [])

  const filtered = items.filter((i) =>
    i.product_name.toLowerCase().includes(search.toLowerCase()) ||
    (i.product_brand ?? "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Watchlist</h1>
          <QuotaBar usage={items.length} limit={maxItems} label="Tracked Products" />
        </div>
      </div>

      {/* Search to add products */}
      <Card className="border-border/50 border-dashed">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products to follow..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-10 pl-10"
            />
          </div>
          {search.length >= 2 && (
            <div className="mt-3 space-y-1">
              {searchError && (
                <B2BErrorState message={searchError} onRetry={() => setSearchError(null)} />
              )}
              {searching ? (
                <p className="py-2 text-center text-xs text-muted-foreground">Searching...</p>
              ) : searchResults.length === 0 ? (
                <p className="py-2 text-center text-xs text-muted-foreground">No products found</p>
              ) : (
                searchResults.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      {p.brand && <p className="text-xs text-muted-foreground">{p.brand}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAdd(p.id)}
                      disabled={adding || items.length >= maxItems}
                      className="gap-1 text-xs"
                    >
                      <BookmarkPlus className="size-3.5" />
                      Follow
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Watchlist items */}
      {fetchError && (
        <B2BErrorState message={fetchError} onRetry={() => { setFetchError(null); fetchWatchlist() }} />
      )}
      {actionError && (
        <B2BErrorState message={actionError} onRetry={() => setActionError(null)} />
      )}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-border/50"><CardContent className="p-6"><div className="h-24 animate-pulse rounded-lg bg-muted" /></CardContent></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <Heart className="size-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Your watchlist is empty</p>
            <p className="text-xs text-muted-foreground">Search for products above to start tracking them.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <Card key={item.id} className="group border-border/50 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{item.product_name}</h3>
                      {item.product_brand && (
                        <Badge variant="outline" className="text-[9px] shrink-0">{item.product_brand}</Badge>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {item.total_sellers} seller{item.total_sellers !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                    title="Remove from watchlist"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cheapest</p>
                    <p className="text-xl font-black">
                      {item.cheapest_price !== null ? `${item.cheapest_price.toFixed(2)} DT` : "-"}
                    </p>
                    {item.price_delta !== null && item.baseline_price !== null && (
                      <p className={`mt-0.5 text-[11px] font-semibold flex items-center gap-0.5 ${item.price_delta < 0 ? 'text-emerald-600' : item.price_delta > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {item.price_delta < 0 ? '↓' : item.price_delta > 0 ? '↑' : '→'}
                        {' '}{Math.abs(item.price_delta).toFixed(2)} DT
                        {' '}({((item.price_delta / item.baseline_price) * 100).toFixed(1)}%)
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Highest</p>
                    <p className="text-sm font-semibold text-muted-foreground">
                      {item.highest_price !== null ? `${item.highest_price.toFixed(2)} DT` : "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider">
                    {item.total_sellers} sellers
                  </Badge>
                  <span>{formatFollowedAt(item.followed_at)}</span>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" asChild className="flex-1 text-xs h-8">
                    <a href={`/B2B/dashboard/comparison?productId=${item.product_id}`}>
                      <Eye className="size-3 mr-1" /> Compare
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
