"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, RotateCcw, Store, Tag, Hash, Users, AlertCircle, CheckCircle2, PenLine, Eye } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type MarketBrandScope = {
  market_id: number
  company_name: string | null
  brand_name: string | null
  seller_id: number | null
  seller_name: string | null
  brands_count: number
  brands_list: string[]
  one_shot_count: number
  one_shot_list: string[]
  suffix_count: number
  suffix_list: string[]
  seller_count: number
  product_count_estimate: number
  last_discovered_at: string | null
  layer3_sample: { id: number; name: string; seller: string; price: number }[]
}

export default function BrandScopeAdminPage() {
  const [markets, setMarkets] = useState<MarketBrandScope[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState<Set<number>>(new Set())
  const [refreshingAll, setRefreshingAll] = useState(false)
  const [assignDialog, setAssignDialog] = useState<{ marketId: number; companyName: string } | null>(null)
  const [assignBrandName, setAssignBrandName] = useState("")
  const [assigning, setAssigning] = useState(false)
  const [detailDialog, setDetailDialog] = useState<MarketBrandScope | null>(null)

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch("/api/b2b/admin/brand-scope")
      if (res.ok) {
        const data = await res.json()
        setMarkets(data.markets ?? [])
      } else {
        toast.error("Failed to load brand scope data")
      }
    } catch {
      toast.error("Network error loading brand scope")
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function refreshMarket(marketId: number) {
    setRefreshing((prev) => new Set(prev).add(marketId))
    try {
      const res = await fetch(`/api/b2b/admin/brand-scope/${marketId}/refresh`, { method: "POST" })
      if (res.ok) {
        toast.success("Brand scope refreshed")
        await fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error ?? "Refresh failed")
      }
    } catch {
      toast.error("Network error during refresh")
    }
    setRefreshing((prev) => { const next = new Set(prev); next.delete(marketId); return next })
  }

  async function refreshAll() {
    setRefreshingAll(true)
    try {
      const res = await fetch("/api/b2b/admin/brand-scope/refresh-all", { method: "POST" })
      if (res.ok) {
        toast.success("All brand scopes refreshed")
        await fetchData()
      } else {
        toast.error("Refresh all failed")
      }
    } catch {
      toast.error("Network error during refresh all")
    }
    setRefreshingAll(false)
  }

  async function handleAssignBrand() {
    if (!assignDialog || !assignBrandName.trim()) return
    setAssigning(true)
    try {
      const res = await fetch(`/api/b2b/admin/brand-scope/${assignDialog.marketId}/assign-brand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_name: assignBrandName.trim() }),
      })
      if (res.ok) {
        toast.success("Brand assigned and discovery started")
        setAssignDialog(null)
        setAssignBrandName("")
        await fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error ?? "Failed to assign brand")
      }
    } catch {
      toast.error("Network error assigning brand")
    }
    setAssigning(false)
  }

  function timeAgo(dateStr: string | null): string {
    if (!dateStr) return "Never"
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    return `${days} days ago`
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Brand Scope Management</h1>
          <p className="text-sm text-muted-foreground">
            Monitor and refresh brand discovery across all B2B markets
          </p>
        </div>
        <Button onClick={refreshAll} disabled={refreshingAll || loading} variant="default">
          <RotateCcw className={`mr-2 size-4 ${refreshingAll ? "animate-spin" : ""}`} />
          {refreshingAll ? "Refreshing All..." : "Refresh All"}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Loading brand scope data...
        </div>
      ) : markets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Store className="size-8 opacity-50" />
          <p>No B2B markets found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((market) => (
            <Card key={market.market_id} className={market.brand_name ? "" : "opacity-50"}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {market.company_name ?? `Market #${market.market_id}`}
                    </CardTitle>
                    {market.brand_name ? (
                      <Badge variant="default" className="mt-1">
                        {market.brand_name}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="mt-1">No brand assigned</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {market.brand_name && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDetailDialog(market)}
                      >
                        <Eye className="size-3" />
                      </Button>
                    )}
                    {market.brand_name ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => refreshMarket(market.market_id)}
                        disabled={refreshing.has(market.market_id)}
                      >
                        <RefreshCw className={`mr-1 size-3 ${refreshing.has(market.market_id) ? "animate-spin" : ""}`} />
                        Refresh
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          setAssignDialog({ marketId: market.market_id, companyName: market.company_name ?? `Market #${market.market_id}` })
                          setAssignBrandName("")
                        }}
                      >
                        <PenLine className="mr-1 size-3" />
                        Assign Brand
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Store className="size-3.5" />
                    <span>{market.seller_name ?? `ID: ${market.seller_id}`}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Hash className="size-3.5" />
                    <span>~{market.product_count_estimate.toLocaleString()} products</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Tag className="size-3.5" />
                    <span>{market.brands_count} brands</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="size-3.5" />
                    <span>{market.seller_count} sellers</span>
                  </div>
                </div>
                {market.brands_list.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {market.brands_list.map((b) => (
                      <Badge key={b} variant="outline" className="text-[10px]">{b}</Badge>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>One-shot: {market.one_shot_count} kw</span>
                  <span className="text-border">|</span>
                  <span>Suffix: {market.suffix_count} kw</span>
                </div>
                {market.one_shot_list.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {market.one_shot_list.slice(0, 8).map((kw) => (
                      <Badge key={kw} variant="secondary" className="text-[10px]">{kw}</Badge>
                    ))}
                    {market.one_shot_list.length > 8 && (
                      <Badge variant="outline" className="text-[10px]">+{market.one_shot_list.length - 8}</Badge>
                    )}
                  </div>
                )}
                <div className="mt-2 text-xs text-muted-foreground">
                  Last sync: {timeAgo(market.last_discovered_at)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {assignDialog !== null && (
      <Dialog open onOpenChange={(open) => { if (!open) setAssignDialog(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Brand to {assignDialog?.companyName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Enter the brand name to assign to this market. This will trigger brand discovery immediately.
            </p>
            <Input
              placeholder="e.g. Apple, Samsung, Sony"
              value={assignBrandName}
              onChange={(e) => setAssignBrandName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAssignBrand() }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(null)}>Cancel</Button>
            <Button onClick={handleAssignBrand} disabled={!assignBrandName.trim() || assigning}>
              {assigning ? "Assigning..." : "Assign & Discover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}
      {detailDialog !== null && (
      <Dialog open onOpenChange={(open) => { if (!open) setDetailDialog(null) }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailDialog.company_name ?? `Market #${detailDialog.market_id}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="flex items-center gap-2">
              <Badge variant="default">{detailDialog.brand_name}</Badge>
              <span className="text-sm text-muted-foreground">~{detailDialog.product_count_estimate.toLocaleString()} products</span>
              <span className="text-xs text-muted-foreground">| {detailDialog.seller_name ?? `ID: ${detailDialog.seller_id}`}</span>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Discovered Brands ({detailDialog.brands_count})</h4>
              <div className="flex flex-wrap gap-1">
                {detailDialog.brands_list.map((b) => (
                  <Badge key={b} variant="outline" className="text-xs">{b}</Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">One-Shot Keywords ({detailDialog.one_shot_count})</h4>
              <div className="flex flex-wrap gap-1">
                {detailDialog.one_shot_list.length > 0 ? detailDialog.one_shot_list.map((kw) => (
                  <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
                )) : <p className="text-xs text-muted-foreground">None</p>}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Suffix Keywords ({detailDialog.suffix_count})</h4>
              <div className="flex flex-wrap gap-1">
                {detailDialog.suffix_list.length > 0 ? detailDialog.suffix_list.map((kw) => (
                  <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>
                )) : <p className="text-xs text-muted-foreground">None</p>}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Sellers ({detailDialog.seller_count})</h4>
              <p className="text-xs text-muted-foreground">Products discovered across {detailDialog.seller_count} sellers</p>
            </div>

            {detailDialog.layer3_sample.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Sample Products</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {detailDialog.layer3_sample.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded">
                      <span className="truncate max-w-[200px]">{p.name}</span>
                      <span className="text-muted-foreground">{p.seller} - {p.price} DT</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Last sync: {timeAgo(detailDialog.last_discovered_at)}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialog(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}
    </div>
  )
}
