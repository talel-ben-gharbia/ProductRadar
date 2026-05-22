"use client"

import { useCallback, useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { MessageSquare, Plus, ThumbsDown, ThumbsUp, X } from "lucide-react"
import { useB2B } from "@/components/B2B/b2b-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

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

const NSS_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8", "#7c3aed"]

export default function SentimentComparePage() {
  const { summary, loading: summaryLoading, mode } = useB2B()
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

  const loading_ = loading || summaryLoading

  if (loading_) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-4 w-80 animate-pulse rounded bg-muted/30" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    )
  }

  const brands = data?.brands ?? []
  const myBrandData = brands.find((b) => b.is_my_brand)

  const chartData = brands.map((b, i) => ({
    name: b.brand.length > 12 ? b.brand.slice(0, 11) + "\u2026" : b.brand,
    nss: b.nss ?? 0,
    rating: b.average_rating ?? 0,
    fill: NSS_COLORS[i % NSS_COLORS.length],
    isMy: b.is_my_brand,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Brand Sentiment Comparison</h1>
        <p className="text-sm text-muted-foreground">
          Compare Net Sentiment Scores (NSS) and review metrics across brands.
        </p>
      </div>

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
          <CardContent className="flex flex-col items-center py-16 text-center">
            <MessageSquare className="mb-3 size-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No sentiment data available</p>
            <p className="text-xs text-muted-foreground mt-1">Add competitor brands above to compare sentiment metrics.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* NSS Bar Chart */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="size-4 text-indigo-500" />
                Net Sentiment Score (NSS)
              </CardTitle>
              <CardDescription>Higher is better. Negative scores indicate more complaints than praise.</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
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

          {/* Comparison Cards */}
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
