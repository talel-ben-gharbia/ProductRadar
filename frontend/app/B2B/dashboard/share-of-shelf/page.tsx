"use client"

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { BarChart3 } from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8", "#7c3aed", "#4f46e5", "#6d28d9"]

type ShelfItem = { category?: string; category_id?: number; brand_products?: number; total_products?: number; share_of_shelf?: number }

export default function ShareOfShelfPage() {
  const { summary } = useB2B()
  const metrics = summary?.metrics as Record<string, unknown> | undefined
  const data = ((metrics?.share_of_shelf ?? []) as ShelfItem[])

  const chartData = data.map((item) => ({
    name: String(item.category ?? "Category").slice(0, 20),
    share: Number(item.share_of_shelf ?? 0),
    brand: Number(item.brand_products ?? 0),
    total: Number(item.total_products ?? 0),
  }))

  const avgShare = data.length > 0 ? data.reduce((s, d) => s + Number(d.share_of_shelf ?? 0), 0) / data.length : 0
  const topCategory = data.sort((a, b) => Number(b.share_of_shelf ?? 0) - Number(a.share_of_shelf ?? 0))[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Share of Shelf</h1>
        <p className="text-sm text-muted-foreground">Your brand's product presence relative to total products per category.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Categories Tracked</p>
            <p className="mt-2 text-3xl font-bold">{data.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg Share</p>
            <p className="mt-2 text-3xl font-bold text-indigo-600">{avgShare.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Top Category</p>
            <p className="mt-2 text-xl font-bold">{topCategory?.category ?? "—"}</p>
            <p className="text-sm text-indigo-600">{Number(topCategory?.share_of_shelf ?? 0).toFixed(1)}%</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="size-4 text-indigo-500" />Share of Shelf by Category</CardTitle>
          <CardDescription>Percentage of products belonging to your brand in each category.</CardDescription>
        </CardHeader>
        <CardContent className="h-96">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/30" />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} unit="%" />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} fontSize={11} width={120} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: "12px" }} formatter={(val: number) => `${val.toFixed(1)}%`} />
                <Bar dataKey="share" radius={[0, 8, 8, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No share of shelf data available</div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium text-right">Your Products</th>
                  <th className="px-4 py-3 font-medium text-right">Total Products</th>
                  <th className="px-4 py-3 font-medium text-right">Share (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">No data</td></tr>
                ) : (
                  data.map((item, i) => (
                    <tr key={item.category_id ?? i} className="transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{item.category ?? "-"}</td>
                      <td className="px-4 py-3 text-right font-mono">{item.brand_products ?? 0}</td>
                      <td className="px-4 py-3 text-right font-mono">{item.total_products ?? 0}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(Number(item.share_of_shelf ?? 0), 100)}%` }} />
                          </div>
                          <span className="w-12 text-right font-mono font-bold text-indigo-600">{Number(item.share_of_shelf ?? 0).toFixed(1)}%</span>
                        </div>
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
