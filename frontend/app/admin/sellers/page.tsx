import React, { Suspense } from "react"

import SellersManagementTable from "@/components/admin/sellers-management-table"
import { Skeleton } from "@/components/ui/skeleton"
import { getProductListings } from "@/services/product-listings"
import { getSellers } from "@/services/sellers"
import type { ProductListing } from "@/utils/types"

type SellerSummary = {
  id: number
  name: string
  url: string | null
  listingsCount: number
  productsCount: number
  activeListingsCount: number
}

function buildSellerSummaries(sellers: Awaited<ReturnType<typeof getSellers>>, productListings: ProductListing[]): SellerSummary[] {
  const summaryBySellerId = new Map<number, SellerSummary & { productIds: Set<number> }>()

  for (const seller of sellers) {
    summaryBySellerId.set(seller.id, {
      id: seller.id,
      name: seller.name,
      url: seller.url,
      listingsCount: 0,
      productsCount: 0,
      activeListingsCount: 0,
      productIds: new Set<number>(),
    })
  }

  for (const listing of productListings) {
    if (listing.sellerId === null) {
      continue
    }

    const existing = summaryBySellerId.get(listing.sellerId) ?? {
      id: listing.sellerId,
      name: listing.sellerName ?? `Seller #${listing.sellerId}`,
      url: null,
      listingsCount: 0,
      productsCount: 0,
      activeListingsCount: 0,
      productIds: new Set<number>(),
    }

    existing.listingsCount += 1
    if (listing.productId !== null) {
      existing.productIds.add(listing.productId)
    }
    if (listing.is_active) {
      existing.activeListingsCount += 1
    }

    summaryBySellerId.set(listing.sellerId, existing)
  }

  return Array.from(summaryBySellerId.values())
    .map((seller) => ({
      id: seller.id,
      name: seller.name,
      url: seller.url,
      listingsCount: seller.listingsCount,
      productsCount: seller.productIds.size,
      activeListingsCount: seller.activeListingsCount,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

async function SellersPageContent() {
  let sellers: SellerSummary[] = []
  let fetchError: string | null = null

  try {
    const [allSellers, productListings] = await Promise.all([getSellers(), getProductListings()])
    sellers = buildSellerSummaries(allSellers, productListings)
  } catch (error) {
    fetchError = error instanceof Error ? error.message : "Unable to load sellers from backend"
  }

  return (
    <>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Sellers</h1>
        <p className="text-sm text-muted-foreground">
          Manage seller records and jump directly to their product listings.
        </p>
      </div>

      {fetchError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {fetchError}
        </div>
      ) : null}

      <SellersManagementTable initialSellers={sellers} />
    </>
  )
}

function SellersFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-4 w-64" />
      <div className="rounded-lg border bg-card p-4">
        <Skeleton className="h-10 w-full" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </div>
  )
}

export default async function SellersPage() {
  return (
    <section className="w-full max-w-none space-y-4">
      <Suspense fallback={<SellersFallback />}>
        <SellersPageContent />
      </Suspense>
    </section>
  )
}
