"use client"

import { useCallback, useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts"
import { BarChart3, TrendingDown, TrendingUp, ScatterChart as ScatterIcon } from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import B2BPlanGate from "@/components/B2B/b2b-plan-gate"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type CompetitivenessItem = {
  product_id: number
  product_name: string
  brand: string
  category_name: string
  brand_avg_price: number | null
  category_avg_price: number | null
  competitiveness_index: number | null
}

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8", "#7c3aed"]

export default function PriceCompetitivenessPage() {
  const { summary, loading, isGold } = useB2B()
  const [brands, setBrands] = useState<string[]>([])
  const [selectedBrand, setSelectedBrand] = useState<string>("")
  const [products, setProducts] = useState<CompetitivenessItem[]>([])
  const [productsLoading, setProductsLoading] = useState(false)

  const metrics = summary?.metrics as Record<string, unknown> | undefined
  const competitorBrands = (metrics?.competitor_brands ?? []) as Array<Record<string, unknown>>

  useEffect(() => {
    const brandScope = summary?.user?.company_name
    const allBrands = competitorBrands.map((b) => String(b.brand ?? "")).filter(Boolean)
    const unique = [...new Set(allBrands)]
    setBrands(unique)
    if (brandScope && !selectedBrand) setSelectedBrand(brandScope)
    else if (unique.length > 0 && !selectedBrand) setSelectedBrand(unique[0])
  }, [competitorBrands, summary, selectedBrand])

  const fetchData = useCallback(async (brand: string) => {
    if (!brand) return
    setProductsLoading(true)
    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=price-competitiveness&brand=${encodeURIComponent(brand)}`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products ?? [])
      }
    } catch { /* ignore */ }
    setProductsLoading(false)
  }, [])

  useEffect(() => { if (selectedBrand) fetchData(selectedBrand) }, [selectedBrand, fetchData])

  const avgIndex = products.length > 0
    ? products.reduce((s, p) => s + (p.competitiveness_index ?? 100), 0) / products.length
    : 100

  const competitiveCount = products.filter((p) => (p.competitiveness_index ?? 100) < 95).length
  const premiumCount = products.filter((p) => (p.competitiveness_index ?? 100) > 105).length

  const chartData = products.slice(0, 12).map((p) => ({
    name: p.product_name.slice(0, 20),
    index: p.competitiveness_index ?? 100,
    category: p.category_name,
  }))

  if (loading && !summary) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted/30" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      </div>
    )
  }

  if (!isGold) return <B2BPlanGate featureName="Price Competitiveness" />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Price Competitiveness</h1>
          <p className="text-sm text-muted-foreground">How your brand's prices compare to the category average.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Brand:</span>
          <Select value={selectedBrand} onValueChange={setSelectedBrand}>
            <SelectTrigger className="w-48 h-9 text-sm">
              <SelectValue placeholder="Select brand..." />
            </SelectTrigger>
            <SelectContent>
              {brands.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg Competitiveness</p>
            <p className={`mt-2 text-3xl font-bold ${avgIndex < 95 ? "text-emerald-600" : avgIndex > 105 ? "text-red-600" : "text-amber-600"}`}>
              {avgIndex.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">100 = market average</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Competitive (Below Avg)</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">{competitiveCount}</p>
            <p className="text-xs text-muted-foreground">Products priced below market avg</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Premium (Above Avg)</p>
            <p className="mt-2 text-3xl font-bold text-red-600">{premiumCount}</p>
            <p className="text-xs text-muted-foreground">Products priced above market avg</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="size-4 text-indigo-500" />Competitiveness Index by Product</CardTitle>
          <CardDescription>Below 95 = competitive (green), 95-105 = at market (amber), above 105 = premium (red).</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10} angle={-30} textAnchor="end" height={60} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} domain={[0, 200]} />
                <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} formatter={(val: number) => `${val.toFixed(1)}`} />
                <Bar dataKey="index" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.index < 95 ? "#22c55e" : entry.index > 105 ? "#ef4444" : "#f59e0b"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-sm text-muted-foreground">
              <BarChart3 className="mb-2 size-8 opacity-30" />
              <span>No data available</span>
              <span className="text-xs text-muted-foreground/70 mt-1">Select a brand above to see price competitiveness.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {products.length > 0 && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ScatterIcon className="size-4 text-indigo-500" />Price vs Competitiveness</CardTitle>
            <CardDescription>Each dot is a product. X-axis = brand avg price, Y-axis = competitiveness index. Below 95 = competitive, above 105 = premium.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="x" tickLine={false} axisLine={false} fontSize={11} type="number" domain={['auto', 'auto']} />
                <YAxis dataKey="y" tickLine={false} axisLine={false} fontSize={11} type="number" domain={[0, 200]} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
                  formatter={(val: number, name: string) => [name === "y" ? `${val.toFixed(1)}` : `${val.toFixed(3)} DT`, name === "y" ? "Index" : "Price"]}
                  labelFormatter={() => ""}
                />
                <Scatter
                  data={products.map((p) => ({
                    x: p.brand_avg_price ?? 0,
                    y: p.competitiveness_index ?? 100,
                    name: p.product_name,
                    category: p.category_name,
                  }))}
                  fill="#6366f1"
                  stroke="none"
                >
                  {products.map((p, i) => {
                    const idx = p.competitiveness_index ?? 100
                    const color = idx < 95 ? "#22c55e" : idx > 105 ? "#ef4444" : "#f59e0b"
                    return <Cell key={i} fill={color} />
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Product Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium text-right">Brand Avg</th>
                  <th className="px-4 py-3 font-medium text-right">Category Avg</th>
                  <th className="px-4 py-3 font-medium text-center">Index</th>
                  <th className="px-4 py-3 font-medium text-center">Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {productsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-4"><div className="h-4 w-full animate-pulse rounded bg-muted/50" /></td>)}</tr>
                  ))
                ) : products.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-16 text-center">
                    <BarChart3 className="mx-auto mb-3 size-10 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">No products found for this brand</p>
                  </td></tr>
                ) : (
                  products.map((p) => {
                    const idx = p.competitiveness_index ?? 100
                    const isCompetitive = idx < 95
                    const isPremium = idx > 105
                    return (
                      <tr key={p.product_id} className="transition-colors hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{p.product_name}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{p.category_name ?? "-"}</td>
                        <td className="px-4 py-3 text-right font-mono">{p.brand_avg_price?.toFixed(3) ?? "-"} DT</td>
                        <td className="px-4 py-3 text-right font-mono">{p.category_avg_price?.toFixed(3) ?? "-"} DT</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-mono font-bold ${isCompetitive ? "text-emerald-600" : isPremium ? "text-red-600" : "text-amber-600"}`}>
                            {idx.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isCompetitive ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] gap-1">
                              <TrendingDown className="size-3" /> Competitive
                            </Badge>
                          ) : isPremium ? (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 text-[10px] gap-1">
                              <TrendingUp className="size-3" /> Premium
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">At Market</Badge>
                          )}
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
