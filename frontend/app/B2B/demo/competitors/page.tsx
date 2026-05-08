"use client"

import { useState } from "react"
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Building2, Crown, Layers, Shield, Star, TrendingUp, Trophy } from "lucide-react"

import { useDemo } from "../layout-client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8", "#7c3aed", "#6d28d9", "#5b21b6"]

export default function CompetitorsPage() {
  const { summary } = useDemo()
  const metrics = summary.metrics as Record<string, any>
  const data = (metrics?.competitor_brands ?? []) as Array<Record<string, any>>

  const [sortKey, setSortKey] = useState<string>("market_share_pct")

  const sorted = [...data].sort((a, b) => {
    const av = Number(a[sortKey] ?? 0)
    const bv = Number(b[sortKey] ?? 0)
    return bv - av
  })

  const totalListings = data.reduce((sum: number, d: any) => sum + Number(d.listings_count ?? 0), 0)
  const avgTrust = data.length > 0 ? data.reduce((sum: number, d: any) => sum + Number(d.avg_trust_score ?? 0), 0) / data.length : 0
  const avgPrice = data.length > 0 ? data.reduce((sum: number, d: any) => sum + Number(d.avg_price ?? 0), 0) / data.length : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Competitor Ranking</h1>
        <p className="text-sm text-muted-foreground">Market share and performance metrics of competing brands.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Building2 className="mb-2 size-6 text-indigo-500" />
            <p className="text-3xl font-bold">{data.length}</p>
            <p className="text-xs text-muted-foreground">Competing Brands</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Layers className="mb-2 size-6 text-violet-500" />
            <p className="text-3xl font-bold">{totalListings}</p>
            <p className="text-xs text-muted-foreground">Total Listings Tracked</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Shield className="mb-2 size-6 text-emerald-500" />
            <p className="text-3xl font-bold">{avgTrust.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Avg Trust Score</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-4 text-indigo-500" />
            Market Share by Brand
          </CardTitle>
          <CardDescription>Percentage of total listings owned by each brand.</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {sorted.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sorted.map((d: any) => ({ name: String(d.brand ?? ""), share: Number(d.market_share_pct ?? 0), trust: Number(d.avg_trust_score ?? 0), listings: Number(d.listings_count ?? 0) }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/30" />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} className="fill-muted-foreground" unit="%" />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={11} className="fill-muted-foreground" width={110} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
                  formatter={(value: number, name: string) => [name === "share" ? `${value.toFixed(1)}%` : value, name === "share" ? "Market Share" : name === "trust" ? "Trust Score" : "Listings"]} />
                <Bar dataKey="share" radius={[0, 8, 8, 0]}>
                  {sorted.map((_: any, index: number) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data available</div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-4 text-amber-500" />
              Brand Comparison
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sort by:</span>
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}
                className="h-8 rounded-md border bg-background px-2 text-xs">
                <option value="market_share_pct">Market Share</option>
                <option value="listings_count">Listings</option>
                <option value="avg_trust_score">Trust Score</option>
                <option value="avg_price">Avg Price</option>
              </select>
            </div>
          </div>
          <CardDescription>Detailed metrics for each competing brand.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Brand</th>
                  <th className="px-4 py-3 font-medium text-right">Listings</th>
                  <th className="px-4 py-3 font-medium text-right">Market Share</th>
                  <th className="px-4 py-3 font-medium text-right">Avg Price</th>
                  <th className="px-4 py-3 font-medium text-center">Avg Trust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {sorted.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-16 text-center text-sm text-muted-foreground">No competitor data available</td></tr>
                ) : (
                  sorted.map((brand: any, i: number) => (
                    <tr key={brand.brand ?? i} className="transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3">
                        {i === 0 ? <Crown className="size-4 text-amber-500" />
                          : i === 1 ? <Crown className="size-4 text-slate-400" />
                          : i === 2 ? <Crown className="size-4 text-amber-700" />
                          : <span className="text-xs text-muted-foreground">{i + 1}</span>}
                      </td>
                      <td className="px-4 py-3 font-medium">{String(brand.brand ?? "-")}</td>
                      <td className="px-4 py-3 text-right font-mono">{String(brand.listings_count ?? 0)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">{Number(brand.market_share_pct ?? 0).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right font-mono">${Number(brand.avg_price ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${Number(brand.avg_trust_score ?? 0) >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : Number(brand.avg_trust_score ?? 0) >= 60 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"}`}>
                          {Number(brand.avg_trust_score ?? 0).toFixed(0)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
