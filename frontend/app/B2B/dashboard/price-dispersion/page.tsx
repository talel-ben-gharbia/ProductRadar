"use client"

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { LineChart as LineChartIcon } from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8", "#7c3aed"]

type DispersionItem = {
  product_id?: number; product_name?: string; min_price?: number; max_price?: number;
  price_range?: number; dispersion_pct?: number; sellers_count?: number; seller_with_min?: string; seller_with_max?: string
}

export default function PriceDispersionPage() {
  const { summary } = useB2B()
  const metrics = summary?.metrics as Record<string, unknown> | undefined
  const data = ((metrics?.price_dispersion ?? []) as DispersionItem[])

  const chartData = data.slice(0, 12).map((item) => ({
    name: String(item.product_name ?? "Product").slice(0, 18),
    dispersion: Number(item.dispersion_pct ?? 0),
  }))

  const avgDispersion = data.length > 0 ? data.reduce((s, d) => s + Number(d.dispersion_pct ?? 0), 0) / data.length : 0
  const highDispersion = data.filter((d) => Number(d.dispersion_pct ?? 0) > 30).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Price Dispersion</h1>
        <p className="text-sm text-muted-foreground">Analyze pricing spread across sellers for each product.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Products Analyzed</p>
            <p className="mt-2 text-3xl font-bold">{data.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg Dispersion</p>
            <p className="mt-2 text-3xl font-bold text-violet-600">{avgDispersion.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">High Dispersion (&gt;30%)</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">{highDispersion}</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><LineChartIcon className="size-4 text-violet-500" />Dispersion by Product</CardTitle>
          <CardDescription>Price variation across different sellers (higher % = wider spread).</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10} angle={-30} textAnchor="end" height={60} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} unit="%" />
                <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} formatter={(val: number) => `${val.toFixed(1)}%`} />
                <Bar dataKey="dispersion" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.dispersion > 30 ? "#f59e0b" : COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-sm text-muted-foreground">
              <LineChartIcon className="mb-2 size-8 opacity-30" />
              <span>No dispersion data</span>
              <span className="text-xs text-muted-foreground/70 mt-1">Price spread analysis will appear once multiple sellers stock the same products.</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Price Range Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium text-right">Min Price</th>
                  <th className="px-4 py-3 font-medium text-right">Max Price</th>
                  <th className="px-4 py-3 font-medium text-right">Range</th>
                  <th className="px-4 py-3 font-medium text-right">Dispersion %</th>
                  <th className="px-4 py-3 font-medium text-center">Sellers</th>
                  <th className="px-4 py-3 font-medium">Cheapest</th>
                  <th className="px-4 py-3 font-medium">Most Expensive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-16 text-center">
                    <LineChartIcon className="mx-auto mb-3 size-10 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">No price range data yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Price range details will appear when products have multiple competing sellers.</p>
                  </td></tr>
                ) : (
                  data.map((item, i) => {
                    const dispersion = Number(item.dispersion_pct ?? 0)
                    return (
                      <tr key={item.product_id ?? i} className="transition-colors hover:bg-muted/20">
                        <td className="max-w-[180px] truncate px-4 py-3 font-medium">{item.product_name ?? "-"}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-600">{Number(item.min_price ?? 0).toFixed(2)} DT</td>
                        <td className="px-4 py-3 text-right font-mono text-red-600">{Number(item.max_price ?? 0).toFixed(2)} DT</td>
                        <td className="px-4 py-3 text-right font-mono">{Number(item.price_range ?? 0).toFixed(2)} DT</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono font-bold ${dispersion > 30 ? "text-amber-600" : "text-indigo-600"}`}>{dispersion.toFixed(1)}%</span>
                        </td>
                        <td className="px-4 py-3 text-center"><Badge variant="outline" className="text-[10px]">{item.sellers_count ?? "-"}</Badge></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{item.seller_with_min ?? "-"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{item.seller_with_max ?? "-"}</td>
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
