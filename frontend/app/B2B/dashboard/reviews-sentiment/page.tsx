"use client"

import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { MessageSquare, Star, ThumbsDown, ThumbsUp, TrendingDown } from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import B2BPlanGate from "@/components/B2B/b2b-plan-gate"

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8"]

type ReviewItem = { product_id?: number; product_name?: string; avg_rating?: number; review_count?: number; sentiment_score?: number; rating_gap_vs_competitors?: number; top_keywords?: string[] }

function NssGauge({ nss }: { nss: number | null }) {
  if (nss === null) return <span className="text-muted-foreground">N/A</span>
  const color = nss >= 50 ? "text-emerald-600" : nss >= 0 ? "text-amber-600" : "text-red-600"
  const bgColor = nss >= 50 ? "bg-emerald-100 dark:bg-emerald-950/40" : nss >= 0 ? "bg-amber-100 dark:bg-amber-950/40" : "bg-red-100 dark:bg-red-950/40"
  return (
    <div className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 ${bgColor}`}>
      <span className={`text-3xl font-black ${color}`}>{nss > 0 ? "+" : ""}{nss}</span>
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">NSS</span>
    </div>
  )
}

export default function ReviewsSentimentPage() {
  const { summary, isGold, loading, mode, brandFilter, setBrandFilter, refresh } = useB2B()
  const metrics = summary?.metrics as Record<string, unknown> | undefined

  const brandOptions = useMemo(() => {
    if (mode !== "market") return []
    const brands = ((metrics?.competitor_brands ?? []) as Array<Record<string, unknown>>)
      .map((b) => String(b.brand ?? ""))
      .filter(Boolean)
    return [...new Set(brands)]
  }, [metrics, mode])

  const reputation = (metrics?.reputation ?? metrics?.reviews_sentiment ?? metrics?.reviews ?? {}) as Record<string, unknown>
  const data = ((metrics?.reviews_sentiment ?? metrics?.reviews ?? []) as ReviewItem[])

  if (loading && !summary) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted/30" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      </div>
    )
  }

  if (!isGold) {
    return <B2BPlanGate featureName="Reviews & Sentiment" />
  }

  const avgRating = reputation?.average_rating !== null && reputation?.average_rating !== undefined ? Number(reputation.average_rating) : 0
  const totalReviews = Number(reputation?.total_reviews ?? 0)
  const nss = reputation?.nss !== null && reputation?.nss !== undefined ? Number(reputation.nss) : null
  const positiveCount = Number(reputation?.positive_count ?? 0)
  const negativeCount = Number(reputation?.negative_count ?? 0)
  const topPraises = (reputation?.top_praises ?? {}) as Record<string, number>
  const topComplaints = (reputation?.top_complaints ?? {}) as Record<string, number>

  const chartData = data.slice(0, 10).map((item) => ({
    name: String(item.product_name ?? "Product").slice(0, 18),
    rating: Number(item.avg_rating ?? 0),
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reviews & Sentiment</h1>
          <p className="text-sm text-muted-foreground">Net Sentiment Score (NSS%), praise/complaint analysis, and rating trends.</p>
        </div>
        {mode === "market" && brandOptions.length > 0 && (
          <Select
            value={brandFilter ?? "__all__"}
            onValueChange={(v) => { setBrandFilter(v === "__all__" ? null : v); refresh() }}
          >
            <SelectTrigger className="h-9 w-44 text-sm">
              <SelectValue placeholder="All Brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Brands</SelectItem>
              {brandOptions.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40"><Star className="size-5 text-amber-600" /></div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg Rating</p>
              <p className="mt-1 text-2xl font-bold">{avgRating.toFixed(1)}<span className="text-lg text-muted-foreground">/5</span></p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40"><MessageSquare className="size-5 text-indigo-600" /></div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Reviews</p>
              <p className="mt-1 text-2xl font-bold">{totalReviews}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Net Sentiment</p>
            <p className="mt-2"><NssGauge nss={nss} /></p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/40"><ThumbsUp className="size-5 text-violet-600" /></div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Products Tracked</p>
              <p className="mt-1 text-2xl font-bold">{data.length}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {(() => {
        const rawTrend = (metrics?.rating_trend ?? []) as Array<{ week: string; avg_rating: number; review_count: number }>
        if (rawTrend.length < 2) return null
        const lineData = rawTrend.map((r) => ({
          week: r.week.slice(0, 10),
          rating: r.avg_rating,
          count: r.review_count,
        }))
        return (
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingDown className="size-4 text-indigo-500" />Rating Trend (12 Weeks)</CardTitle>
              <CardDescription>Weekly average rating over the last 12 weeks.</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} domain={[0, 5]} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
                    formatter={(val: number, name: string) => [name === "rating" ? `${val.toFixed(2)} / 5` : `${val}`, name === "rating" ? "Avg Rating" : "Reviews"]}
                  />
                  <Line type="monotone" dataKey="rating" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1", r: 3 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )
      })()}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-600"><ThumbsUp className="size-4" />Top Praises</CardTitle>
            <CardDescription>Most frequently mentioned positive aspects from high-rated reviews.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(topPraises).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No positive keyword data yet</p>
            ) : (
              Object.entries(topPraises).slice(0, 7).map(([word, count], i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-emerald-200/50 bg-emerald-50/50 px-4 py-2.5 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                  <span className="text-sm font-medium capitalize">{word}</span>
                  <Badge variant="outline" className="border-emerald-200 bg-white text-emerald-700 dark:border-emerald-800 dark:bg-black/20 dark:text-emerald-400">
                    {count}x
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600"><ThumbsDown className="size-4" />Top Complaints</CardTitle>
            <CardDescription>Most frequently mentioned issues from low-rated reviews.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(topComplaints).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No negative keyword data yet</p>
            ) : (
              Object.entries(topComplaints).slice(0, 7).map(([word, count], i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-red-200/50 bg-red-50/50 px-4 py-2.5 dark:border-red-900/30 dark:bg-red-950/20">
                  <span className="text-sm font-medium capitalize">{word}</span>
                  <Badge variant="outline" className="border-red-200 bg-white text-red-700 dark:border-red-800 dark:bg-black/20 dark:text-red-400">
                    {count}x
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Star className="size-4 text-amber-500" />Average Rating by Product</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10} angle={-30} textAnchor="end" height={60} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} domain={[0, 5]} />
                <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
                <Bar dataKey="rating" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.rating >= 4 ? "#22c55e" : entry.rating >= 3 ? "#f59e0b" : "#ef4444"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-sm text-muted-foreground">
              <MessageSquare className="mb-2 size-8 opacity-30" />
              <span>No review data</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader><CardTitle>Product Review Details</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium text-center">Rating</th>
                  <th className="px-4 py-3 font-medium text-right">Reviews</th>
                  <th className="px-4 py-3 font-medium text-right">Gap vs Avg</th>
                  <th className="px-4 py-3 font-medium">Keywords</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-16 text-center">
                    <MessageSquare className="mx-auto mb-3 size-10 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">No review data yet</p>
                  </td></tr>
                ) : (
                  data.map((item, i) => {
                    const gap = Number(item.rating_gap_vs_competitors ?? 0)
                    return (
                      <tr key={item.product_id ?? i} className="transition-colors hover:bg-muted/20">
                        <td className="max-w-[180px] truncate px-4 py-3 font-medium">{item.product_name ?? "-"}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1">
                            <Star className="size-3 fill-amber-500 text-amber-500" />
                            <span className="font-mono font-bold">{Number(item.avg_rating ?? 0).toFixed(1)}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{item.review_count ?? 0}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono font-bold ${gap > 0 ? "text-emerald-600" : gap < 0 ? "text-red-600" : ""}`}>
                            {gap > 0 ? "+" : ""}{gap.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(item.top_keywords ?? []).slice(0, 3).map((kw) => (
                              <Badge key={kw} variant="outline" className="text-[10px]">{kw}</Badge>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingDown className="size-4 text-indigo-500" />Sentiment Summary</CardTitle>
          <CardDescription>Aggregate sentiment metrics across all tracked products.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border/50 p-4 text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Positive Reviews</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{positiveCount}</p>
              <p className="text-xs text-muted-foreground">{totalReviews > 0 ? ((positiveCount / totalReviews) * 100).toFixed(0) : 0}% of total</p>
            </div>
            <div className="rounded-xl border border-border/50 p-4 text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Negative Reviews</p>
              <p className="mt-1 text-2xl font-bold text-red-600">{negativeCount}</p>
              <p className="text-xs text-muted-foreground">{totalReviews > 0 ? ((negativeCount / totalReviews) * 100).toFixed(0) : 0}% of total</p>
            </div>
            <div className="rounded-xl border border-border/50 p-4 text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">NSS Range</p>
              <p className={`mt-1 text-2xl font-bold ${nss !== null && nss >= 50 ? "text-emerald-600" : nss !== null && nss >= 0 ? "text-amber-600" : "text-red-600"}`}>
                {nss !== null ? `${nss > 0 ? "+" : ""}${nss}` : "N/A"}
              </p>
              <p className="text-xs text-muted-foreground">Net Sentiment Score</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
