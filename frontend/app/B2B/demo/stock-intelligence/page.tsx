"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle2, Package, ShoppingCart, Store, TrendingDown, XCircle } from "lucide-react"

import { useDemo } from "../layout-client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function StockIntelligencePage() {
  const { summary } = useDemo()
  const metrics = summary.metrics as Record<string, any>
  const data = (metrics?.stock_intelligence ?? metrics?.stock_by_seller ?? []) as Array<Record<string, any>>

  const [sortKey, setSortKey] = useState<string>("out_of_stock_rate")
  const [showCritical, setShowCritical] = useState(false)

  const sorted = [...data]
    .filter((d) => (showCritical ? Number(d.out_of_stock_rate ?? 0) >= 20 : true))
    .sort((a, b) => {
      const av = Number(a[sortKey] ?? 0)
      const bv = Number(b[sortKey] ?? 0)
      return sortKey === "seller_name" ? String(a.seller_name ?? "").localeCompare(String(b.seller_name ?? "")) : bv - av
    })

  const totalListings = data.reduce((sum: number, d: any) => sum + Number(d.total_listings ?? 0), 0)
  const totalOOS = data.reduce((sum: number, d: any) => sum + Number(d.out_of_stock ?? 0), 0)
  const avgOOSRate = data.length > 0 ? data.reduce((sum: number, d: any) => sum + Number(d.out_of_stock_rate ?? 0), 0) / data.length : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stock Intelligence</h1>
        <p className="text-sm text-muted-foreground">Stock availability analysis across all competitor sellers.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Package className="mb-2 size-6 text-indigo-500" />
            <p className="text-3xl font-bold">{totalListings}</p>
            <p className="text-xs text-muted-foreground">Total Listings</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <ShoppingCart className="mb-2 size-6 text-violet-500" />
            <p className="text-3xl font-bold">{data.length}</p>
            <p className="text-xs text-muted-foreground">Sellers Tracked</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <AlertTriangle className="mb-2 size-6 text-amber-500" />
            <p className="text-3xl font-bold">{avgOOSRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Avg Out-of-Stock Rate</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Store className="size-4 text-indigo-500" />
              Seller Stock Analysis
            </CardTitle>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={showCritical} onChange={(e) => setShowCritical(e.target.checked)}
                  className="rounded border-border text-indigo-600" />
                Critical only (&ge;20%)
              </label>
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}
                className="h-8 rounded-md border bg-background px-2 text-xs">
                <option value="out_of_stock_rate">OOS Rate</option>
                <option value="out_of_stock">OOS Count</option>
                <option value="total_listings">Total Listings</option>
                <option value="seller_name">Seller Name</option>
              </select>
            </div>
          </div>
          <CardDescription>Out-of-stock rates and availability metrics by seller.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Seller</th>
                  <th className="px-4 py-3 font-medium text-right">Total Listings</th>
                  <th className="px-4 py-3 font-medium text-right">Out of Stock</th>
                  <th className="px-4 py-3 font-medium text-center">OOS Rate</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {sorted.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-16 text-center text-sm text-muted-foreground">No stock intelligence data available</td></tr>
                ) : (
                  sorted.map((seller: any, i: number) => {
                    const oosRate = Number(seller.out_of_stock_rate ?? 0)
                    const statusColor = oosRate >= 30 ? "text-red-600" : oosRate >= 15 ? "text-amber-600" : "text-emerald-600"
                    const statusBg = oosRate >= 30 ? "bg-red-50 dark:bg-red-950/20" : oosRate >= 15 ? "bg-amber-50 dark:bg-amber-950/20" : "bg-emerald-50 dark:bg-emerald-950/20"
                    const StatusIcon = oosRate >= 30 ? XCircle : oosRate >= 15 ? AlertTriangle : CheckCircle2
                    return (
                      <tr key={seller.seller_id ?? String(seller.seller_name ?? i)} className="transition-colors hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{String(seller.seller_name ?? "-")}</td>
                        <td className="px-4 py-3 text-right font-mono">{String(seller.total_listings ?? 0)}</td>
                        <td className="px-4 py-3 text-right font-mono text-red-600">{String(seller.out_of_stock ?? 0)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-mono font-bold ${statusColor}`}>{oosRate.toFixed(1)}%</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center">
                            <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${statusBg} ${statusColor}`}>
                              <StatusIcon className="size-3" />
                              {oosRate >= 30 ? "High Risk" : oosRate >= 15 ? "Moderate" : "Stable"}
                            </div>
                          </div>
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.slice(0, 6).map((seller: any, i: number) => {
          const oosRate = Number(seller.out_of_stock_rate ?? 0)
          const gaugeColor = oosRate >= 30 ? "#ef4444" : oosRate >= 15 ? "#f59e0b" : "#22c55e"
          const gaugeScore = 100 - oosRate
          return (
            <Card key={seller.seller_id ?? String(seller.seller_name ?? i)} className="border-border/50 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{String(seller.seller_name ?? "-")}</h3>
                  <div className="relative size-14 shrink-0">
                    <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-muted" strokeWidth="2.5" />
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke={gaugeColor} strokeWidth="2.5"
                        strokeDasharray={`${Math.max(0, Math.min(97.4, (gaugeScore / 100) * 97.4))} 97.4`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-black" style={{ color: gaugeColor }}>{gaugeScore.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-center text-xs">
                  <div className="rounded-lg bg-muted/30 p-2">
                    <p className="font-bold text-lg">{String(seller.total_listings ?? 0)}</p>
                    <p className="text-muted-foreground">Listings</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-2">
                    <p className="font-bold text-lg text-red-500">{String(seller.out_of_stock ?? 0)}</p>
                    <p className="text-muted-foreground">Out of Stock</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
