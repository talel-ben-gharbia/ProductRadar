"use client"

import { useState } from "react"
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ArrowDownRight, ArrowUpRight, BookmarkCheck, BookmarkPlus, TrendingUp } from "lucide-react"

import { useDemo } from "../layout-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DemoCompetitorPricingPage() {
  const { summary, isGold } = useDemo()
  const metrics = summary.metrics as Record<string, any>
  const data = ((metrics?.competitor_pricing ?? []) as any[])
  const trackingLimit = Number(metrics?.tracking_limit ?? 20)
  const [trackedProducts, setTrackedProducts] = useState<Record<number, number>>({})
  const [trackingLoading, setTrackingLoading] = useState<Record<number, boolean>>({})

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

  const chartData = data.slice(0, 10).map((item: any) => ({
    name: String(item.product_name ?? "Product").slice(0, 20),
    gap: Number(item.gap_to_cheapest ?? 0),
    vendor: Number(item.vendor_price ?? 0),
    cheapest: Number(item.cheapest_competitor_price ?? 0),
  }))

  const trackedCount = Object.keys(trackedProducts).length
  const avgGap = data.length > 0 ? data.reduce((s: number, d: any) => s + Number(d.gap_to_cheapest ?? 0), 0) / data.length : 0
  const undercut = data.filter((d: any) => Number(d.gap_to_cheapest ?? 0) > 0).length
  const pctUsed = trackingLimit > 0 ? Math.min(100, Math.round((trackedCount / trackingLimit) * 100)) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Competitor Pricing</h1>
        <p className="text-sm text-muted-foreground">Compare your prices against competitors across all your products.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Products Tracked</p>
            <p className="mt-2 text-3xl font-bold">{trackedCount} <span className="text-lg font-normal text-muted-foreground">/ {trackingLimit}</span></p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className={`h-full rounded-full transition-all ${pctUsed >= 90 ? "bg-red-500" : pctUsed >= 70 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pctUsed}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg Price Gap</p>
            <p className={`mt-2 text-3xl font-bold ${avgGap > 0 ? "text-red-600" : avgGap < 0 ? "text-emerald-600" : ""}`}>{avgGap > 0 ? "+" : ""}{avgGap.toFixed(2)} DT</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Products Undercut</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">{undercut}</p>
          </CardContent>
        </Card>
      </section>

      {trackedCount === 0 && (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-24">
            <BookmarkPlus className="mb-4 size-16 text-muted-foreground/20" />
            <h2 className="text-xl font-bold tracking-tight">Start Tracking Products</h2>
            <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">Add products to your watchlist to see competitor pricing, price gaps, and market insights.</p>
          </CardContent>
        </Card>
      )}

      {trackedCount > 0 && (
        <>
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="size-4 text-indigo-500" />Price Gap Chart</CardTitle>
              <CardDescription>Difference between your price and the cheapest competitor.</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/30" />
                    <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} fontSize={11} width={100} />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: "12px" }} />
                    <Bar dataKey="gap" radius={[0, 8, 8, 0]}>
                      {chartData.map((entry: any, index: number) => (<Cell key={index} fill={entry.gap > 0 ? "#ef4444" : "#22c55e"} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-sm text-muted-foreground">
                  <TrendingUp className="mb-2 size-8 opacity-30" />
                  <span>No competitor data available</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader><CardTitle>Detailed Comparison</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium text-right">Your Price</th>
                      <th className="px-4 py-3 font-medium text-right">Cheapest</th>
                      <th className="px-4 py-3 font-medium">Cheapest Seller</th>
                      <th className="px-4 py-3 font-medium text-right">Gap</th>
                      <th className="px-4 py-3 font-medium text-right">Market Avg</th>
                      <th className="px-4 py-3 font-medium text-center">Rank</th>
                      <th className="px-4 py-3 font-medium text-center">Track</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {data.map((row: any, i: number) => {
                      const gap = Number(row.gap_to_cheapest ?? 0)
                      const pid = row.product_id
                      const isTracked = pid != null && trackedProducts[pid] != null
                      const isLoading = pid != null && trackingLoading[pid]
                      return (
                        <tr key={pid ?? i} className="transition-colors hover:bg-muted/20">
                          <td className="max-w-[180px] truncate px-4 py-3 font-medium">{String(row.product_name ?? "-")}</td>
                          <td className="px-4 py-3 text-right font-mono">{Number(row.vendor_price ?? 0).toFixed(2)} DT</td>
                          <td className="px-4 py-3 text-right font-mono">{Number(row.cheapest_competitor_price ?? 0).toFixed(2)} DT</td>
                          <td className="px-4 py-3 text-muted-foreground">{String(row.competitor_seller_name ?? "-")}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-flex items-center gap-0.5 font-mono font-bold ${gap > 0 ? "text-red-600" : gap < 0 ? "text-emerald-600" : ""}`}>
                              {gap > 0 ? <ArrowUpRight className="size-3" /> : gap < 0 ? <ArrowDownRight className="size-3" /> : null}{gap > 0 ? "+" : ""}{gap.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-muted-foreground">{Number(row.market_average_price ?? 0).toFixed(2)} DT</td>
                          <td className="px-4 py-3 text-center"><Badge variant="outline" className="text-[10px]">#{row.vendor_rank ?? "-"}</Badge></td>
                          <td className="px-4 py-3 text-center">
                            {pid != null && (
                              <Button variant={isTracked ? "secondary" : "outline"} size="sm" disabled={isLoading}
                                onClick={() => isTracked ? handleUntrack(pid) : handleTrack(pid)} className="h-8 gap-1 text-xs">
                                {isTracked ? <BookmarkCheck className="size-3" /> : <BookmarkPlus className="size-3" />}
                                {isTracked ? "Tracked" : "Track"}
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
