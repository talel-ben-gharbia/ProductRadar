"use client"

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Search, TrendingUp, Zap } from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import B2BPlanGate from "@/components/B2B/b2b-plan-gate"

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8", "#7c3aed"]

type SearchEntry = { query?: string; count?: number; zero_results?: boolean; results_count?: number }

export default function DemandIntelligencePage() {
  const { summary, isGold } = useB2B()
  const searchInsights = summary?.search_insights as Record<string, unknown> | undefined
  const topSearches = ((searchInsights?.top_queries ?? searchInsights?.top_searches ?? []) as SearchEntry[])
  const zeroResults = ((searchInsights?.zero_result_queries ?? []) as SearchEntry[])
  const trending = ((searchInsights?.trending ?? []) as SearchEntry[])

  if (!isGold) {
    return <B2BPlanGate featureName="Demand Intelligence" />
  }

  const chartData = topSearches.slice(0, 10).map((item) => ({
    name: String(item.query ?? "").slice(0, 20),
    count: Number(item.count ?? 0),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Demand Intelligence</h1>
        <p className="text-sm text-muted-foreground">Analyze search queries, trending products, and demand gaps.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40"><Search className="size-5 text-indigo-600" /></div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Top Searches</p>
              <p className="mt-1 text-2xl font-bold">{topSearches.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/40"><Zap className="size-5 text-red-600" /></div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Zero-Result Queries</p>
              <p className="mt-1 text-2xl font-bold text-red-600">{zeroResults.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40"><TrendingUp className="size-5 text-emerald-600" /></div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Trending</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{trending.length}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Search className="size-4 text-indigo-500" />Top Search Queries</CardTitle>
          <CardDescription>Most frequently searched terms by users.</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/30" />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} fontSize={11} width={120} />
                <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No search data available</div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/50 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-500"><Zap className="size-4" />Zero-Result Queries</CardTitle>
            <CardDescription>Searches that returned no products — potential gaps in your catalog.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 relative z-10">
            {zeroResults.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <Search className="size-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No zero-result queries</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Your catalog is satisfying all search demand.</p>
              </div>
            ) : (
              zeroResults.slice(0, 10).map((item, i) => (
                <div key={i} className="group/item relative flex items-center justify-between rounded-xl border border-red-200/50 bg-gradient-to-br from-red-50 to-red-100/50 px-4 py-3 dark:border-red-900/50 dark:from-red-950/40 dark:to-red-900/20 hover:shadow-lg hover:shadow-red-500/10 transition-all duration-300 hover:-translate-y-0.5">
                  <div className="absolute -left-px top-2 bottom-2 w-1 rounded-r-md bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  <span className="text-sm font-bold text-red-950 dark:text-red-100 ml-1">{item.query ?? "-"}</span>
                  <Badge variant="outline" className="bg-white/50 dark:bg-black/20 border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400 font-semibold">{item.count ?? 0} searches</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500"><TrendingUp className="size-4" />Trending Searches</CardTitle>
            <CardDescription>Search queries gaining momentum recently.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 relative z-10">
            {trending.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <TrendingUp className="size-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No trending data</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Check back later as search data accumulates.</p>
              </div>
            ) : (
              trending.slice(0, 10).map((item, i) => (
                <div key={i} className="group/item relative flex items-center justify-between rounded-xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 to-emerald-100/50 px-4 py-3 dark:border-emerald-900/50 dark:from-emerald-950/40 dark:to-emerald-900/20 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-0.5">
                  <div className="absolute -left-px top-2 bottom-2 w-1 rounded-r-md bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  <span className="text-sm font-bold text-emerald-950 dark:text-emerald-100 ml-1">{item.query ?? "-"}</span>
                  <Badge variant="outline" className="bg-white/50 dark:bg-black/20 border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">{item.count ?? 0} searches</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
