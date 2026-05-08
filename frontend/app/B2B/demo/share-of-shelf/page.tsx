"use client"

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { BarChart3, Layers, TrendingUp } from "lucide-react"

import { useDemo } from "../layout-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8", "#7c3aed", "#6d28d9", "#5b21b6"]

export default function ShareOfShelfPage() {
  const { summary } = useDemo()
  const metrics = summary.metrics as Record<string, any>
  const data = (metrics?.share_of_shelf ?? []) as Array<Record<string, any>>

  const totalBrandProducts = data.reduce((sum: number, d: any) => sum + (Number(d.brand_products ?? 0)), 0)
  const totalMarketProducts = data.reduce((sum: number, d: any) => sum + (Number(d.total_products ?? 0)), 0)
  const avgShare = data.length > 0 ? data.reduce((sum: number, d: any) => sum + Number(d.share_of_shelf ?? 0), 0) / data.length : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Share of Shelf</h1>
        <p className="text-sm text-muted-foreground">Your brand's product representation across market categories.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Layers className="mb-2 size-6 text-indigo-500" />
            <p className="text-3xl font-bold">{totalBrandProducts}</p>
            <p className="text-xs text-muted-foreground">Your Products</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <BarChart3 className="mb-2 size-6 text-violet-500" />
            <p className="text-3xl font-bold">{avgShare.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Avg Share Across Categories</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <TrendingUp className="mb-2 size-6 text-emerald-500" />
            <p className="text-3xl font-bold">{totalMarketProducts}</p>
            <p className="text-xs text-muted-foreground">Total Market Products</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-4 text-indigo-500" />
            Share of Shelf by Category
          </CardTitle>
          <CardDescription>Percentage of products in each category that belong to your brand.</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.map((d: any) => ({ name: String(d.category ?? ""), share: Number(d.share_of_shelf ?? 0), yours: Number(d.brand_products ?? 0), total: Number(d.total_products ?? 0) }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} className="fill-muted-foreground" />
                <YAxis tickLine={false} axisLine={false} fontSize={11} className="fill-muted-foreground" unit="%" />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
                  formatter={(value: number, name: string) => [name === "share" ? `${value.toFixed(1)}%` : value, name === "share" ? "Share of Shelf" : name === "yours" ? "Your Products" : "Total Products"]} />
                <Bar dataKey="share" radius={[8, 8, 0, 0]}>
                  {data.map((_: any, index: number) => (
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.length > 0 ? data.map((cat: any) => {
          const share = Number(cat.share_of_shelf ?? 0)
          const color = share >= 25 ? "text-emerald-600" : share >= 15 ? "text-amber-600" : "text-red-600"
          const bgColor = share >= 25 ? "bg-emerald-50 dark:bg-emerald-950/20" : share >= 15 ? "bg-amber-50 dark:bg-amber-950/20" : "bg-red-50 dark:bg-red-950/20"
          return (
            <Card key={cat.category_id ?? String(cat.category)} className="border-border/50 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{String(cat.category ?? "")}</h3>
                  <span className={`text-lg font-black ${color}`}>{share.toFixed(1)}%</span>
                </div>
                <div className={`mt-3 h-2 w-full overflow-hidden rounded-full ${bgColor}`}>
                  <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${Math.min(100, share)}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{String(cat.brand_products ?? 0)} yours</span>
                  <span>{String(cat.total_products ?? 0)} total</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {share >= 20 ? "Strong presence" : share >= 10 ? "Moderate presence" : "Low presence"}
                  <span className="ml-1">in this category.</span>
                </p>
              </CardContent>
            </Card>
          )
        }) : (
          <div className="col-span-full flex items-center justify-center py-16 text-sm text-muted-foreground">No share of shelf data available</div>
        )}
      </div>
    </div>
  )
}
