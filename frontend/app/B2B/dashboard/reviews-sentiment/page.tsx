"use client"

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { MessageSquare, Star, ThumbsUp, TrendingDown } from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import B2BPlanGate from "@/components/B2B/b2b-plan-gate"

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8"]

type ReviewItem = { product_id?: number; product_name?: string; avg_rating?: number; review_count?: number; sentiment_score?: number; rating_gap_vs_competitors?: number; top_keywords?: string[] }

export default function ReviewsSentimentPage() {
  const { summary, isGold } = useB2B()
  const metrics = summary?.metrics as Record<string, unknown> | undefined
  const data = ((metrics?.reviews_sentiment ?? metrics?.reviews ?? []) as ReviewItem[])

  if (!isGold) {
    return <B2BPlanGate featureName="Reviews & Sentiment" />
  }

  const chartData = data.slice(0, 10).map((item) => ({
    name: String(item.product_name ?? "Product").slice(0, 18),
    rating: Number(item.avg_rating ?? 0),
  }))

  const avgRating = data.length > 0 ? data.reduce((s, d) => s + Number(d.avg_rating ?? 0), 0) / data.length : 0
  const totalReviews = data.reduce((s, d) => s + Number(d.review_count ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reviews & Sentiment</h1>
        <p className="text-sm text-muted-foreground">Monitor product ratings, review volume, and sentiment across your tracked brands.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
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
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/40"><ThumbsUp className="size-5 text-violet-600" /></div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Products Tracked</p>
              <p className="mt-1 text-2xl font-bold">{data.length}</p>
            </div>
          </CardContent>
        </Card>
      </section>

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
              <span className="text-xs text-muted-foreground/70 mt-1">Review data will appear once product ratings are collected.</span>
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
                    <p className="text-xs text-muted-foreground/70 mt-1">Product reviews and sentiment scores will appear once tracked.</p>
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
    </div>
  )
}
