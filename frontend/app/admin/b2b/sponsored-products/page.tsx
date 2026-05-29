"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, Loader2, Package, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import B2BErrorState from "@/components/B2B/b2b-error-state"

type SponsoredItem = {
  id: number
  product_id: number | null
  product_name: string | null
  product_brand: string | null
  product_image: string | null
  status: string
  published_at: string | null
  ends_at: string | null
  created_at: string | null
  company_id: number | null
  name: string | null
  seller_id: number | null
  ads_request_id: number | null
}

const STATUS_BADGES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  PUBLISHED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  EXPIRED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
}

export default function AdminSponsoredProductsPage() {
  const [items, setItems] = useState<SponsoredItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = statusFilter ? `?status=${statusFilter}` : ""
      const res = await fetch(`/api/b2b/admin/sponsored${params}`)
      const body = await res.json()
      if (res.ok) {
        setItems(body.items ?? [])
      } else {
        setError(body?.error ?? "Failed to load")
      }
    } catch {
      setError("Network error")
    }
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAction = async (id: number, action: "approve" | "reject" | "delete") => {
    setActionLoading(id)
    try {
      const url =
        action === "delete"
          ? `/api/b2b/admin/sponsored/${id}`
          : `/api/b2b/admin/sponsored/${id}/${action}`
      const method = action === "delete" ? "DELETE" : "POST"
      const res = await fetch(url, { method })
      if (res.ok) fetchData()
      else {
        const body = await res.json()
        setError(body?.error ?? "Action failed")
      }
    } catch {
      setError("Network error")
    }
    setActionLoading(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sponsored Products</h1>
          <p className="text-sm text-muted-foreground">Manage vendor sponsored product promotions.</p>
        </div>
        <div className="w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">All</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? (
        <B2BErrorState message={error} onRetry={fetchData} />
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Package className="mb-2 size-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No sponsored product requests.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium">Vendor</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Created</th>
                      <th className="px-4 py-3 font-medium">Expires</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <p className="font-medium">{item.product_name ?? "Unknown"}</p>
                          {item.product_brand && (
                            <p className="text-xs text-muted-foreground">{item.product_brand}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{item.name ?? "-"}</td>
                        <td className="px-4 py-3">
                          <Badge className={`text-xs ${STATUS_BADGES[item.status] ?? ""}`}>
                            {item.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.ends_at ? new Date(item.ends_at).toLocaleDateString() : "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {actionLoading === item.id ? (
                            <Loader2 className="ml-auto size-4 animate-spin" />
                          ) : item.status === "PENDING" ? (
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleAction(item.id, "approve")}
                              >
                                <CheckCircle2 className="mr-1 size-3" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAction(item.id, "reject")}
                              >
                                <XCircle className="mr-1 size-3" />
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600"
                                onClick={() => handleAction(item.id, "delete")}
                              >
                                Delete
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                              onClick={() => handleAction(item.id, "delete")}
                            >
                              Delete
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
