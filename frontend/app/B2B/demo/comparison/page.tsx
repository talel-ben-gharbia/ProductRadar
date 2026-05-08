"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import React, { Suspense, useState } from "react"
import { ArrowLeft, BarChart3, CheckCircle2, Clock, Eye, TrendingDown, TrendingUp, XCircle } from "lucide-react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { DEMO_COMPARISON_DATA } from "@/lib/demo-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function normalizeBreakdown(b: any): Record<string, any> | null {
  if (b?.components) return b.components
  const h = b?.history ?? {}
  const l = b?.listing ?? {}
  if (typeof h.price_stability !== 'number' && typeof l.freshness !== 'number' && typeof l.seller_score !== 'number') return null
  const comps: Record<string, any> = {}
  if (typeof h.price_stability === 'number') comps.price_stability = { score: Math.round(h.price_stability * 100) }
  if (typeof h.stock_reliability === 'number') comps.stock_consistency = { score: Math.round(h.stock_reliability * 100) }
  if (typeof h.anomaly_reliability === 'number') comps.anomaly_penalty = { score: Math.round(h.anomaly_reliability * 100) }
  if (typeof l.freshness === 'number') comps.data_freshness = { score: Math.round(l.freshness * 100) }
  if (typeof l.seller_score === 'number') comps.seller_reliability = { score: Math.round(l.seller_score * 100) }
  return Object.keys(comps).length > 0 ? comps : null
}

function TrustBreakdown({ breakdown }: { breakdown: any }) {
  const comps = normalizeBreakdown(breakdown)
  if (!comps) return <span className="text-xs text-muted-foreground">No data</span>
  const labels: Record<string, string> = {
    price_stability: "Price Stability", seller_reliability: "Seller Reliability",
    stock_consistency: "Stock Consistency", data_freshness: "Data Freshness", anomaly_penalty: "Anomaly Penalty",
  }
  return (
    <div className="space-y-1.5">
      {Object.entries(comps).map(([key, val]: [string, any]) => {
        const pct = Math.min(100, Math.max(0, typeof val?.score === "number" ? val.score : 0))
        const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"
        return (
          <div key={key} className="grid grid-cols-[130px_1fr_36px] items-center gap-2 text-xs">
            <span className="text-right font-medium text-muted-foreground truncate">{labels[key] ?? key}</span>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="font-mono text-right text-xs font-bold">{pct.toFixed(0)}</span>
          </div>
        )
      })}
    </div>
  )
}

function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return s[(v - 20) % 10] ?? s[v] ?? s[0]
}

export default function DemoComparisonPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24 text-muted-foreground">Loading...</div>}>
      <DemoComparisonContent />
    </Suspense>
  )
}

function DemoComparisonContent() {
  const searchParams = useSearchParams()
  const listingId = searchParams.get("listingId")
  const [expandedChart, setExpandedChart] = useState<number | null>(null)
  const [expandedTrust, setExpandedTrust] = useState<number | null>(null)

  const data = listingId ? DEMO_COMPARISON_DATA[listingId] : null

  if (!listingId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Eye className="mb-4 size-12 text-muted-foreground/30" />
        <h2 className="text-lg font-semibold">No listing selected</h2>
        <p className="mt-1 text-sm text-muted-foreground">Select a listing from the listings page to compare.</p>
        <Button variant="outline" asChild className="mt-4"><Link href="/B2B/demo/listings">View Listings</Link></Button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Eye className="mb-4 size-12 text-muted-foreground/30" />
        <h2 className="text-lg font-semibold">Comparison data not available for this listing</h2>
        <Button variant="outline" asChild className="mt-4"><Link href="/B2B/demo/listings">Back to Listings</Link></Button>
      </div>
    )
  }

  const allListings = data.vendor_listing
    ? [data.vendor_listing, ...data.competitors.filter((c: any) => c.listing_id !== data.vendor_listing.listing_id)]
    : data.competitors

  const stats = data.stats

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href="/B2B/demo/listings"><ArrowLeft className="size-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{data.product.name}</h1>
            <p className="text-sm text-muted-foreground">{data.product.brand ?? "No brand"} &middot; {stats.total_sellers} seller{stats.total_sellers !== 1 ? "s" : ""}</p>
          </div>
        </div>
        {data.vendor_listing && stats.vendor_rank && (
          <Badge className={`text-xs px-3 py-1 ${stats.vendor_rank === 1 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : stats.vendor_rank === stats.total_sellers ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"}`}>
            {stats.vendor_rank}{ordinalSuffix(stats.vendor_rank)} of {stats.total_sellers}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-border/50 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-900">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Cheapest</p>
            <p className="mt-1 text-xl font-black">{stats.cheapest_price ? `${stats.cheapest_price.toFixed(2)} DT` : "-"}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-slate-900">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Most Expensive</p>
            <p className="mt-1 text-xl font-black">{stats.highest_price ? `${stats.highest_price.toFixed(2)} DT` : "-"}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-slate-900">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Price Range</p>
            <p className="mt-1 text-xl font-black">{stats.cheapest_price && stats.highest_price ? `${(stats.highest_price - stats.cheapest_price).toFixed(2)} DT` : "-"}</p>
          </CardContent>
        </Card>
        {data.vendor_listing && (
          <Card className="border-border/50 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-900">
            <CardContent className="p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Your Price Position</p>
              <p className="mt-1 text-xl font-black">{stats.vendor_rank ? `${stats.vendor_rank}${ordinalSuffix(stats.vendor_rank)}` : "-"}</p>
              {stats.cheapest_price && data.vendor_listing.price && (
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {data.vendor_listing.price > stats.cheapest_price
                    ? `${((data.vendor_listing.price - stats.cheapest_price) / stats.cheapest_price * 100).toFixed(1)}% above cheapest`
                    : data.vendor_listing.price < stats.cheapest_price
                      ? "Below cheapest!"
                      : "At cheapest price"}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Seller</th>
                  <th className="px-4 py-3 font-medium text-right">Price</th>
                  <th className="px-4 py-3 font-medium text-right">Old Price</th>
                  <th className="px-4 py-3 font-medium text-center">Change</th>
                  <th className="px-4 py-3 font-medium text-center">Trust</th>
                  <th className="px-4 py-3 font-medium text-center">Stock</th>
                  <th className="px-4 py-3 font-medium text-center">History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {allListings.map((entry: any) => {
                  const price = entry.price ?? 0
                  const oldPrice = entry.old_price
                  const change = oldPrice && oldPrice > 0 ? ((price - oldPrice) / oldPrice) * 100 : null
                  const hasBreakdown = entry.trust_score_breakdown != null && !entry.is_vendor
                  const isTrustExpanded = expandedTrust === entry.listing_id
                  return (
                    <React.Fragment key={entry.listing_id}>
                      <tr className={`transition-colors hover:bg-muted/20 ${entry.is_vendor ? "bg-indigo-50/50 dark:bg-indigo-950/20 ring-1 ring-inset ring-indigo-200 dark:ring-indigo-800" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{entry.seller_name}</span>
                            {entry.is_vendor && <Badge variant="secondary" className="text-[9px] uppercase tracking-wider">You</Badge>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          {price ? `${price.toFixed(2)} DT` : "-"}
                          {entry.is_vendor && <span className="ml-1 text-[10px] text-indigo-500">&#10003;</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">{oldPrice ? `${oldPrice.toFixed(2)} DT` : "-"}</td>
                        <td className="px-4 py-3 text-center">
                          {change !== null ? (
                            <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${change <= 0 ? "text-emerald-600" : "text-red-600"}`}>
                              {change <= 0 ? <TrendingDown className="size-3" /> : <TrendingUp className="size-3" />}
                              {Math.abs(change).toFixed(1)}%
                            </span>
                          ) : "-"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {entry.trust_score !== null ? (
                            <button type="button" disabled={!hasBreakdown}
                              onClick={() => setExpandedTrust(isTrustExpanded ? null : entry.listing_id)}
                              className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold transition-colors ${entry.trust_score >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : entry.trust_score >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"} ${hasBreakdown ? "cursor-pointer hover:ring-2 hover:ring-inset hover:ring-indigo-400/50" : "cursor-default"}`}>
                              {entry.trust_score.toFixed(0)}
                            </button>
                          ) : "-"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {entry.availability !== false ? (
                              <CheckCircle2 className="size-3 text-emerald-500" />
                            ) : (
                              <XCircle className="size-3 text-red-500" />
                            )}
                            <Badge variant={entry.availability !== false ? "default" : "destructive"} className="text-[10px]">
                              {entry.availability !== false ? "In Stock" : "OOS"}
                            </Badge>
                          </div>
                          {entry.updated_at && (
                            <p className="mt-0.5 text-[9px] text-muted-foreground/60">
                              <Clock className="mr-0.5 inline size-2.5" />
                              {new Date(entry.updated_at).toLocaleDateString()}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button type="button"
                            onClick={() => setExpandedChart(expandedChart === entry.listing_id ? null : entry.listing_id)}
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title="View price history">
                            <BarChart3 className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                      {isTrustExpanded && hasBreakdown && (
                        <tr className="bg-muted/20">
                          <td colSpan={7} className="px-8 py-3">
                            <div className="rounded-xl border border-border/50 bg-background p-4">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trust Score Breakdown &mdash; {entry.seller_name}</p>
                              <TrustBreakdown breakdown={entry.trust_score_breakdown} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {data.vendor_listing?.trust_score_breakdown && (
        <Card className="border-border/50 border-l-4 border-l-indigo-500 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="size-4 text-indigo-500" />
              Your Trust Score Breakdown
            </CardTitle>
            <CardDescription>Why your trust score is {data.vendor_listing.trust_score?.toFixed(0) ?? "?"}</CardDescription>
          </CardHeader>
          <CardContent>
            <TrustBreakdown breakdown={data.vendor_listing.trust_score_breakdown} />
          </CardContent>
        </Card>
      )}

      {expandedChart !== null && data.price_history[expandedChart] && data.price_history[expandedChart].length > 0 && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Price History</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.price_history[expandedChart].map((ph: any) => ({ date: new Date(ph.recorded_at).toLocaleDateString(), price: ph.price }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} className="fill-muted-foreground" />
                <YAxis tickLine={false} axisLine={false} fontSize={11} className="fill-muted-foreground" domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: "12px" }} />
                <Line type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild><Link href="/B2B/demo/listings">Back to Listings</Link></Button>
      </div>
    </div>
  )
}
