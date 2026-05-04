"use client"

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import B2BPlanGate from "@/components/B2B/b2b-plan-gate"

type StockItem = { seller_name?: string; seller_id?: number; total_listings?: number; out_of_stock?: number; out_of_stock_rate?: number }

export default function StockIntelligencePage() {
  const { summary, isGold } = useB2B()
  const metrics = summary?.metrics as Record<string, unknown> | undefined
  const data = ((metrics?.stock_intelligence ?? metrics?.stock_by_seller ?? []) as StockItem[])

  if (!isGold) {
    return <B2BPlanGate featureName="Stock Intelligence" />
  }

  const inStock = Number(metrics?.in_stock_count ?? 0)
  const outOfStock = Number(metrics?.out_of_stock_count ?? 0)
  const total = inStock + outOfStock

  const chartData = data.slice(0, 10).map((item) => ({
    name: String(item.seller_name ?? "Seller").slice(0, 16),
    rate: Number(item.out_of_stock_rate ?? 0),
  }))

  const worstSeller = data.sort((a, b) => Number(b.out_of_stock_rate ?? 0) - Number(a.out_of_stock_rate ?? 0))[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stock Intelligence</h1>
        <p className="text-sm text-muted-foreground">Stock-out rates by seller and product for your tracked brands.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40"><CheckCircle2 className="size-5 text-emerald-600" /></div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">In Stock</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{inStock}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/40"><XCircle className="size-5 text-red-600" /></div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Out of Stock</p>
              <p className="mt-1 text-2xl font-bold text-red-600">{outOfStock}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40"><AlertTriangle className="size-5 text-amber-600" /></div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">OOS Rate</p>
              <p className="mt-1 text-2xl font-bold">{total > 0 ? ((outOfStock / total) * 100).toFixed(1) : "0"}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Worst Seller</p>
            <p className="mt-2 text-lg font-bold">{worstSeller?.seller_name ?? "—"}</p>
            <p className="text-sm text-red-600">{Number(worstSeller?.out_of_stock_rate ?? 0).toFixed(1)}% OOS</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="size-4 text-amber-500" />Out-of-Stock Rate by Seller</CardTitle>
          <CardDescription>Sellers sorted by their out-of-stock rate.</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10} angle={-30} textAnchor="end" height={60} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} unit="%" />
                <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
                <Bar dataKey="rate" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.rate > 50 ? "#ef4444" : entry.rate > 20 ? "#f59e0b" : "#22c55e"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No stock intelligence data</div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader><CardTitle>Seller Stock Breakdown</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Seller</th>
                  <th className="px-4 py-3 font-medium text-right">Total Listings</th>
                  <th className="px-4 py-3 font-medium text-right">Out of Stock</th>
                  <th className="px-4 py-3 font-medium text-right">OOS Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">No data</td></tr>
                ) : (
                  data.map((item, i) => {
                    const rate = Number(item.out_of_stock_rate ?? 0)
                    return (
                      <tr key={item.seller_id ?? i} className="transition-colors hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{item.seller_name ?? "-"}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.total_listings ?? 0}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.out_of_stock ?? 0}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono font-bold ${rate > 50 ? "text-red-600" : rate > 20 ? "text-amber-600" : "text-emerald-600"}`}>{rate.toFixed(1)}%</span>
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
