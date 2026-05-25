"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { BarChart3, MessageSquare, Plus, Star, ThumbsDown, ThumbsUp, TrendingDown, X } from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

import B2BPlanGate from "@/components/B2B/b2b-plan-gate"

const NSS_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8", "#7c3aed"]

type ReviewItem = { product_id?: number; product_name?: string; avg_rating?: number; review_count?: number; sentiment_score?: number; rating_gap_vs_competitors?: number; top_keywords?: string[] }

type BrandSentiment = {
  brand: string
  is_my_brand: boolean
  nss: number | null
  average_rating: number | null
  total_reviews: number
  positive_reviews: number
  negative_reviews: number
  product_count: number
  top_praise_keywords: string[]
  top_complaint_keywords: string[]
}

type SentimentResponse = {
  brands: BrandSentiment[]
}

type Tab = "my-reviews" | "compare-brands"

const TABS: { id: Tab; label: string; icon: typeof MessageSquare }[] = [
  { id: "my-reviews", label: "My Reviews", icon: MessageSquare },
  { id: "compare-brands", label: "Compare Brands", icon: BarChart3 },
]

function NssGauge({ nss }: { nss: number | null }) {
  if (nss === null) return <span className="text-muted-foreground">N/A</span>
  const color = nss >= 50 ? "text-emerald-600" : nss >= 0 ? "text-amber-600" : "text-red-600"
  const bgColor = nss >= 50 ? "bg-emerald-100 dark:bg-emerald-950/40" : nss >= 0 ? "bg-amber-100 dark:bg-amber-950/40" : "bg-red-100 dark:bg-red-950/40"
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${bgColor}`}>
      <span className={`text-xl font-black ${color}`}>{nss > 0 ? "+" : ""}{nss}</span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">NSS</span>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub, bgColor, iconColor }: {
  icon: typeof Star
  label: string
  value: ReactNode
  sub?: string
  bgColor: string
  iconColor: string
}) {
  return (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${bgColor}`}>
          <Icon className={`size-4 ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold">{value}</span>
            {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MyReviewsTab({ metrics }: { metrics: Record<string, unknown> | undefined }) {
  const reputation = (metrics?.reputation ?? metrics?.reviews_sentiment ?? metrics?.reviews ?? {}) as Record<string, unknown>
  const data = ((metrics?.reviews_sentiment ?? metrics?.reviews ?? []) as ReviewItem[])

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
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Star}
          label="Avg Rating"
          value={avgRating.toFixed(1)}
          sub="/5"
          bgColor="bg-amber-50 dark:bg-amber-950/40"
          iconColor="text-amber-600"
        />
        <KpiCard
          icon={MessageSquare}
          label="Total Reviews"
          value={totalReviews}
          bgColor="bg-indigo-50 dark:bg-indigo-950/40"
          iconColor="text-indigo-600"
        />
        <KpiCard
          icon={ThumbsUp}
          label="Net Sentiment"
          value={<NssGauge nss={nss} />}
          bgColor="bg-violet-50 dark:bg-violet-950/40"
          iconColor="text-violet-600"
        />
        <KpiCard
          icon={Star}
          label="Products Tracked"
          value={data.length}
          bgColor="bg-emerald-50 dark:bg-emerald-950/40"
          iconColor="text-emerald-600"
        />
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
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm"><TrendingDown className="size-4 text-indigo-500" />Rating Trend (12 Weeks)</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
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
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ThumbsUp className="size-3.5 text-emerald-600" />
              <span>Top Praises</span>
              <ThumbsDown className="size-3.5 text-red-600 ml-3" />
              <span>Top Complaints</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 divide-y divide-border/50">
            <div className="space-y-2 pb-3">
              {Object.keys(topPraises).length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">No positive keyword data yet</p>
              ) : (
                Object.entries(topPraises).slice(0, 5).map(([word, count], i) => (
                  <div key={i} className="flex items-center justify-between rounded-md bg-emerald-50/50 px-3 py-2 dark:bg-emerald-950/20">
                    <span className="text-xs font-medium capitalize">{word}</span>
                    <Badge variant="outline" className="border-emerald-200 bg-white text-[10px] text-emerald-700 dark:border-emerald-800 dark:bg-black/20 dark:text-emerald-400">
                      {count}x
                    </Badge>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-2 pt-3">
              {Object.keys(topComplaints).length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">No negative keyword data yet</p>
              ) : (
                Object.entries(topComplaints).slice(0, 5).map(([word, count], i) => (
                  <div key={i} className="flex items-center justify-between rounded-md bg-red-50/50 px-3 py-2 dark:bg-red-950/20">
                    <span className="text-xs font-medium capitalize">{word}</span>
                    <Badge variant="outline" className="border-red-200 bg-white text-[10px] text-red-700 dark:border-red-800 dark:bg-black/20 dark:text-red-400">
                      {count}x
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm"><Star className="size-3.5 text-amber-500" />Average Rating by Product</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10} angle={-30} textAnchor="end" height={60} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} domain={[0, 5]} />
                  <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
                  <Bar dataKey="rating" radius={[6, 6, 0, 0]}>
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
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Product Review Details</CardTitle>
          <CardDescription className="text-xs">Per-product breakdown of ratings, reviews, and top keywords.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Product</th>
                  <th className="px-4 py-2.5 font-medium text-center">Rating</th>
                  <th className="px-4 py-2.5 font-medium text-right">Reviews</th>
                  <th className="px-4 py-2.5 font-medium text-right">Gap vs Avg</th>
                  <th className="px-4 py-2.5 font-medium">Keywords</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center">
                    <MessageSquare className="mx-auto mb-2 size-8 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">No review data yet</p>
                  </td></tr>
                ) : (
                  data.map((item, i) => {
                    const gap = Number(item.rating_gap_vs_competitors ?? 0)
                    return (
                      <tr key={item.product_id ?? i} className="transition-colors hover:bg-muted/20">
                        <td className="max-w-[180px] truncate px-4 py-2.5 font-medium">{item.product_name ?? "-"}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="inline-flex items-center gap-1">
                            <Star className="size-3 fill-amber-500 text-amber-500" />
                            <span className="font-mono font-bold">{Number(item.avg_rating ?? 0).toFixed(1)}</span>
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">{item.review_count ?? 0}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`font-mono font-bold ${gap > 0 ? "text-emerald-600" : gap < 0 ? "text-red-600" : ""}`}>
                            {gap > 0 ? "+" : ""}{gap.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
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

function CompareBrandsTab() {
  const { summary, loading: summaryLoading } = useB2B()
  const [data, setData] = useState<SentimentResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [competitors, setCompetitors] = useState<string[]>([])
  const [inputVal, setInputVal] = useState("")

  const myBrand = (summary?.user?.company_name as string | undefined) ?? ""

  const fetchData = useCallback(async (extraBrands: string[]) => {
    setLoading(true)
    try {
      const brandsParam = extraBrands.length > 0 ? `&brands=${encodeURIComponent(extraBrands.join(","))}` : ""
      const res = await fetch(`/api/b2b/workspace?endpoint=sentiment-compare${brandsParam}`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch {
      console.error("Failed to fetch sentiment comparison")
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (myBrand) {
      fetchData(competitors)
    }
  }, [myBrand, fetchData]) // eslint-disable-line react-hooks/exhaustive-deps

  const addCompetitor = () => {
    const name = inputVal.trim()
    if (name && !competitors.some((c) => c.toLowerCase() === name.toLowerCase()) && name.toLowerCase() !== myBrand.toLowerCase()) {
      const next = [...competitors, name]
      setCompetitors(next)
      fetchData(next)
    }
    setInputVal("")
  }

  const removeCompetitor = (name: string) => {
    const next = competitors.filter((c) => c !== name)
    setCompetitors(next)
    fetchData(next)
  }

  if (loading || summaryLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    )
  }

  const brands = data?.brands ?? []
  const chartData = brands.map((b, i) => ({
    name: b.brand.length > 12 ? b.brand.slice(0, 11) + "\u2026" : b.brand,
    nss: b.nss ?? 0,
    rating: b.average_rating ?? 0,
    fill: NSS_COLORS[i % NSS_COLORS.length],
    isMy: b.is_my_brand,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {myBrand && (
            <Badge variant="default" className="bg-indigo-600 text-white text-xs gap-1">
              {myBrand}
              <span className="text-[9px] text-indigo-200">(you)</span>
            </Badge>
          )}
          {competitors.map((c) => (
            <Badge key={c} variant="secondary" className="text-xs gap-1 pr-1">
              {c}
              <button onClick={() => removeCompetitor(c)} className="ml-0.5 rounded-full hover:bg-muted p-0.5">
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-2">
          <Input
            placeholder="Add competitor brand..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addCompetitor() }}
            className="h-8 w-44 text-xs"
          />
          <Button variant="outline" size="sm" className="h-8" onClick={addCompetitor} disabled={!inputVal.trim()}>
            <Plus className="size-3.5 mr-1" /> Add
          </Button>
        </div>
      </div>

      {brands.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <MessageSquare className="mb-2 size-8 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No sentiment data available</p>
            <p className="text-xs text-muted-foreground mt-1">Add competitor brands above to compare sentiment metrics.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MessageSquare className="size-4 text-indigo-500" />
                Net Sentiment Score (NSS)
              </CardTitle>
              <CardDescription className="text-xs">Higher is better. Negative scores indicate more complaints than praise.</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/30" />
                  <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} unit="%" domain={[-100, 100]} />
                  <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} fontSize={11} width={100} />
                  <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="nss" radius={[0, 8, 8, 0]} label={{ position: "right", fontSize: 11, formatter: (v: number) => `${v}%` }}>
                    {chartData.map((_, i) => <Cell key={i} fill={NSS_COLORS[i % NSS_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {brands.map((b, i) => (
              <Card key={b.brand} className={`border-border/50 shadow-sm ${b.is_my_brand ? "ring-1 ring-indigo-400/30" : ""}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      {b.brand}
                      {b.is_my_brand && <Badge className="bg-indigo-100 text-indigo-700 text-[9px]">You</Badge>}
                    </CardTitle>
                    <Badge variant={b.nss !== null && b.nss >= 0 ? "default" : "destructive"} className="text-[10px]">
                      NSS {b.nss ?? "—"}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">{b.product_count} products, {b.total_reviews} reviews</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Avg Rating</span>
                    <span className="font-bold">{b.average_rating ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-emerald-600">
                      <ThumbsUp className="size-3" /> Positive
                    </span>
                    <span className="font-bold text-emerald-600">{b.positive_reviews}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-red-500">
                      <ThumbsDown className="size-3" /> Negative
                    </span>
                    <span className="font-bold text-red-500">{b.negative_reviews}</span>
                  </div>

                  {b.top_praise_keywords.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium text-emerald-600 mb-1">Praise keywords</p>
                      <div className="flex flex-wrap gap-1">
                        {b.top_praise_keywords.map((kw) => (
                          <Badge key={kw} variant="outline" className="text-[9px] border-emerald-200 text-emerald-700">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {b.top_complaint_keywords.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium text-red-500 mb-1">Complaint keywords</p>
                      <div className="flex flex-wrap gap-1">
                        {b.top_complaint_keywords.map((kw) => (
                          <Badge key={kw} variant="outline" className="text-[9px] border-red-200 text-red-600">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </section>
        </>
      )}
    </div>
  )
}

export default function ReviewsSentimentPage() {
  const { summary, isGold, loading } = useB2B()
  const metrics = summary?.metrics as Record<string, unknown> | undefined
  const [tab, setTab] = useState<Tab>("my-reviews")

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reviews & Sentiment</h1>
          <p className="text-sm text-muted-foreground">Net Sentiment Score (NSS%), praise/complaint analysis, and rating trends.</p>
        </div>
      </div>

      <div className="flex gap-1 rounded-xl bg-muted/40 p-1 w-fit">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === "my-reviews" ? <MyReviewsTab metrics={metrics} /> : <CompareBrandsTab />}
    </div>
  )
}
