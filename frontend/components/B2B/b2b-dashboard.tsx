"use client"

import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCategoriesWithParents } from "@/services/admin/categories"
import { getProducts } from "@/services/admin/products"
import { getProductListings } from "@/services/admin/product-listings"
import { getSellers, type Seller } from "@/services/admin/sellers"
import type { CategoryWithParent, Product, ProductListing } from "@/utils/types"

type DashboardData = {
  products: Product[]
  listings: ProductListing[]
  sellers: Seller[]
  categories: CategoryWithParent[]
}

type ProductInsight = {
  id: number
  name: string
  brand: string | null
  category: string
  listings: number
  priceMin: number | null
  priceMax: number | null
  spreadPercent: number
  trustScore: number
}

type SellerInsight = {
  id: number
  name: string
  listings: number
  activeListings: number
  averagePrice: number | null
  averageTrustScore: number
}

function formatCurrency(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "-"
  }

  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: 2,
  }).format(value)
}

function formatNumber(value: number | null, digits = 1): string {
  if (value === null || Number.isNaN(value)) {
    return "-"
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export default function B2BDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadedAt, setLoadedAt] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      const [products, listings, sellers, categories] = await Promise.all([
        getProducts(),
        getProductListings(),
        getSellers(),
        getCategoriesWithParents(),
      ])

      setData({ products, listings, sellers, categories })
      setLoadedAt(new Date().toLocaleString())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load B2B insights.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const insights = useMemo(() => {
    if (!data) {
      return null
    }

    const categoryLabelById = new Map<number, string>()
    data.categories.forEach((category) => {
      categoryLabelById.set(category.id, category.category ?? category.name)
    })

    const listingsByProduct = new Map<number, ProductListing[]>()
    const listingsBySeller = new Map<number, ProductListing[]>()

    data.listings.forEach((listing) => {
      if (listing.productId !== null) {
        const current = listingsByProduct.get(listing.productId) ?? []
        current.push(listing)
        listingsByProduct.set(listing.productId, current)
      }

      if (listing.sellerId !== null) {
        const current = listingsBySeller.get(listing.sellerId) ?? []
        current.push(listing)
        listingsBySeller.set(listing.sellerId, current)
      }
    })

    const productInsights: ProductInsight[] = data.products.map((product) => {
      const productListings = listingsByProduct.get(product.id) ?? []
      const prices = productListings
        .map((listing) => listing.price)
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
      const trustScores = productListings
        .map((listing) => listing.trust_score)
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value))

      const priceMin = prices.length > 0 ? Math.min(...prices) : null
      const priceMax = prices.length > 0 ? Math.max(...prices) : null
      const spreadPercent = priceMin !== null && priceMax !== null && priceMin > 0 ? ((priceMax - priceMin) / priceMin) * 100 : 0
      const categoryLabel = product.categoryId !== null ? categoryLabelById.get(product.categoryId) ?? "Uncategorized" : "Uncategorized"

      return {
        id: product.id,
        name: product.name,
        brand: product.brand,
        category: categoryLabel,
        listings: productListings.length,
        priceMin,
        priceMax,
        spreadPercent,
        trustScore: average(trustScores) ?? 0,
      }
    })

    const sellerInsights: SellerInsight[] = data.sellers.map((seller) => {
      const sellerListings = listingsBySeller.get(seller.id) ?? []
      const activeListings = sellerListings.filter((listing) => listing.is_active !== false)
      const prices = sellerListings
        .map((listing) => listing.price)
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
      const trustScores = sellerListings
        .map((listing) => listing.trust_score)
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value))

      return {
        id: seller.id,
        name: seller.name,
        listings: sellerListings.length,
        activeListings: activeListings.length,
        averagePrice: average(prices),
        averageTrustScore: average(trustScores) ?? 0,
      }
    })

    const totalProducts = data.products.length
    const totalListings = data.listings.length
    const activeListings = data.listings.filter((listing) => listing.is_active !== false).length
    const totalSellers = data.sellers.length

    const trustScores = data.listings
      .map((listing) => listing.trust_score)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    const averageTrustScore = average(trustScores) ?? 0

    const prices = data.listings
      .map((listing) => listing.price)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    const averagePrice = average(prices)

    const productRows = [...productInsights]
      .filter((item) => item.listings > 0)
      .sort((left, right) => right.spreadPercent - left.spreadPercent || right.listings - left.listings)
      .slice(0, 6)

    const sellerRows = [...sellerInsights]
      .filter((item) => item.listings > 0)
      .sort((left, right) => right.listings - left.listings || right.averageTrustScore - left.averageTrustScore)
      .slice(0, 6)

    const offerRows = [...data.listings]
      .filter((listing) => listing.price !== null || listing.trust_score !== null)
      .sort((left, right) => {
        const trustLeft = left.trust_score ?? -1
        const trustRight = right.trust_score ?? -1
        return trustRight - trustLeft || (left.price ?? Number.MAX_SAFE_INTEGER) - (right.price ?? Number.MAX_SAFE_INTEGER)
      })
      .slice(0, 8)

    const sectorRows = [...data.categories]
      .map((category) => {
        const label = category.category ?? category.name
        const productCount = data.products.filter((product) => product.categoryId === category.id).length
        return { label, productCount }
      })
      .filter((item) => item.productCount > 0)
      .sort((left, right) => right.productCount - left.productCount)
      .slice(0, 5)

    return {
      totalProducts,
      totalListings,
      activeListings,
      totalSellers,
      averageTrustScore,
      averagePrice,
      productRows,
      sellerRows,
      offerRows,
      sectorRows,
    }
  }, [data])

  if (loading) {
    return (
      <section className="rounded-3xl border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-10 text-white shadow-2xl">
        <p className="text-sm uppercase tracking-[0.3em] text-white/60">B2B Intelligence Hub</p>
        <p className="mt-4 text-2xl font-semibold">Loading live market data...</p>
        <p className="mt-2 max-w-2xl text-sm text-white/70">
          Pulling products, listings, sellers, and category coverage into a single partner view.
        </p>
      </section>
    )
  }

  if (error || !insights) {
    return (
      <section className="rounded-3xl border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-10 text-white shadow-2xl">
        <p className="text-sm uppercase tracking-[0.3em] text-white/60">B2B Intelligence Hub</p>
        <p className="mt-4 text-2xl font-semibold">Unable to load live market data.</p>
        <p className="mt-2 max-w-2xl text-sm text-white/70">{error || "No data returned from the backend."}</p>
        <Button className="mt-6 bg-white text-slate-900 hover:bg-white/90" onClick={() => void loadData()}>
          Retry
        </Button>
      </section>
    )
  }

  const topProduct = insights.productRows[0] ?? null
  const topSeller = insights.sellerRows[0] ?? null
  const topSector = insights.sectorRows[0] ?? null

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-8 text-white shadow-2xl sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.24),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.18),transparent_32%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-white/75">
              B2B Intelligence Hub
            </div>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Live competitor signals, supplier coverage, and market spread in one place.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
                Track product breadth, pricing gaps, and trust-score patterns before you reach out to sellers or launch a new offer.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-emerald-400 text-slate-950 hover:bg-emerald-300">
                <a href="#partner-request">Request Partner Access</a>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                onClick={() => void loadData()}
              >
                Refresh Data
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-white/70">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Products: {insights.totalProducts}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Listings: {insights.totalListings}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Sellers: {insights.totalSellers}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Updated: {loadedAt ?? "just now"}</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-white/55">Average Trust</p>
              <p className="mt-2 text-3xl font-semibold">{formatNumber(insights.averageTrustScore)}</p>
              <p className="text-sm text-white/65">Across all tracked listings</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-white/55">Average Price</p>
              <p className="mt-2 text-3xl font-semibold">{formatCurrency(insights.averagePrice)}</p>
              <p className="text-sm text-white/65">Current market average</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-white/55">Active Listings</p>
              <p className="mt-2 text-3xl font-semibold">{insights.activeListings}</p>
              <p className="text-sm text-white/65">Live offers available now</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tracked Products</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{insights.totalProducts}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tracked Listings</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{insights.totalListings}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tracked Sellers</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{insights.totalSellers}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top Sector</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{topSector?.label ?? "-"}</div>
            <p className="text-sm text-muted-foreground">{topSector ? `${topSector.productCount} products` : "No category data"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Market Spread Leaders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.productRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No product coverage yet.</p>
              ) : (
                insights.productRows.map((row) => (
                  <div key={row.id} className="space-y-2 rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{row.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {row.brand || "No brand"} • {row.category}
                        </p>
                      </div>
                      <Badge variant="secondary">{row.listings} listings</Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Lowest</p>
                        <p className="font-medium">{formatCurrency(row.priceMin)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Highest</p>
                        <p className="font-medium">{formatCurrency(row.priceMax)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Spread</p>
                        <p className="font-medium">{formatNumber(row.spreadPercent, 2)}%</p>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500"
                        style={{ width: `${Math.min(100, Math.max(10, row.spreadPercent))}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supplier Benchmarks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.sellerRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No seller coverage yet.</p>
              ) : (
                insights.sellerRows.map((row) => (
                  <div key={row.id} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{row.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {row.listings} listings • {row.activeListings} active
                        </p>
                      </div>
                      <Badge>{formatNumber(row.averageTrustScore)} trust</Badge>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Average Price</p>
                        <p className="font-medium">{formatCurrency(row.averagePrice)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Trust Score</p>
                        <p className="font-medium">{formatNumber(row.averageTrustScore)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Top Trust Offers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-2xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Seller</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Trust</th>
                    <th className="px-4 py-3">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.offerRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                        No offer data yet.
                      </td>
                    </tr>
                  ) : (
                    insights.offerRows.map((listing) => (
                      <tr key={listing.id} className="border-t">
                        <td className="px-4 py-3 font-medium">{listing.productName || "-"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{listing.sellerName || "-"}</td>
                        <td className="px-4 py-3">{formatCurrency(listing.price)}</td>
                        <td className="px-4 py-3">{formatNumber(listing.trust_score)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={listing.is_active === false ? "secondary" : "default"}>
                            {listing.is_active === false ? "Inactive" : "Active"}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.sectorRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No category coverage yet.</p>
              ) : (
                insights.sectorRows.map((sector) => {
                  const max = insights.sectorRows[0]?.productCount ?? 1
                  const width = Math.max(12, (sector.productCount / max) * 100)

                  return (
                    <div key={sector.label} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{sector.label}</span>
                        <span className="text-muted-foreground">{sector.productCount} products</span>
                      </div>
                      <div className="h-3 rounded-full bg-muted">
                        <div
                          className="h-3 rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 rounded-3xl border bg-muted/30 p-6 md:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Best spread</p>
          <p className="mt-2 text-lg font-semibold">{topProduct?.name ?? "-"}</p>
          <p className="text-sm text-muted-foreground">{topProduct ? `${formatNumber(topProduct.spreadPercent, 2)}% price spread` : "No spread data available"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Top supplier</p>
          <p className="mt-2 text-lg font-semibold">{topSeller?.name ?? "-"}</p>
          <p className="text-sm text-muted-foreground">{topSeller ? `${topSeller.listings} listings tracked` : "No seller data available"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Market focus</p>
          <p className="mt-2 text-lg font-semibold">{topSector?.label ?? "-"}</p>
          <p className="text-sm text-muted-foreground">{topSector ? `${topSector.productCount} products in this segment` : "No sector data available"}</p>
        </div>
      </div>
    </section>
  )
}