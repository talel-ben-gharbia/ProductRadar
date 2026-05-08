"use client"

import { useState } from "react"
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { DollarSign, LineChart, Minus, Plus, TrendingDown, TrendingUp } from "lucide-react"

import { useDemo } from "../layout-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8", "#7c3aed", "#6d28d9"]

export default function PriceDispersionPage() {
  const { summary } = useDemo()
  const metrics = summary.metrics as Record<string, any>
  const data = (metrics?.price_dispersion ?? []) as Array<Record<string, any>>

  const [expandedProduct, setExpandedProduct] = useState<string | null>(null)

  const avgDispersion = data.length > 0
    ? data.reduce((sum: number, d: any) => sum + Number(d.dispersion_pct ?? 0), 0) / data.length
    : 0
  const totalProducts = data.length
  const avgSellersCount = data.length > 0
    ? data.reduce((sum: number, d: any) => sum + Number(d.sellers_count ?? 0), 0) / data.length
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Price Dispersion</h1>
        <p className="text-sm text-muted-foreground">Analyze price variation across sellers for each product.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <LineChart className="mb-2 size-6 text-indigo-500" />
            <p className="text-3xl font-bold">{avgDispersion.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Avg Price Dispersion</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <DollarSign className="mb-2 size-6 text-violet-500" />
            <p className="text-3xl font-bold">{totalProducts}</p>
            <p className="text-xs text-muted-foreground">Products Tracked</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <TrendingUp className="mb-2 size-6 text-emerald-500" />
            <p className="text-3xl font-bold">{avgSellersCount.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Avg Sellers per Product</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="size-4 text-indigo-500" />
            Price Dispersion by Product
          </CardTitle>
          <CardDescription>Price range width as a percentage of the midpoint price.</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.map((d: any) => ({
                name: String(d.product_name ?? d.product_id ?? "").slice(0, 20),
                dispersion: Number(d.dispersion_pct ?? 0),
                range: Number(d.price_range ?? 0),
              }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} className="fill-muted-foreground" />
                <YAxis tickLine={false} axisLine={false} fontSize={11} className="fill-muted-foreground" unit="%" />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
                  formatter={(value: number, name: string) => [name === "dispersion" ? `${value.toFixed(1)}%` : `$${value.toFixed(2)}`, name === "dispersion" ? "Dispersion" : "Price Range"]} />
                <Bar dataKey="dispersion" radius={[8, 8, 0, 0]}>
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

      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Product Details</h2>
        {data.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">No price dispersion data available</div>
        ) : (
          data.map((item: any) => {
            const pid = String(item.product_id ?? item.product_name ?? "")
            const isExpanded = expandedProduct === pid
            const dispersion = Number(item.dispersion_pct ?? 0)
            const DirectionIcon = dispersion > 22 ? TrendingUp : dispersion > 15 ? Minus : TrendingDown
            const directionColor = dispersion > 22 ? "text-red-500" : dispersion > 15 ? "text-amber-500" : "text-emerald-500"
            return (
              <Card key={pid} className="border-border/50 shadow-sm overflow-hidden">
                <button type="button" onClick={() => setExpandedProduct(isExpanded ? null : pid)} className="w-full text-left">
                  <CardContent className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <DirectionIcon className={`size-5 ${directionColor}`} />
                      <div>
                        <p className="font-semibold">{String(item.product_name ?? "-")}</p>
                        <p className="text-xs text-muted-foreground">{String(item.sellers_count ?? 0)} sellers</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{dispersion.toFixed(1)}% dispersion</p>
                      <p className="text-xs text-muted-foreground">${Number(item.min_price ?? 0).toFixed(2)} - ${Number(item.max_price ?? 0).toFixed(2)}</p>
                    </div>
                  </CardContent>
                </button>
                {isExpanded && (
                  <div className="border-t border-border/50 bg-muted/20 px-4 py-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-xs">
                          <span className="text-muted-foreground">Cheapest Seller</span>
                          <span className="font-semibold text-emerald-600">{String(item.seller_with_min ?? "-")}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-xs">
                          <span className="text-muted-foreground">Most Expensive Seller</span>
                          <span className="font-semibold text-red-600">{String(item.seller_with_max ?? "-")}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-xs">
                          <span className="text-muted-foreground">Price Range</span>
                          <span className="font-mono font-semibold">${Number(item.price_range ?? 0).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-xs">
                          <span className="text-muted-foreground">Min Price</span>
                          <span className="font-mono font-semibold">${Number(item.min_price ?? 0).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-xs">
                          <span className="text-muted-foreground">Max Price</span>
                          <span className="font-mono font-semibold">${Number(item.max_price ?? 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">Price Range Visualization</p>
                      <div className="relative h-4 w-full">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-200 via-amber-200 to-red-200 dark:from-emerald-950 dark:via-amber-950 dark:to-red-950" />
                        <div className="absolute inset-0 rounded-full border border-border/30" />
                      </div>
                      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                        <span>${Number(item.min_price ?? 0).toFixed(2)}</span>
                        <span>Range: ${Number(item.price_range ?? 0).toFixed(2)}</span>
                        <span>${Number(item.max_price ?? 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
