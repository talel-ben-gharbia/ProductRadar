"use client"

import React, { useState } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { AlertTriangle, CheckCircle2, Clock, Filter, Package, Search, Shield, XCircle, Zap } from "lucide-react"

import { useDemo } from "../layout-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

function StockBar({ rate }: { rate: number }) {
  const color = rate === 0 ? "bg-emerald-500" : rate <= 10 ? "bg-amber-500" : "bg-red-500"
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, rate)}%` }} />
      </div>
      <span className={`font-mono text-xs font-bold ${color.replace("bg-", "text-")}`}>{rate}%</span>
    </div>
  )
}

function RiskBadge({ rate }: { rate: number }) {
  if (rate === 0) return <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400">Healthy</Badge>
  if (rate <= 10) return <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">Low Risk</Badge>
  if (rate <= 50) return <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Medium Risk</Badge>
  return <Badge variant="destructive" className="text-[10px]">Critical</Badge>
}

export default function DemoStockMonitoringPage() {
  const { summary } = useDemo()
  const metrics = summary.metrics as Record<string, any>
  const data = ((metrics?.stock_monitoring ?? []) as any[])
  const inStock = Number(metrics?.in_stock_count ?? 0)
  const outOfStock = Number(metrics?.out_of_stock_count ?? 0)
  const total = inStock + outOfStock
  const outOfStockRate = total > 0 ? ((outOfStock / total) * 100).toFixed(1) : "0"
  const opportunities = ((metrics?.opportunities ?? []) as any[])

  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [riskFilter, setRiskFilter] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  const categories = [...new Set(data.map((d: any) => d.category ?? d.product_name?.split(" ")[0] ?? "General"))]

  const filtered = data.filter((item: any) => {
    const name = String(item.product_name ?? "").toLowerCase()
    const matchesSearch = !search || name.includes(search.toLowerCase())
    const matchesCategory = !categoryFilter || (item.category ?? "").toLowerCase() === categoryFilter.toLowerCase()
    const rate = Number(item.out_of_stock_rate ?? 0)
    const matchesRisk = !riskFilter || (
      riskFilter === "healthy" ? rate === 0 :
      riskFilter === "low" ? rate > 0 && rate <= 10 :
      riskFilter === "medium" ? rate > 10 && rate <= 50 :
      riskFilter === "critical" ? rate > 50 : true
    )
    return matchesSearch && matchesCategory && matchesRisk
  })

  const pieData = [
    { name: "In Stock", value: inStock, color: "#22c55e" },
    { name: "Out of Stock", value: outOfStock, color: "#ef4444" },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Monitoring</h1>
          <p className="text-sm text-muted-foreground">Track product availability, stock-out rates, and market opportunities.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1.5">
          <Filter className="size-3.5" /> Filters
        </Button>
      </div>

      {showFilters && (
        <Card className="border-border/50">
          <CardContent className="grid gap-4 p-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Category</label>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">All Categories</option>
                {categories.map((cat: any) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Risk Level</label>
              <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">All</option>
                <option value="healthy">Healthy (0%)</option>
                <option value="low">Low Risk (1-10%)</option>
                <option value="medium">Medium Risk (11-50%)</option>
                <option value="critical">Critical (&gt;50%)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Search Product</label>
              <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9" />
            </div>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40"><CheckCircle2 className="size-5 text-emerald-600" /></div>
            <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">In Stock</p><p className="mt-1 text-2xl font-bold text-emerald-600">{inStock}</p></div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/40"><XCircle className="size-5 text-red-600" /></div>
            <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Out of Stock</p><p className="mt-1 text-2xl font-bold text-red-600">{outOfStock}</p></div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40"><AlertTriangle className="size-5 text-amber-600" /></div>
            <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Out-of-Stock Rate</p><p className="mt-1 text-2xl font-bold">{outOfStockRate}%</p></div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40"><Shield className="size-5 text-indigo-600" /></div>
            <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Opportunities</p><p className="mt-1 text-2xl font-bold text-indigo-600">{opportunities.length}</p></div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1.5fr]">
        <Card className="border-border/50 shadow-sm">
          <CardHeader><CardTitle>Stock Distribution</CardTitle></CardHeader>
          <CardContent className="h-64">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={4}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No stock data</div>}
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap className="size-4 text-emerald-500" /> Market Opportunities</CardTitle>
            <CardDescription>Products where you have a competitive advantage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 relative z-10">
            {opportunities.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <Shield className="size-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No opportunities detected</p>
              </div>
            ) : (
              opportunities.slice(0, 8).map((opp: any, i: number) => (
                <div key={i} className="group/item relative rounded-xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 to-emerald-100/50 px-4 py-3 dark:border-emerald-900/50 dark:from-emerald-950/40 dark:to-emerald-900/20 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-0.5">
                  <div className="absolute -left-px top-2 bottom-2 w-1 rounded-r-md bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  <p className="text-sm font-bold text-emerald-950 dark:text-emerald-100">{String(opp.product_name ?? "Product")}</p>
                  <p className="mt-1 text-xs font-medium text-emerald-800/80 dark:text-emerald-300/80">{String(opp.reason ?? "Opportunity detected")}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Package className="size-4" /> Product Stock Details</CardTitle>
          <CardDescription>{filtered.length} product{filtered.length !== 1 ? "s" : ""} tracked</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium text-center">Stock Status</th>
                  <th className="px-4 py-3 font-medium text-center">OOS Rate</th>
                  <th className="px-4 py-3 font-medium text-center">Risk Level</th>
                  <th className="px-4 py-3 font-medium text-center">Trust Score</th>
                  <th className="px-4 py-3 font-medium text-right">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <Search className="mx-auto mb-2 size-6 text-muted-foreground/40" />
                    No stock data matches your filters
                  </td></tr>
                ) : (
                  filtered.map((item: any, i: number) => {
                    const rate = Number(item.out_of_stock_rate ?? 0)
                    return (
                      <tr key={item.product_id ?? i} className="transition-colors hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium max-w-[200px] truncate">{String(item.product_name ?? "-")}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={rate === 0 ? "default" : rate <= 50 ? "secondary" : "destructive"} className="text-[10px]">
                            {rate === 0 ? "In Stock" : rate <= 50 ? "Low Stock" : "Out of Stock"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StockBar rate={rate} />
                        </td>
                        <td className="px-4 py-3 text-center"><RiskBadge rate={rate} /></td>
                        <td className="px-4 py-3 text-center">
                          {typeof item.trust_score === "number" ? (
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${item.trust_score >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : item.trust_score >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"}`}>
                              {item.trust_score.toFixed(0)}
                            </span>
                          ) : "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3" />
                            {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : "N/A"}
                          </span>
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
