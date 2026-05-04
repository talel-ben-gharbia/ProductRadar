"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { AlertTriangle, CheckCircle2, Shield, XCircle, Zap } from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type StockItem = { product_id?: number; product_name?: string; out_of_stock_rate?: number; trust_score?: number; listing_url?: string }

export default function StockMonitoringPage() {
  const { summary } = useB2B()
  const metrics = summary?.metrics as Record<string, unknown> | undefined
  const data = ((metrics?.stock_monitoring ?? []) as StockItem[])
  const inStock = Number(metrics?.in_stock_count ?? 0)
  const outOfStock = Number(metrics?.out_of_stock_count ?? 0)
  const total = inStock + outOfStock
  const outOfStockRate = total > 0 ? ((outOfStock / total) * 100).toFixed(1) : "0"

  const pieData = [
    { name: "In Stock", value: inStock, color: "#22c55e" },
    { name: "Out of Stock", value: outOfStock, color: "#ef4444" },
  ].filter((d) => d.value > 0)

  const unstable = data.filter((d) => Number(d.out_of_stock_rate ?? 0) > 0)
  const opportunities = ((metrics?.opportunities ?? []) as Array<Record<string, unknown>>)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stock Monitoring</h1>
        <p className="text-sm text-muted-foreground">Track product availability, stock-out rates, and market opportunities.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
              <CheckCircle2 className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">In Stock</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{inStock}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/40">
              <XCircle className="size-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Out of Stock</p>
              <p className="mt-1 text-2xl font-bold text-red-600">{outOfStock}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40">
              <AlertTriangle className="size-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Out-of-Stock Rate</p>
              <p className="mt-1 text-2xl font-bold">{outOfStockRate}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40">
              <Shield className="size-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Opportunities</p>
              <p className="mt-1 text-2xl font-bold text-indigo-600">{opportunities.length}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1.5fr]">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Stock Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={4} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No stock data</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap className="size-4 text-emerald-500" /> Market Opportunities</CardTitle>
            <CardDescription>Products where you have a competitive advantage (e.g. competitors out of stock).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 relative z-10">
            {opportunities.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <Shield className="size-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No opportunities detected</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Check back later when competitor stock fluctuates.</p>
              </div>
            ) : (
              opportunities.slice(0, 8).map((opp, i) => (
                <div key={i} className="group/item relative rounded-xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 to-emerald-100/50 px-4 py-3 dark:border-emerald-900/50 dark:from-emerald-950/40 dark:to-emerald-900/20 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-0.5">
                  <div className="absolute -left-px top-2 bottom-2 w-1 rounded-r-md bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  <p className="text-sm font-bold text-emerald-950 dark:text-emerald-100">{String(opp.product_name ?? "Product")}</p>
                  <p className="mt-1 text-xs font-medium text-emerald-800/80 dark:text-emerald-300/80">{String(opp.reason ?? "Opportunity detected")}</p>
                  {typeof opp.seller_name === "string" && opp.seller_name !== "" && (
                    <Badge variant="outline" className="mt-2 text-[10px] bg-white/50 dark:bg-black/20 border-emerald-200 dark:border-emerald-800">
                      Competitor: {String(opp.seller_name)}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Product Stock Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium text-center">Out-of-Stock Rate</th>
                  <th className="px-4 py-3 font-medium text-center">Trust Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-12 text-center text-muted-foreground">No stock data</td></tr>
                ) : (
                  data.map((item, i) => (
                    <tr key={item.product_id ?? i} className="transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{String(item.product_name ?? "-")}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-mono font-bold ${Number(item.out_of_stock_rate ?? 0) > 50 ? "text-red-600" : Number(item.out_of_stock_rate ?? 0) > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                          {Number(item.out_of_stock_rate ?? 0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {typeof item.trust_score === "number" ? (
                          <Badge variant="outline" className="text-[10px]">{item.trust_score.toFixed(0)}</Badge>
                        ) : "-"}
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
