"use client"

import { useState } from "react"
import { AlertTriangle, BarChart3, Search, TrendingUp, Zap } from "lucide-react"

import { useDemo } from "../layout-client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DemandIntelligencePage() {
  const { summary } = useDemo()
  const searchInsights = summary.search_insights as Record<string, any> | undefined

  const topQueries = (searchInsights?.top_queries ?? []) as Array<Record<string, any>>
  const trending = (searchInsights?.trending ?? []) as Array<Record<string, any>>
  const zeroResultQueries = (searchInsights?.zero_result_queries ?? []) as Array<Record<string, any>>

  const [queryFilter, setQueryFilter] = useState("")
  const [queryTab, setQueryTab] = useState<"all" | "trending" | "zero">("all")

  const filteredTop = topQueries.filter((q: any) => !queryFilter || String(q.query ?? "").toLowerCase().includes(queryFilter.toLowerCase()))
  const totalSearchVolume = topQueries.reduce((sum: number, q: any) => sum + Number(q.count ?? 0), 0)
  const zeroResultVolume = zeroResultQueries.reduce((sum: number, q: any) => sum + Number(q.count ?? 0), 0)
  const trendingVolume = trending.reduce((sum: number, q: any) => sum + Number(q.count ?? 0), 0)

  const maxCount = Math.max(...topQueries.map((q: any) => Number(q.count ?? 0)), 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Demand Intelligence</h1>
        <p className="text-sm text-muted-foreground">Search demand analysis to identify trends and market gaps.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Search className="mb-2 size-6 text-indigo-500" />
            <p className="text-3xl font-bold">{totalSearchVolume.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Search Volume</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <TrendingUp className="mb-2 size-6 text-emerald-500" />
            <p className="text-3xl font-bold">{trendingVolume.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Trending Volume</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <AlertTriangle className="mb-2 size-6 text-amber-500" />
            <p className="text-3xl font-bold">{zeroResultVolume.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Unfulfilled Demand</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="size-4 text-indigo-500" />
              Search Query Analysis
            </CardTitle>
            <div className="flex items-center gap-2">
              <input
                placeholder="Filter queries..."
                value={queryFilter}
                onChange={(e) => setQueryFilter(e.target.value)}
                className="h-8 rounded-md border bg-background px-2 text-xs w-36"
              />
            </div>
          </div>
          <CardDescription>Most searched product queries and demand patterns.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            {(["all", "trending", "zero"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setQueryTab(tab)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  queryTab === tab
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {tab === "all" ? "Top Queries" : tab === "trending" ? "Trending" : "Zero Results"}
              </button>
            ))}
          </div>

          {queryTab === "all" && (
            <div className="overflow-x-auto">
              {filteredTop.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">No queries found</div>
              ) : (
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Query</th>
                      <th className="px-4 py-3 font-medium text-right">Search Count</th>
                      <th className="px-4 py-3 font-medium">Demand Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredTop.map((q: any, i: number) => {
                      const count = Number(q.count ?? 0)
                      const pct = (count / maxCount) * 100
                      const demandLevel = count >= maxCount * 0.7 ? "High" : count >= maxCount * 0.4 ? "Medium" : "Low"
                      const demandColor = demandLevel === "High" ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" : demandLevel === "Medium" ? "text-amber-600 bg-amber-50 dark:bg-amber-950/30" : "text-slate-600 bg-slate-50 dark:bg-slate-950/30"
                      return (
                        <tr key={i} className="transition-colors hover:bg-muted/20">
                          <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-3 font-medium capitalize">{String(q.query ?? "-")}</td>
                          <td className="px-4 py-3 text-right font-mono">{count.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-full max-w-[100px] overflow-hidden rounded-full bg-muted">
                                <div className={`h-full rounded-full ${pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-slate-400"}`}
                                  style={{ width: `${pct}%` }} />
                              </div>
                              <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${demandColor}`}>{demandLevel}</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {queryTab === "trending" && (
            <div className="space-y-3">
              {trending.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">No trending queries</div>
              ) : (
                trending.map((q: any, i: number) => {
                  const count = Number(q.count ?? 0)
                  return (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-border/50 bg-gradient-to-r from-indigo-50/30 to-transparent p-4 dark:from-indigo-950/10">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="size-5 text-emerald-500" />
                        <div>
                          <p className="font-medium capitalize">{String(q.query ?? "-")}</p>
                          <p className="text-xs text-muted-foreground">{count} searches today</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px] dark:bg-emerald-950/30 dark:text-emerald-400">
                        +{count}% growth
                      </Badge>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {queryTab === "zero" && (
            <div className="space-y-3">
              {zeroResultQueries.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">No unfulfilled demand detected</div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-3">
                    These queries have search demand but zero matching products — potential market opportunities.
                  </p>
                  {zeroResultQueries.map((q: any, i: number) => {
                    const count = Number(q.count ?? 0)
                    return (
                      <div key={i} className="flex items-center justify-between rounded-xl border border-amber-200/50 bg-amber-50/30 p-4 dark:border-amber-900/30 dark:bg-amber-950/10">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="size-5 text-amber-500" />
                          <div>
                            <p className="font-medium capitalize">{String(q.query ?? "-")}</p>
                            <p className="text-xs text-muted-foreground">{count} unfulfilled searches</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-amber-200 text-amber-700 text-[10px] dark:border-amber-800 dark:text-amber-400">
                          Opportunity
                        </Badge>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/50 shadow-sm bg-gradient-to-br from-indigo-50/50 to-transparent dark:from-indigo-950/10">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <BarChart3 className="mb-2 size-6 text-indigo-500" />
            <p className="text-lg font-bold">{topQueries.length}</p>
            <p className="text-xs text-muted-foreground">Tracked Keywords</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/10">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <TrendingUp className="mb-2 size-6 text-emerald-500" />
            <p className="text-lg font-bold">{trending.length}</p>
            <p className="text-xs text-muted-foreground">Trending Topics</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/10">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <AlertTriangle className="mb-2 size-6 text-amber-500" />
            <p className="text-lg font-bold">{zeroResultQueries.length}</p>
            <p className="text-xs text-muted-foreground">Gap Opportunities</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm bg-gradient-to-br from-violet-50/50 to-transparent dark:from-violet-950/10">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <Zap className="mb-2 size-6 text-violet-500" />
            <p className="text-lg font-bold">{totalSearchVolume > 0 ? (zeroResultVolume / totalSearchVolume * 100).toFixed(1) : "0"}%</p>
            <p className="text-xs text-muted-foreground">Demand Gap Ratio</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
