import React, { Suspense } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getCategoriesWithParents } from "@/services/categories"
import { getProductListings } from "@/services/product-listings"
import { getProducts } from "@/services/products"
import type { ProductListing } from "@/utils/types"

type ExportCard = {
  key: "products" | "product-listings" | "categories" | "sellers"
  title: string
  description: string
  recordCount: number
}

function buildSellerCount(listings: ProductListing[]): number {
  const sellerIds = new Set<number>()

  for (const listing of listings) {
    if (listing.sellerId !== null) {
      sellerIds.add(listing.sellerId)
    }
  }

  return sellerIds.size
}

function formatCount(value: number): string {
  return `${value.toLocaleString()} records`
}

async function loadExportCards(): Promise<ExportCard[]> {
  const [products, listings, categories] = await Promise.all([
    getProducts(),
    getProductListings(),
    getCategoriesWithParents(),
  ])

  return [
    {
      key: "products",
      title: "Products",
      description: "All products with category info",
      recordCount: products.length,
    },
    {
      key: "product-listings",
      title: "Product Listings",
      description: "All listings with product and seller info",
      recordCount: listings.length,
    },
    {
      key: "categories",
      title: "Categories",
      description: "All categories with parent info",
      recordCount: categories.length,
    },
    {
      key: "sellers",
      title: "Sellers",
      description: "All sellers with listing counts",
      recordCount: buildSellerCount(listings),
    },
  ]
}

async function ExportDataPageContent() {
  let cards: ExportCard[] = []
  let fetchError: string | null = null

  try {
    cards = await loadExportCards()
  } catch (error) {
    fetchError = error instanceof Error ? error.message : "Unable to load export datasets."
  }

  return (
    <>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Export Data</h1>
        <p className="text-sm text-muted-foreground">
          Download datasets as CSV or JSON.
        </p>
      </div>

      {fetchError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {fetchError}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((item) => (
            <div key={item.key} className="rounded-xl border bg-card px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">{item.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  {formatCount(item.recordCount)}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm" className="font-semibold">
                  <a href={`/api/admin/export/${item.key}?format=csv`}>CSV</a>
                </Button>
                <Button asChild variant="outline" size="sm" className="font-semibold">
                  <a href={`/api/admin/export/${item.key}?format=json`}>JSON</a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function ExportDataFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-4 w-64" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    </div>
  )
}

export default async function ExportDataPage() {
  return (
    <section className="w-full max-w-none space-y-4">
      <Suspense fallback={<ExportDataFallback />}>
        <ExportDataPageContent />
      </Suspense>
    </section>
  )
}
