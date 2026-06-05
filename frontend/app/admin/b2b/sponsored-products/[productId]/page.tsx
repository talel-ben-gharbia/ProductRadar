"use client"

import { useCallback, useEffect, useState } from "react"
import { ArrowLeft, Loader2, Package, Star } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type ListingItem = {
  id: number
  ref: string | null
  price: number | null
  old_price: number | null
  availability: boolean | null
  is_active: boolean | null
  trust_score: number | null
  sellerId: number | null
  sellerName: string | null
  productId: number | null
  productName: string | null
  productBrand: string | null
  created_at: string | null
}

type SponsoredState = {
  listingIds: Set<number>
  statusByListing: Map<number, string>
}

export default function SponsoredProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>
}) {
  const [productId, setProductId] = useState<string>("")
  const [listings, setListings] = useState<ListingItem[]>([])
  const [sponsored, setSponsored] = useState<SponsoredState>({
    listingIds: new Set(),
    statusByListing: new Map(),
  })
  const [productName, setProductName] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    params.then((p) => setProductId(p.productId))
  }, [params])

  const fetchData = useCallback(async () => {
    if (!productId) return
    setLoading(true)

    try {
      const [listingsRes, sponsoredRes] = await Promise.all([
        fetch(`/api/product-listings?productId=${productId}`),
        fetch(`/api/b2b/admin/sponsored`),
      ])

      const listingsData = await listingsRes.json().catch(() => [])
      const sponsoredData = await sponsoredRes.json().catch(() => ({ items: [] }))

      const allListings: ListingItem[] = Array.isArray(listingsData) ? listingsData : []
      setListings(allListings)

      if (allListings.length > 0 && allListings[0].productName) {
        setProductName(allListings[0].productName)
      } else {
        setProductName(`Product #${productId}`)
      }

      const sponsoredIds = new Set<number>()
      const statusMap = new Map<number, string>()
      for (const item of sponsoredData.items ?? []) {
        if (String(item.product_id) === productId) {
          sponsoredIds.add(item.listing_id)
          statusMap.set(item.listing_id, item.status)
        }
      }
      setSponsored({ listingIds: sponsoredIds, statusByListing: statusMap })
    } catch {
      // ignore
    }
    setLoading(false)
  }, [productId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/b2b/sponsored-products"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Sponsored Products
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {productName || `Product #${productId}`}
        </h1>
        <p className="text-sm text-muted-foreground">
          All marketplace listings for this product. Sponsored listings are highlighted with a badge.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Listings</p>
            <p className="text-2xl font-bold mt-1">{listings.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Active Listings</p>
            <p className="text-2xl font-bold mt-1">
              {listings.filter((l) => l.is_active !== false).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Sponsored</p>
            <p className="text-2xl font-bold mt-1 text-primary">
              {sponsored.listingIds.size}
            </p>
          </CardContent>
        </Card>
      </div>

      {listings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="size-10 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No listings found for this product.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Seller</th>
                    <th className="px-4 py-3 font-medium">Ref</th>
                    <th className="px-4 py-3 font-medium">Price</th>
                    <th className="px-4 py-3 font-medium">Old Price</th>
                    <th className="px-4 py-3 font-medium">Trust Score</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Sponsored</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {listings.map((listing) => {
                    const isSponsored = sponsored.listingIds.has(listing.id)
                    const sponsorStatus = sponsored.statusByListing.get(listing.id)
                    return (
                      <tr
                        key={listing.id}
                        className={`transition-colors ${
                          isSponsored
                            ? "bg-primary/5 hover:bg-primary/10"
                            : "hover:bg-muted/20"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium">{listing.sellerName ?? `Seller #${listing.sellerId}`}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {listing.ref ?? "-"}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {listing.price !== null ? `${listing.price.toFixed(2)} DT` : "-"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {listing.old_price !== null ? (
                            <span className="line-through">{listing.old_price.toFixed(2)} DT</span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {listing.trust_score !== null ? (
                            <span className={`font-medium ${
                              listing.trust_score >= 80
                                ? "text-emerald-600"
                                : listing.trust_score >= 50
                                  ? "text-amber-600"
                                  : "text-red-600"
                            }`}>
                              {listing.trust_score.toFixed(0)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            {listing.is_active !== false ? (
                              <Badge className="text-[10px] bg-emerald-100 text-emerald-700">Active</Badge>
                            ) : (
                              <Badge className="text-[10px] bg-gray-100 text-gray-600">Inactive</Badge>
                            )}
                            {listing.availability === false && (
                              <Badge className="text-[10px] bg-red-100 text-red-700">OOS</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isSponsored ? (
                            <Badge className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-200">
                              <Star className="size-3 fill-amber-500 text-amber-500" />
                              Sponsored
                              {sponsorStatus && (
                                <span className="text-[10px] opacity-70">({sponsorStatus})</span>
                              )}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
