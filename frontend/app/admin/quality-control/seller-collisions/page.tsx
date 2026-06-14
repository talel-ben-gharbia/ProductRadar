import React, { Suspense } from "react"
import Link from "next/link"

import SellerCollisionQualityPanel from "@/components/admin/seller-collision-quality-panel"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getProductListings } from "@/services/product-listings"
import { getProducts } from "@/services/products"

type CollisionListing = {
  id: number
  ref: string | null
  price: number | null
  isActive: boolean | null
  productUrl: string | null
}

type SellerCollisionIncident = {
  key: string
  productId: number
  productName: string
  sellerId: number
  sellerName: string
  listingCount: number
  uniqueRefCount: number
  listings: CollisionListing[]
  suggestedTargetProductId: number | null
  suggestedTargetProductName: string | null
}

function normalizeRef(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ")
}

function buildSuggestedTargetProduct(
  sellerId: number,
  sourceProductId: number,
  refs: string[],
  listingsBySellerAndRef: Map<string, Map<number, number>>,
): number | null {
  const scoreByProductId = new Map<number, number>()

  for (const ref of refs) {
    if (!ref) {
      continue
    }

    const key = `${sellerId}|${ref}`
    const countsByProduct = listingsBySellerAndRef.get(key)
    if (!countsByProduct) {
      continue
    }

    for (const [productId, count] of countsByProduct.entries()) {
      if (productId === sourceProductId) {
        continue
      }

      scoreByProductId.set(productId, (scoreByProductId.get(productId) ?? 0) + count)
    }
  }

  if (scoreByProductId.size === 0) {
    return null
  }

  let bestProductId: number | null = null
  let bestScore = 0

  for (const [productId, score] of scoreByProductId.entries()) {
    if (score > bestScore) {
      bestProductId = productId
      bestScore = score
    }
  }

  return bestProductId
}

async function buildIncidents(): Promise<{
  incidents: SellerCollisionIncident[]
  fetchError: string | null
  productsCount: number
  incidentCount: number
  impactedProductCount: number
}> {
  try {
    const [products, listings] = await Promise.all([getProducts(), getProductListings()])

    const productNameById = new Map<number, string>(
      products.map((product) => [product.id, product.name]),
    )

    const byProductAndSeller = new Map<string, typeof listings>()
    const listingsBySellerAndRef = new Map<string, Map<number, number>>()

    for (const listing of listings) {
      if (listing.productId === null || listing.sellerId === null) {
        continue
      }

      const productSellerKey = `${listing.productId}|${listing.sellerId}`
      const current = byProductAndSeller.get(productSellerKey) ?? []
      current.push(listing)
      byProductAndSeller.set(productSellerKey, current)

      const normalizedRef = normalizeRef(listing.ref)
      if (!normalizedRef) {
        continue
      }

      const sellerRefKey = `${listing.sellerId}|${normalizedRef}`
      const productCounts = listingsBySellerAndRef.get(sellerRefKey) ?? new Map<number, number>()
      productCounts.set(listing.productId, (productCounts.get(listing.productId) ?? 0) + 1)
      listingsBySellerAndRef.set(sellerRefKey, productCounts)
    }

    const incidents: SellerCollisionIncident[] = []
    const impactedProducts = new Set<number>()

    for (const [key, groupedListings] of byProductAndSeller.entries()) {
      if (groupedListings.length <= 1) {
        continue
      }

      const [rawProductId, rawSellerId] = key.split("|")
      const productId = Number(rawProductId)
      const sellerId = Number(rawSellerId)

      if (!Number.isInteger(productId) || !Number.isInteger(sellerId)) {
        continue
      }

      const refs = groupedListings.map((listing) => normalizeRef(listing.ref)).filter((value) => value !== "")
      const uniqueRefCount = new Set(refs).size

      const suggestedTargetProductId = buildSuggestedTargetProduct(
        sellerId,
        productId,
        refs,
        listingsBySellerAndRef,
      )

      incidents.push({
        key: `${productId}|${sellerId}`,
        productId,
        productName: productNameById.get(productId) ?? groupedListings[0]?.productName ?? `Product #${productId}`,
        sellerId,
        sellerName: groupedListings[0]?.sellerName ?? `Seller #${sellerId}`,
        listingCount: groupedListings.length,
        uniqueRefCount,
        listings: groupedListings
          .map((listing) => ({
            id: listing.id,
            ref: listing.ref,
            price: listing.price,
            isActive: listing.is_active,
            productUrl: listing.product_url ?? null,
          }))
          .sort((a, b) => b.id - a.id),
        suggestedTargetProductId,
        suggestedTargetProductName:
          suggestedTargetProductId !== null
            ? (productNameById.get(suggestedTargetProductId) ?? `Product #${suggestedTargetProductId}`)
            : null,
      })

      impactedProducts.add(productId)
    }

    incidents.sort((a, b) => {
      if (b.listingCount !== a.listingCount) {
        return b.listingCount - a.listingCount
      }

      return a.productName.localeCompare(b.productName)
    })

    return {
      incidents,
      fetchError: null,
      productsCount: products.length,
      incidentCount: incidents.length,
      impactedProductCount: impactedProducts.size,
    }
  } catch (error) {
    return {
      incidents: [],
      fetchError: error instanceof Error ? error.message : "Unable to load seller collision data.",
      productsCount: 0,
      incidentCount: 0,
      impactedProductCount: 0,
    }
  }
}

async function SellerCollisionsPageContent() {
  const { incidents, fetchError, productsCount, incidentCount, impactedProductCount } = await buildIncidents()

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Seller Listing Collisions</h1>
          <p className="text-sm text-muted-foreground">
            Detect products where listing count is greater than unique seller count. A product should have only one listing per seller.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/admin/quality-control/seller-collisions">Refresh</Link>
        </Button>
      </div>

      {fetchError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {fetchError}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Scanned Products</p>
              <p className="mt-2 text-3xl font-bold">{productsCount}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Collision Incidents</p>
              <p className="mt-2 text-3xl font-bold">{incidentCount}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Impacted Products</p>
              <p className="mt-2 text-3xl font-bold">{impactedProductCount}</p>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm font-semibold">Recommended Workflow</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Review each product + seller collision group.</li>
              <li>Classify as keep, move to suggested product, split, or manual review.</li>
              <li>Use linked tools to execute cleanup safely in Product Listings or Duplicate Finder.</li>
            </ul>
          </div>

          <SellerCollisionQualityPanel incidents={incidents} />
        </>
      )}
    </>
  )
}

function SellerCollisionsFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-4 w-full" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  )
}

export default async function SellerCollisionsQualityPage() {
  return (
    <section className="w-full max-w-none space-y-4">
      <Suspense fallback={<SellerCollisionsFallback />}>
        <SellerCollisionsPageContent />
      </Suspense>
    </section>
  )
}
