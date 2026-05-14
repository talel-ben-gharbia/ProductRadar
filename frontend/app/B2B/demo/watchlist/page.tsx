"use client"

import { useState } from "react"
import { BookmarkPlus, Eye, Heart, Search, Trash2 } from "lucide-react"

import { useDemo } from "../layout-client"
import { DEMO_WATCHLIST, WATCHLIST_SEARCH_RESULTS } from "@/lib/demo-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function DemoWatchlistPage() {
  const { isGold } = useDemo()
  const [items, setItems] = useState<any[]>(DEMO_WATCHLIST)
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<Array<{ id: number; name: string; brand: string | null }>>([])
  const [searching, setSearching] = useState(false)

  const maxItems = isGold ? 15 : 5

  const handleSearch = (q: string) => {
    setSearch(q)
    if (q.length < 2) { setSearchResults([]); return }
    setSearching(true)
    setTimeout(() => {
      setSearchResults(WATCHLIST_SEARCH_RESULTS.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())))
      setSearching(false)
    }, 200)
  }

  const handleAdd = (productId: number) => {
    const found = WATCHLIST_SEARCH_RESULTS.find((r) => r.id === productId)
    if (!found) return
    setItems((prev) => [
      ...prev,
      { id: Date.now(), product_id: productId, product_name: found.name, product_image: null, product_brand: found.brand, followed_at: new Date().toISOString(), cheapest_price: null, highest_price: null, total_sellers: 0 },
    ])
    setSearch("")
    setSearchResults([])
  }

  const handleRemove = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const filtered = items.filter((i) =>
    i.product_name.toLowerCase().includes(search.toLowerCase()) ||
    (i.product_brand ?? "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Watchlist</h1>
          <p className="text-sm text-muted-foreground">{items.length} of {maxItems} products tracked</p>
        </div>
      </div>

      <Card className="border-border/50 border-dashed">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search products to follow..." value={search} onChange={(e) => handleSearch(e.target.value)} className="h-10 pl-10" />
          </div>
          {search.length >= 2 && (
            <div className="mt-3 space-y-1">
              {searching ? <p className="py-2 text-center text-xs text-muted-foreground">Searching...</p>
              : searchResults.length === 0 ? <p className="py-2 text-center text-xs text-muted-foreground">No products found</p>
              : searchResults.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    {p.brand && <p className="text-xs text-muted-foreground">{p.brand}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleAdd(p.id)} disabled={items.length >= maxItems} className="gap-1 text-xs">
                    <BookmarkPlus className="size-3.5" /> Follow
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
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
                      {item.product_brand && <Badge variant="outline" className="text-[9px] shrink-0">{item.product_brand}</Badge>}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{item.total_sellers} seller{item.total_sellers !== 1 ? "s" : ""}</p>
                  </div>
                  <button type="button" onClick={() => handleRemove(item.id)}
                    className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cheapest</p>
                    <p className="text-xl font-black">{item.cheapest_price !== null ? `${item.cheapest_price.toFixed(2)} DT` : "-"}</p>
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
                    <p className="text-sm font-semibold text-muted-foreground">{item.highest_price !== null ? `${item.highest_price.toFixed(2)} DT` : "-"}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider">{item.total_sellers} sellers</Badge>
                  <span>{item.followed_at ? `Tracked since ${new Date(item.followed_at).toLocaleDateString()}` : "Tracked recently"}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" asChild className="flex-1 text-xs h-8">
                    <a href={`/B2B/demo/comparison?productId=${item.product_id}`}><Eye className="size-3 mr-1" /> Compare</a>
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
