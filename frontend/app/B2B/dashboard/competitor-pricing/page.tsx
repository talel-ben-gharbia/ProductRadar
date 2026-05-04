"use client"

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ArrowDownRight, ArrowUpRight, TrendingUp } from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import B2BPlanGate from "@/components/B2B/b2b-plan-gate"

type CompetitorRow = {
  product_id?: number
  product_name?: string
  vendor_price?: number
  cheapest_competitor_price?: number
  competitor_seller_name?: string
  vendor_rank?: number
  gap_to_cheapest?: number
  market_average_price?: number
}

export default function CompetitorPricingPage() {
  const { summary, isGold } = useB2B()
  const metrics = summary?.metrics as Record<string, unknown> | undefined
  const data = ((metrics?.competitor_pricing ?? []) as CompetitorRow[])

  if (!isGold) {
    return <B2BPlanGate featureName="Competitor Pricing" />
  }

  const chartData = data.slice(0, 10).map((item) => ({
    name: String(item.product_name ?? "Product").slice(0, 20),
    gap: Number(item.gap_to_cheapest ?? 0),
    vendor: Number(item.vendor_price ?? 0),
    cheapest: Number(item.cheapest_competitor_price ?? 0),
  }))

  const avgGap = data.length > 0 ? data.reduce((s, d) => s + Number(d.gap_to_cheapest ?? 0), 0) / data.length : 0
  const undercut = data.filter((d) => Number(d.gap_to_cheapest ?? 0) > 0).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Competitor Pricing</h1>
        <p className="text-sm text-muted-foreground">Compare your prices against competitors across all your products.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Products Tracked</p>
            <p className="mt-2 text-3xl font-bold">{data.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg Price Gap</p>
            <p className={`mt-2 text-3xl font-bold ${avgGap > 0 ? "text-red-600" : avgGap < 0 ? "text-emerald-600" : ""}`}>
              {avgGap > 0 ? "+" : ""}{avgGap.toFixed(2)} DT
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Products Undercut</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">{undercut}</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="size-4 text-indigo-500" />Price Gap Chart</CardTitle>
          <CardDescription>Difference between your price and the cheapest competitor (positive = you are more expensive).</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/30" />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} fontSize={11} width={100} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: "12px" }} />
                <Bar dataKey="gap" radius={[0, 8, 8, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.gap > 0 ? "#ef4444" : "#22c55e"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No competitor data available</div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Detailed Comparison</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium text-right">Your Price</th>
                  <th className="px-4 py-3 font-medium text-right">Cheapest</th>
                  <th className="px-4 py-3 font-medium">Cheapest Seller</th>
                  <th className="px-4 py-3 font-medium text-right">Gap</th>
                  <th className="px-4 py-3 font-medium text-right">Market Avg</th>
                  <th className="px-4 py-3 font-medium text-center">Rank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No data available</td></tr>
                ) : (
                  data.map((row, i) => {
                    const gap = Number(row.gap_to_cheapest ?? 0)
                    return (
                      <tr key={row.product_id ?? i} className="transition-colors hover:bg-muted/20">
                        <td className="max-w-[200px] truncate px-4 py-3 font-medium">{String(row.product_name ?? "-")}</td>
                        <td className="px-4 py-3 text-right font-mono">{Number(row.vendor_price ?? 0).toFixed(2)} DT</td>
                        <td className="px-4 py-3 text-right font-mono">{Number(row.cheapest_competitor_price ?? 0).toFixed(2)} DT</td>
                        <td className="px-4 py-3 text-muted-foreground">{String(row.competitor_seller_name ?? "-")}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center gap-0.5 font-mono font-bold ${gap > 0 ? "text-red-600" : gap < 0 ? "text-emerald-600" : ""}`}>
                            {gap > 0 ? <ArrowUpRight className="size-3" /> : gap < 0 ? <ArrowDownRight className="size-3" /> : null}
                            {gap > 0 ? "+" : ""}{gap.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">{Number(row.market_average_price ?? 0).toFixed(2)} DT</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className="text-[10px]">#{row.vendor_rank ?? "-"}</Badge>
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
