import React, { Suspense } from "react"
import Link from "next/link"

import { RefreshButton } from "@/components/admin/refresh-button"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getProductListings } from "@/services/product-listings"
import { getProducts } from "@/services/products"

type MetricCardProps = {
  title: string
  value: number
  total: number
  note: string
  href?: string
  color?: "rose" | "amber" | "orange" | "slate" | "emerald" | "purple"
}

function MetricCard({ title, value, total, note, href, color = "slate" }: MetricCardProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  const colorClasses: Record<string, string> = {
    rose: "bg-rose-50 border-rose-200 text-rose-800",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    orange: "bg-orange-50 border-orange-200 text-orange-800",
    slate: "bg-slate-50 border-slate-200 text-slate-800",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
    purple: "bg-purple-50 border-purple-200 text-purple-800",
  }
  const barColor: Record<string, string> = {
    rose: "bg-rose-500",
    amber: "bg-amber-500",
    orange: "bg-orange-500",
    slate: "bg-slate-500",
    emerald: "bg-emerald-500",
    purple: "bg-purple-500",
  }

  const content = (
    <div className="rounded-lg border bg-card p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>
        </div>
        <div className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${colorClasses[color]}`}>
          {pct}%
        </div>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${barColor[color]}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )

  if (href) {
    return <Link href={href} className="block">{content}</Link>
  }

  return content
}

async function DataQualityPageContent() {
  let fetchError: string | null = null

  let productsWithoutBrand = 0
  let productsWithoutImage = 0
  let listingsWithoutPrice = 0
  let zeroPriceListings = 0
  let inactiveListings = 0
  let totalProducts = 0
  let totalListings = 0

  try {
    const [products, listings] = await Promise.all([getProducts(), getProductListings()])

    totalProducts = products.length
    totalListings = listings.length
    productsWithoutBrand = products.filter((p) => !p.brand || p.brand.trim() === "").length
    productsWithoutImage = products.filter((p) => !p.image_url || p.image_url.trim() === "").length
    listingsWithoutPrice = listings.filter((l) => l.price === null).length
    zeroPriceListings = listings.filter((l) => l.price !== null && l.price === 0).length
    inactiveListings = listings.filter((l) => l.is_active === false).length
  } catch (error) {
    fetchError = error instanceof Error ? error.message : "Unable to load data quality metrics"
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Data Quality</h1>
          <p className="text-sm text-muted-foreground">
            Catalog health overview and quality improvement tools.
          </p>
        </div>
        <RefreshButton />
      </div>

      {fetchError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {fetchError}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Products</p>
              <p className="mt-1 text-3xl font-bold">{totalProducts}</p>
              <p className="mt-1 text-sm text-muted-foreground">{totalListings} listings across catalog</p>
            </div>

            <MetricCard
              title="Missing Brand"
              value={productsWithoutBrand}
              total={totalProducts}
              note="Products without a brand value"
              href="/admin/quality-control/product-issues"
              color="rose"
            />

            <MetricCard
              title="Missing Image"
              value={productsWithoutImage}
              total={totalProducts}
              note="Products without a product image"
              color="orange"
            />

            <MetricCard
              title="Zero Price Listings"
              value={zeroPriceListings}
              total={totalListings}
              note="Listings with price = 0 (hidden on B2C)"
              href="/admin/quality-control/product-issues"
              color="amber"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <MetricCard
              title="Listings Missing Price"
              value={listingsWithoutPrice}
              total={totalListings}
              note="Listings with null price (not comparable)"
              color="purple"
            />

            <MetricCard
              title="Inactive Listings"
              value={inactiveListings}
              total={totalListings}
              note="Listings marked inactive (not visible)"
              color="slate"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-card p-4 transition-shadow hover:shadow-md">
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-sm font-semibold">Product Issues</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Fix missing brands, missing images, zero-price listings, inactive listings, and products without listings.
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="self-start">
                  <Link href="/admin/quality-control/product-issues">Open Product Issues</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4 transition-shadow hover:shadow-md">
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-sm font-semibold">Seller Listing Collisions</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Find and resolve products with multiple listings from the same seller.
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="self-start">
                  <Link href="/admin/quality-control/seller-collisions">Open Collision Manager</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4 transition-shadow hover:shadow-md">
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-sm font-semibold">Products Overview</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Browse and manage all products, listings, categories, and bulk operations.
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="self-start">
                  <Link href="/admin/products">Manage Products</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function DataQualityFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-4 w-72" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    </div>
  )
}

export default async function DataQualityPage() {
  return (
    <section className="w-full max-w-none space-y-4">
      <Suspense fallback={<DataQualityFallback />}>
        <DataQualityPageContent />
      </Suspense>
    </section>
  )
}
