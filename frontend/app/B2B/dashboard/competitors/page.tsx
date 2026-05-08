"use client"

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Layers } from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8", "#7c3aed", "#4f46e5", "#6d28d9"]

type CompetitorItem = { brand?: string; listings_count?: number; market_share_pct?: number; avg_price?: number; avg_trust_score?: number }

export default function CompetitorsPage() {
  const { summary } = useB2B()
  const metrics = summary?.metrics as Record<string, unknown> | undefined
  const data = ((metrics?.competitor_brands ?? metrics?.competitors ?? []) as CompetitorItem[])

  const chartData = data.slice(0, 10).map((item) => ({
    name: String(item.brand ?? "Brand").slice(0, 16),
    share: Number(item.market_share_pct ?? 0),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Competitor Ranking</h1>
        <p className="text-sm text-muted-foreground">Brands ranked by listing count and market share.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Brands Tracked</p>
            <p className="mt-2 text-3xl font-bold">{data.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Top Brand</p>
            <p className="mt-2 text-xl font-bold">{data[0]?.brand ?? "—"}</p>
            <p className="text-sm text-indigo-600">{Number(data[0]?.market_share_pct ?? 0).toFixed(1)}% market share</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Layers className="size-4 text-indigo-500" />Market Share Distribution</CardTitle>
          <CardDescription>Brand presence by listing count.</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/30" />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} unit="%" />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} fontSize={11} width={100} />
                <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
                <Bar dataKey="share" radius={[0, 8, 8, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-sm text-muted-foreground">
              <Layers className="mb-2 size-8 opacity-30" />
              <span>No competitor data</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader><CardTitle>Brand Details</CardTitle></CardHeader>
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
                  <th className="px-4 py-3 font-medium text-right">Avg Trust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-16 text-center">
                    <Layers className="mx-auto mb-3 size-10 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">No competitor data yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Competitor data will appear once listings from other sellers are tracked.</p>
                  </td></tr>
                ) : (
                  data.map((item, i) => (
                    <tr key={item.brand ?? i} className="transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3 font-medium">{item.brand ?? "-"}</td>
                      <td className="px-4 py-3 text-right font-mono">{item.listings_count ?? 0}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-indigo-600">{Number(item.market_share_pct ?? 0).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right font-mono">{Number(item.avg_price ?? 0).toFixed(2)} DT</td>
                      <td className="px-4 py-3 text-right"><Badge variant="outline" className="text-[10px]">{Number(item.avg_trust_score ?? 0).toFixed(0)}</Badge></td>
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
