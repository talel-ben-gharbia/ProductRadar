"use client"

import { useMemo, useState } from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Lightbulb, Search, TrendingUp, Zap } from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import B2BPlanGate from "@/components/B2B/b2b-plan-gate"

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8", "#7c3aed"]

type SearchEntry = { query?: string; count?: number; zero_results?: boolean; results_count?: number; growth?: number; current?: number; previous?: number }

export default function DemandIntelligencePage() {
  const { summary, isGold, loading, mode, brandFilter, setBrandFilter, refresh } = useB2B()
  const metrics = summary?.metrics as Record<string, unknown> | undefined

  const brandOptions = useMemo(() => {
    if (mode !== "market") return []
    const brands = ((metrics?.competitor_brands ?? []) as Array<Record<string, unknown>>)
      .map((b) => String(b.brand ?? ""))
      .filter(Boolean)
    return [...new Set(brands)]
  }, [metrics, mode])

  const demandIntel = (summary?.search_insights ?? metrics?.demand_intelligence ?? {}) as Record<string, unknown>
  const rawTop = (demandIntel?.top_queries ?? demandIntel?.top_searches ?? {}) as Record<string, number>
  const topSearches: SearchEntry[] = Object.entries(rawTop).map(([query, count]) => ({ query, count }))
  const rawZero = (demandIntel?.zero_result_queries ?? {}) as Record<string, number>
  const zeroResults: SearchEntry[] = Object.entries(rawZero).map(([query, count]) => ({ query, count }))
  const trending = ((demandIntel?.trending ?? []) as SearchEntry[])
  const allMarketGaps = ((demandIntel?.market_gaps ?? demandIntel?.clusters ?? []) as { queries?: string[]; total_searches?: number; suggested_product?: string }[])

  const [queryFilter, setQueryFilter] = useState("")

  const filteredTrending = queryFilter
    ? trending.filter((t) => String(t.query ?? "").toLowerCase().includes(queryFilter.toLowerCase()))
    : trending

  const filteredZero = queryFilter
    ? zeroResults.filter((z) => String(z.query ?? "").toLowerCase().includes(queryFilter.toLowerCase()))
    : zeroResults

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
    return <B2BPlanGate featureName="Demand Intelligence" />
  }

  const chartData = topSearches.slice(0, 10).map((item) => ({
    name: String(item.query ?? "").slice(0, 20),
    count: Number(item.count ?? 0),
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Demand Intelligence</h1>
          <p className="text-sm text-muted-foreground">Analyze search queries, market gaps, trending products, and brand-scoped demand.</p>
        </div>
        <div className="flex items-center gap-2">
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
          <Search className="size-4 text-muted-foreground" />
          <Input
            placeholder="Filter queries..."
            value={queryFilter}
            onChange={(e) => setQueryFilter(e.target.value)}
            className="max-w-xs h-9 text-sm"
          />
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
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
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Zero-Result</p>
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
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40"><Lightbulb className="size-5 text-amber-600" /></div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Market Gaps</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{allMarketGaps.length}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {allMarketGaps.length > 0 && (
        <Card className="border-border/50 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500"><Lightbulb className="size-4" />Market Gaps Detected</CardTitle>
            <CardDescription>Clusters of similar zero-result queries — products users search for that don&apos;t exist in the catalog.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 relative z-10">
            {allMarketGaps.slice(0, 8).map((gap, i) => (
              <div key={i} className="group/item relative flex items-center justify-between rounded-xl border border-amber-200/50 bg-gradient-to-br from-amber-50 to-amber-100/50 px-4 py-3 dark:border-amber-900/50 dark:from-amber-950/40 dark:to-amber-900/20 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300">
                <div className="absolute -left-px top-2 bottom-2 w-1 rounded-r-md bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                <div className="ml-1">
                  <span className="text-sm font-bold text-amber-950 dark:text-amber-100">{gap.suggested_product ?? gap.queries?.[0] ?? "Unknown"}</span>
                  {gap.queries && gap.queries.length > 1 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {gap.queries.slice(0, 4).map((q, j) => (
                        <Badge key={j} variant="outline" className="text-[10px] border-amber-200 dark:border-amber-800">{q}</Badge>
                      ))}
                      {gap.queries.length > 4 && <span className="text-[10px] text-muted-foreground">+{gap.queries.length - 4} more</span>}
                    </div>
                  )}
                </div>
                <Badge variant="outline" className="bg-white/50 dark:bg-black/20 border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400 font-semibold shrink-0">
                  {gap.total_searches ?? 0} searches
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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

      {(() => {
        const velocity = (metrics?.search_velocity ?? {}) as { weeks?: string[]; series?: Array<{ query: string; series: Array<{ week: string; volume: number }> }> }
        if (!velocity.series || velocity.series.length === 0) return null
        return (
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="size-4 text-indigo-500" />Search Velocity</CardTitle>
              <CardDescription>Weekly search volume trend for top queries over the last 8 weeks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {velocity.series.slice(0, 10).map((item) => {
                const sparkData = item.series.map((s) => ({ week: s.week.slice(5), volume: s.volume }))
                const totalVol = item.series.reduce((s, p) => s + p.volume, 0)
                return (
                  <div key={item.query} className="flex items-center gap-4 rounded-lg border border-border/50 px-4 py-3">
                    <span className="w-40 truncate text-sm font-medium">{item.query}</span>
                    <div className="h-8 w-32 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparkData}>
                          <Area dataKey="volume" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <span className="ml-auto text-xs font-mono text-muted-foreground">{totalVol} total</span>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })()}

      {(() => {
        const cal = (metrics?.search_calendar ?? {}) as { weeks?: string[]; days?: Record<string, Record<number, { date: string; volume: number }>>; max_volume?: number }
        const days = cal.days
        const maxVol = cal.max_volume ?? 1
        if (!days || Object.keys(days).length === 0) return null
        const dayLabels = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        return (
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Search className="size-4 text-indigo-500" />Search Activity Calendar</CardTitle>
              <CardDescription>Daily search volume over the last 6 weeks. Darker = more searches.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="mx-auto text-xs">
                  <thead>
                    <tr>
                      <th className="p-1 w-8" />
                      {cal.weeks?.map((w) => (
                        <th key={w} className="p-1 text-center text-[10px] font-medium text-muted-foreground w-9">{w.replace(/^\d+-W(\d+)$/, "W$1")}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <tr key={d}>
                        <td className="p-1 text-right text-[10px] text-muted-foreground">{dayLabels[d]}</td>
                        {cal.weeks?.map((wk) => {
                          const cell = days[wk]?.[d]
                          if (!cell) return <td key={wk} className="p-1"><div className="size-7 rounded" /></td>
                          const intensity = maxVol > 0 ? cell.volume / maxVol : 0
                          const bg = intensity === 0 ? "bg-muted/20" : intensity < 0.25 ? "bg-indigo-900/20" : intensity < 0.5 ? "bg-indigo-700/40" : intensity < 0.75 ? "bg-indigo-500/60" : "bg-indigo-400/80"
                          return (
                            <td key={wk} className="p-1">
                              <div className={`size-7 rounded flex items-center justify-center text-[9px] font-mono ${cell.volume > 0 ? "text-white" : "text-muted-foreground/30"} ${bg}`} title={`${cell.date}: ${cell.volume} searches`}>
                                {cell.volume > 0 ? cell.volume : ""}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/50 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-500"><Zap className="size-4" />Zero-Result Queries {queryFilter && <span className="text-xs font-normal text-muted-foreground">filtered by &quot;{queryFilter}&quot;</span>}</CardTitle>
            <CardDescription>Searches that returned no products — potential gaps in your catalog.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 relative z-10">
            {filteredZero.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <Search className="size-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No zero-result queries</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Your catalog is satisfying all search demand.</p>
              </div>
            ) : (
              filteredZero.slice(0, 10).map((item, i) => (
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
            <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500"><TrendingUp className="size-4" />Trending Searches {queryFilter && <span className="text-xs font-normal text-muted-foreground">filtered by &quot;{queryFilter}&quot;</span>}</CardTitle>
            <CardDescription>Search queries gaining momentum recently with growth rate.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 relative z-10">
            {filteredTrending.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <TrendingUp className="size-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No trending data</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Check back later as search data accumulates.</p>
              </div>
            ) : (
              filteredTrending.slice(0, 10).map((item, i) => (
                <div key={i} className="group/item relative flex items-center justify-between rounded-xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 to-emerald-100/50 px-4 py-3 dark:border-emerald-900/50 dark:from-emerald-950/40 dark:to-emerald-900/20 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-0.5">
                  <div className="absolute -left-px top-2 bottom-2 w-1 rounded-r-md bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  <div className="ml-1">
                    <span className="text-sm font-bold text-emerald-950 dark:text-emerald-100">{item.query ?? "-"}</span>
                    {item.previous && item.current && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {item.previous} → {item.current} searches
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {item.growth && (
                      <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                        +{item.growth}%
                      </Badge>
                    )}
                    <Badge variant="outline" className="bg-white/50 dark:bg-black/20 border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                      {item.current ?? item.count ?? 0}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
