"use client"

import { useState } from "react"
import { CheckCircle2, Clock, Package, XCircle } from "lucide-react"

import { useDemo } from "../layout-client"
import { DEMO_SPONSORED_ARTICLES } from "@/lib/demo-data"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DemoSponsoredProductsPage() {
  const { isGold } = useDemo()
  const [articles] = useState<any[]>(DEMO_SPONSORED_ARTICLES)

  const statusIcon = (s?: string) => {
    switch (s) {
      case "PUBLISHED": return <CheckCircle2 className="size-4 text-emerald-500" />
      case "EXPIRED": return <Clock className="size-4 text-muted-foreground" />
      case "REJECTED": return <XCircle className="size-4 text-red-500" />
      default: return <Clock className="size-4 text-amber-500" />
    }
  }

  const statusColor = (s?: string) => {
    switch (s) {
      case "PUBLISHED": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
      case "EXPIRED": return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
      case "REJECTED": return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
      default: return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
    }
  }

  const activeCount = articles.filter((a) => a.status === "PUBLISHED").length
  const maxActive = isGold ? 3 : 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sponsored Products</h1>
        <p className="text-sm text-muted-foreground">Promote your products as sponsored listings across the marketplace.</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Package className="size-4 text-indigo-500" />
            Active Sponsorships
          </CardTitle>
          <CardDescription>
            {activeCount} / {maxActive} active{isGold ? " (Gold: up to 3)" : " (Silver: up to 1)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border/50">
            {articles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="mb-3 size-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No sponsored products yet.</p>
              </div>
            ) : (
              articles.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    {statusIcon(a.status)}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.product_name}</p>
                      <p className="text-xs text-muted-foreground">{a.product_brand}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge className={`text-[10px] uppercase tracking-wider ${statusColor(a.status)}`}>
                      {a.status ?? "PENDING"}
                    </Badge>
                    {a.ends_at && (
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        Ends {new Date(a.ends_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
