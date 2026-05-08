"use client"

import { useState } from "react"
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { MessageSquare, Star, ThumbsUp, TrendingUp } from "lucide-react"

import { useDemo } from "../layout-client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8", "#7c3aed"]

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={`size-3 ${star <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"}`} />
      ))}
    </div>
  )
}

export default function ReviewsSentimentPage() {
  const { summary } = useDemo()
  const metrics = summary.metrics as Record<string, any>
  const data = (metrics?.reviews_sentiment ?? []) as Array<Record<string, any>>

  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)

  const totalReviews = data.reduce((sum: number, d: any) => sum + Number(d.review_count ?? 0), 0)
  const avgRating = data.length > 0 ? data.reduce((sum: number, d: any) => sum + Number(d.avg_rating ?? 0), 0) / data.length : 0
  const avgSentiment = data.length > 0 ? data.reduce((sum: number, d: any) => sum + Number(d.sentiment_score ?? 0), 0) / data.length : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reviews & Sentiment</h1>
        <p className="text-sm text-muted-foreground">Customer review analysis and sentiment tracking for your products.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <MessageSquare className="mb-2 size-6 text-indigo-500" />
            <p className="text-3xl font-bold">{totalReviews.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Reviews</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Star className="mb-2 size-6 text-amber-500" />
            <p className="text-3xl font-bold">{avgRating.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Avg Rating</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <ThumbsUp className="mb-2 size-6 text-emerald-500" />
            <p className="text-3xl font-bold">{(avgSentiment * 100).toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Avg Sentiment</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-4 text-indigo-500" />
            Average Rating by Product
          </CardTitle>
          <CardDescription>Star ratings compared to competitor average.</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.map((d: any) => ({
                name: String(d.product_name ?? d.product_id ?? "").slice(0, 20),
                rating: Number(d.avg_rating ?? 0),
                reviews: Number(d.review_count ?? 0),
              }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} className="fill-muted-foreground" />
                <YAxis domain={[0, 5]} tickLine={false} axisLine={false} fontSize={11} className="fill-muted-foreground" />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
                  formatter={(value: number, name: string) => [name === "rating" ? `${value.toFixed(2)} / 5` : value, name === "rating" ? "Avg Rating" : "Reviews"]} />
                <Bar dataKey="rating" radius={[8, 8, 0, 0]}>
                  {data.map((_: any, index: number) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No review data available</div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Product Sentiment Details</h2>
        {data.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">No sentiment data available</div>
        ) : (
          data.map((product: any) => {
            const pid = String(product.product_id ?? product.product_name ?? "")
            const isSelected = selectedProduct === pid
            const sentiment = Number(product.sentiment_score ?? 0)
            const ratingGap = Number(product.rating_gap_vs_competitors ?? 0)
            return (
              <Card key={pid} className={`border-border/50 shadow-sm overflow-hidden transition-all ${isSelected ? "ring-2 ring-indigo-500/30" : ""}`}>
                <button type="button" onClick={() => setSelectedProduct(isSelected ? null : pid)} className="w-full text-left">
                  <CardContent className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/30">
                        <MessageSquare className="size-5 text-indigo-500" />
                      </div>
                      <div>
                        <p className="font-semibold">{String(product.product_name ?? "-")}</p>
                        <StarRating rating={Number(product.avg_rating ?? 0)} />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Sentiment</p>
                        <p className={`font-bold ${sentiment >= 0.7 ? "text-emerald-600" : sentiment >= 0.4 ? "text-amber-600" : "text-red-600"}`}>
                          {(sentiment * 100).toFixed(0)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Rating Gap</p>
                        <div className="flex items-center gap-1">
                          <span className={`font-bold ${ratingGap >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {ratingGap >= 0 ? "+" : ""}{ratingGap.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </button>
                {isSelected && (
                  <div className="border-t border-border/50 bg-muted/20 px-4 py-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="mb-2 text-xs font-medium text-muted-foreground">Review Stats</p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-xs">
                            <span className="text-muted-foreground">Total Reviews</span>
                            <span className="font-semibold">{String(product.review_count ?? 0)}</span>
                          </div>
                          <div className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-xs">
                            <span className="text-muted-foreground">Avg Rating</span>
                            <div className="flex items-center gap-1">
                              <span className="font-semibold">{Number(product.avg_rating ?? 0).toFixed(1)}</span>
                              <StarRating rating={Number(product.avg_rating ?? 0)} />
                            </div>
                          </div>
                          <div className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-xs">
                            <span className="text-muted-foreground">Rating vs Competitors</span>
                            <span className={`font-semibold ${ratingGap >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                              {ratingGap >= 0 ? "+" : ""}{ratingGap.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-medium text-muted-foreground">Top Keywords</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(product.top_keywords ?? []).map((kw: string) => (
                            <Badge key={kw} variant="secondary" className="text-[10px] rounded-full">
                              {kw}
                            </Badge>
                          ))}
                          {(!product.top_keywords || product.top_keywords.length === 0) && (
                            <span className="text-xs text-muted-foreground">No keywords available</span>
                          )}
                        </div>
                        <div className="mt-4">
                          <p className="mb-2 text-xs font-medium text-muted-foreground">Sentiment Score</p>
                          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                            <div className={`h-full rounded-full transition-all ${sentiment >= 0.7 ? "bg-emerald-500" : sentiment >= 0.4 ? "bg-amber-500" : "bg-red-500"}`}
                              style={{ width: `${Math.min(100, sentiment * 100)}%` }} />
                          </div>
                          <p className="mt-1 text-right text-[10px] text-muted-foreground">
                            {sentiment >= 0.7 ? "Positive" : sentiment >= 0.4 ? "Neutral" : "Negative"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
