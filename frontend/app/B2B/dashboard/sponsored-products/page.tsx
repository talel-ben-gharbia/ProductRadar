"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, Clock, Crown, Loader2, Megaphone, Package, Search, Sparkles, XCircle } from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import { QuotaBar } from "@/components/B2B/b2b-quota-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import B2BErrorState from "@/components/B2B/b2b-error-state"

type ProductItem = {
  listing_id: number
  product_id: number
  product_name: string
  product_brand: string | null
  ref: string | null
}

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
}

type SponsoredResponse = {
  items: SponsoredItem[]
  quota: { current: number; limit: number; remaining: number } | null
  active_count: number
}

const STATUS_BADGES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  PUBLISHED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  EXPIRED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
}

export default function SponsoredProductsPage() {
  const { firebaseUid } = useB2B()
  const [data, setData] = useState<SponsoredResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search + Category
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ProductItem[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    if (!firebaseUid) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=${encodeURIComponent("sponsored")}`)
      const body = await res.json()
      if (res.ok) {
        setData(body)
      } else {
        setError(body?.error ?? "Failed to load")
      }
    } catch {
      setError("Network error")
    }
    setLoading(false)
  }, [firebaseUid])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!firebaseUid || searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/b2b/sponsored/products?search=${encodeURIComponent(searchQuery)}`, {
          headers: { "X-Firebase-Uid": firebaseUid },
        })
        const body = await res.json()
        if (res.ok) setSearchResults(body.items ?? [])
      } catch { setError("Product search failed") }
      setSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, firebaseUid])

  const handleSubmit = async () => {
    if (!selectedProduct || !firebaseUid) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=${encodeURIComponent("sponsored")}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: selectedProduct.listing_id }),
      })
      const body = await res.json()
      if (res.ok) {
        setSelectedProduct(null)
        setSearchQuery("")
        setSearchResults([])
        fetchData()
      } else {
        setError(body?.error ?? "Failed to submit")
      }
    } catch {
      setError("Network error")
    }
    setSubmitting(false)
  }

  const handleCancel = async (id: number) => {
    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=${encodeURIComponent("sponsored/" + id)}`, {
        method: "DELETE",
      })
      if (res.ok) fetchData()
    } catch { setError("Failed to cancel sponsorship") }
  }

  const quota = data?.quota
  const activeCount = data?.active_count ?? 0
  const pendingCount = data?.items?.filter((i) => i.status === "PENDING").length ?? 0
  const publishedCount = data?.items?.filter((i) => i.status === "PUBLISHED").length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Sparkles className="size-6 text-amber-500" />
          Sponsored Products
        </h1>
        <p className="text-sm text-muted-foreground">Boost your products to appear first on the marketplace.</p>
      </div>

      {quota && <QuotaBar usage={quota.current} limit={quota.limit} label="Monthly Sponsorship Quota" />}

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40">
              <Megaphone className="size-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active Sponsorships</p>
              <p className="mt-1 text-2xl font-bold text-indigo-600">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
              <Crown className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Published</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{publishedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40">
              <Clock className="size-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pending Review</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {error && (
        <B2BErrorState message={error} onRetry={() => { setError(null); fetchData() }} />
      )}

      {/* Submit Form */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="size-4 text-indigo-500" />
            New Sponsorship Request
          </CardTitle>
          <CardDescription>Search your listings or browse by category to select a product.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="search">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="search" className="text-xs">Search</TabsTrigger>
              <TabsTrigger value="category" className="text-xs">Browse by Category</TabsTrigger>
            </TabsList>
            <TabsContent value="search" className="space-y-3 pt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Type product name or ref..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              {searching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
              {searchResults.length > 0 && (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
                  {searchResults.map((item) => (
                    <button
                      key={item.listing_id}
                      type="button"
                      onClick={() => setSelectedProduct(item)}
                      className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                        selectedProduct?.listing_id === item.listing_id ? "bg-indigo-50 ring-1 ring-indigo-500 dark:bg-indigo-950/30" : ""
                      }`}
                    >
                      <span className="font-medium">{item.product_name}</span>
                      {item.ref && <span className="ml-2 text-muted-foreground">({item.ref})</span>}
                      {item.product_brand && <span className="ml-2 text-xs text-muted-foreground/60">{item.product_brand}</span>}
                    </button>
                  ))}
                </div>
              )}
              {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-4">No products found matching &quot;{searchQuery}&quot;</p>
              )}
            </TabsContent>
            <TabsContent value="category" className="space-y-3 pt-3">
              <CategoryPicker
                firebaseUid={firebaseUid}
                onSelect={setSelectedProduct}
                selectedId={selectedProduct?.listing_id ?? null}
              />
            </TabsContent>
          </Tabs>

          {selectedProduct && (
            <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 to-white p-4 dark:border-indigo-800 dark:from-indigo-950/30 dark:to-transparent">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/50">
                  <Package className="size-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{selectedProduct.product_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedProduct.ref ?? "No ref"} · {selectedProduct.product_brand ?? "Unknown brand"}</p>
                </div>
              </div>
              <Button size="sm" onClick={handleSubmit} disabled={submitting} className="gap-1.5">
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {submitting ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing Requests */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Megaphone className="size-4 text-muted-foreground" />
              Your Sponsorship Requests
            </CardTitle>
            <CardDescription>Manage your product sponsorship requests.</CardDescription>
          </div>
          {data && data.items.length > 0 && (
            <Badge variant="outline" className="text-xs">{data.items.length} total</Badge>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-muted">
                <Megaphone className="size-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No sponsorship requests yet</p>
              <p className="mt-1 text-xs text-muted-foreground/70">Use the form above to sponsor your first product.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium">Expires</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {data.items.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{item.product_name ?? "Unknown"}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${STATUS_BADGES[item.status] ?? ""}`}>
                          {item.status === "PUBLISHED" && <CheckCircle2 className="mr-1 inline size-3" />}
                          {item.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {item.ends_at ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3" />
                            {new Date(item.ends_at).toLocaleDateString()}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.status === "PENDING" && (
                          <Button variant="ghost" size="sm" onClick={() => handleCancel(item.id)} className="gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50">
                            <XCircle className="size-3" />
                            Cancel
                          </Button>
                        )}
                        {item.status === "REJECTED" && (
                          <span className="text-xs text-muted-foreground italic">Not approved</span>
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
    </div>
  )
}

function CategoryPicker({
  firebaseUid,
  onSelect,
  selectedId,
}: {
  firebaseUid: string | null
  onSelect: (item: ProductItem) => void
  selectedId: number | null
}) {
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([])
  const [selectedCat, setSelectedCat] = useState<string>("")
  const [products, setProducts] = useState<ProductItem[]>([])
  const [loading, setLoading] = useState(false)
  const [catError, setCatError] = useState<string | null>(null)
  const [catRetry, setCatRetry] = useState(0)

  useEffect(() => {
    if (!firebaseUid) return
    fetch(`/api/b2b/workspace?endpoint=${encodeURIComponent("listings")}&limit=1000`)
      .then((r) => r.json())
      .then((body) => {
        const items = body?.items ?? []
        const seen = new Map<number, string>()
        for (const item of items) {
          const cid = item.categoryId
          const cname = item.categoryName
          if (cid && cname && !seen.has(cid)) {
            seen.set(cid, cname)
          }
        }
        setCategories([...seen.entries()].map(([id, name]) => ({ id, name })))
      })
      .catch(() => setCatError("Failed to load categories"))
  }, [firebaseUid, catRetry])

  useEffect(() => {
    if (!firebaseUid || !selectedCat) {
      setProducts([])
      return
    }
    setLoading(true)
    fetch(`/api/b2b/workspace?endpoint=${encodeURIComponent("listings")}&category=${encodeURIComponent(selectedCat)}&limit=200`)
      .then((r) => r.json())
      .then((body) => {
        setProducts(
          (body?.items ?? []).map((i: Record<string, unknown>) => ({
            listing_id: i.id as number,
            product_id: i.productId as number,
            product_name: i.productName as string,
            product_brand: i.productBrand as string | null,
            ref: i.ref as string | null,
          })),
        )
      })
      .catch(() => setCatError("Failed to load products"))
      .finally(() => setLoading(false))
  }, [selectedCat, firebaseUid, catRetry])

  if (catError) {
    return (
      <B2BErrorState
        message={catError}
        onRetry={() => { setCatError(null); setCatRetry(n => n + 1) }}
      />
    )
  }

  return (
    <div className="space-y-3">
      <Select value={selectedCat} onValueChange={setSelectedCat}>
        <SelectTrigger>
          <SelectValue placeholder="Select a category..." />
        </SelectTrigger>
        <SelectContent>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      {products.length > 0 && (
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
          {products.map((item) => (
            <button
              key={item.listing_id}
              type="button"
              onClick={() => onSelect(item)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                selectedId === item.listing_id ? "bg-indigo-50 ring-1 ring-indigo-500 dark:bg-indigo-950/30" : ""
              }`}
            >
              <span className="font-medium">{item.product_name}</span>
              {item.ref && <span className="ml-2 text-muted-foreground">({item.ref})</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
