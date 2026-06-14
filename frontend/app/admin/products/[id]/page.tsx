/* eslint-disable @next/next/no-img-element */

import React, { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import ProductPriceHistoryChart from "@/components/admin/product-price-history-chart"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getCategoriesWithParents } from "@/services/categories"
import { getPriceHistory } from "@/services/price-history"
import { getProductListings } from "@/services/product-listings"
import { getProducts } from "@/services/products"
import type {
  CategoryWithParent,
  PriceHistoryEntry,
  Product,
  ProductListing,
} from "@/utils/types"

type ProductInfoPageProps = {
  params: Promise<{
    id: string
  }>
}

function toMoney(value: number | null): string {
  if (value === null) {
    return "-"
  }

  return (
    value.toLocaleString("fr-TN", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }) + " DT"
  )
}

function toDate(value: string | null): string {
  if (!value) {
    return "-"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return date.toLocaleString()
}

function getBestPrice(listings: ProductListing[]): number | null {
  let bestPrice: number | null = null

  for (const listing of listings) {
    if (listing.price === null) {
      continue
    }

    if (bestPrice === null || listing.price < bestPrice) {
      bestPrice = listing.price
    }
  }

  return bestPrice
}

function getCategoryPath(product: Product, categories: CategoryWithParent[]): string {
  if (product.categoryId === null) {
    return "-"
  }

  const hierarchy = categories.find((category) => category.id === product.categoryId)
  if (!hierarchy) {
    return "-"
  }

  return [hierarchy.category, hierarchy.subCategory, hierarchy.childCategory]
    .filter(Boolean)
    .join(" > ")
}

async function ProductInfoPageContent({ productId }: { productId: number }) {
  let product: Product | null = null
  let listings: ProductListing[] = []
  let priceHistory: PriceHistoryEntry[] = []
  let categories: CategoryWithParent[] = []
  let fetchError: string | null = null

  try {
    const [allProducts, productListings, allPriceHistory, allCategories] = await Promise.all([
      getProducts(),
      getProductListings(productId),
      getPriceHistory(productId).catch(() => [] as PriceHistoryEntry[]),
      getCategoriesWithParents(),
    ])

    product = allProducts.find((item) => item.id === productId) ?? null
    listings = productListings
    priceHistory = allPriceHistory
    categories = allCategories
  } catch (error) {
    fetchError =
      error instanceof Error
        ? error.message
        : "Unable to load product information from backend"
  }

  if (!fetchError && !product) {
    notFound()
  }

  const bestPrice = getBestPrice(listings)
  const sellerNamesById = listings.reduce<Record<number, string>>((acc, listing) => {
    if (listing.sellerId !== null && listing.sellerName?.trim()) {
      acc[listing.sellerId] = listing.sellerName
    }

    return acc
  }, {})

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Product Information</h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/products">Back to products</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/admin/product-listings?productId=${productId}`}>Open product listings</Link>
          </Button>
        </div>
      </div>

      {fetchError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {fetchError}
        </div>
      ) : product ? (
        <>
          <div className="rounded-lg border bg-card p-4 sm:p-5">
            <div className="grid gap-6 lg:grid-cols-[minmax(340px,46%)_1fr] lg:items-start">
              <div className="rounded-lg border bg-muted/30 p-4">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="h-72 w-full rounded-md object-contain"
                  />
                ) : (
                  <div className="flex h-72 items-center justify-center rounded-md border bg-background text-sm text-muted-foreground">
                    No image
                  </div>
                )}
              </div>

              <div className="space-y-5">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Product Name</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-semibold leading-tight">{product.name}</h2>
                    <Badge variant="outline">#{product.id}</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Brand</p>
                  <p className="text-base font-medium">{product.brand ?? "-"}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Description</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {product.description || "No description"}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md border bg-background p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Category</p>
                    <p className="mt-1 font-medium">{getCategoryPath(product, categories)}</p>
                  </div>
                  <div className="rounded-md border bg-background p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Best Price</p>
                    <p className="mt-1 font-medium">{toMoney(bestPrice)}</p>
                  </div>
                  <div className="rounded-md border bg-background p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Listings</p>
                    <p className="mt-1 font-medium">{listings.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">Product Listings</h3>
              <p className="text-sm text-muted-foreground">{listings.length} listing(s)</p>
            </div>

            <div className="w-full overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Old Price</TableHead>
                    <TableHead>Availability</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated At</TableHead>
                    <TableHead className="w-28">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                        No listings for this product.
                      </TableCell>
                    </TableRow>
                  ) : (
                    listings.map((listing) => (
                      <TableRow key={listing.id}>
                        <TableCell>{listing.id}</TableCell>
                        <TableCell>{listing.sellerName ?? "-"}</TableCell>
                        <TableCell>{toMoney(listing.price)}</TableCell>
                        <TableCell>{toMoney(listing.old_price)}</TableCell>
                        <TableCell>
                          {listing.availability === null ? (
                            <Badge variant="outline">Unknown</Badge>
                          ) : listing.availability ? (
                            <Badge variant="secondary">Available</Badge>
                          ) : (
                            <Badge variant="destructive">Unavailable</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {listing.is_active === null ? (
                            <Badge variant="outline">Unknown</Badge>
                          ) : listing.is_active ? (
                            <Badge variant="secondary">Active</Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>{toDate(listing.updated_at)}</TableCell>
                        <TableCell>
                          <Button asChild variant="outline" size="sm">
                            <a href={listing.product_url} target="_blank" rel="noreferrer">
                              Open
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <ProductPriceHistoryChart
            history={priceHistory}
            sellerNamesById={sellerNamesById}
          />
        </>
      ) : null}
    </>
  )
}

function ProductInfoFallback() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-8 w-56" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-44 rounded-md" />
        </div>
      </div>
      <div className="rounded-lg border bg-card p-4 sm:p-5">
        <div className="grid gap-6 lg:grid-cols-[minmax(340px,46%)_1fr] lg:items-start">
          <Skeleton className="h-72 w-full rounded-lg" />
          <div className="space-y-5">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-20 w-full" />
            <div className="grid gap-3 sm:grid-cols-3">
              <Skeleton className="h-20 rounded-md" />
              <Skeleton className="h-20 rounded-md" />
              <Skeleton className="h-20 rounded-md" />
            </div>
          </div>
        </div>
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-80 w-full rounded-lg" />
    </div>
  )
}

export default async function ProductInfoPage({ params }: ProductInfoPageProps) {
  const resolvedParams = await params
  const parsedId = Number(resolvedParams.id)

  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    notFound()
  }

  return (
    <section className="w-full max-w-none space-y-4">
      <Suspense fallback={<ProductInfoFallback />}>
        <ProductInfoPageContent productId={parsedId} />
      </Suspense>
    </section>
  )
}
