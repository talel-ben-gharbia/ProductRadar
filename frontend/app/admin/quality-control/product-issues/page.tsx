import Link from "next/link"

import ProductIssuesPanel from "@/components/admin/product-issues-panel"
import { Button } from "@/components/ui/button"
import { getProductListings } from "@/services/admin/product-listings"
import { getProducts } from "@/services/admin/products"

type NoBrandItem = {
  productId: number
  name: string
  brand: string | null
  description: string
  imageUrl: string | null
}

type ZeroPriceItem = {
  listingId: number
  productId: number
  productName: string
  productBrand: string | null
  productImageUrl: string | null
  price: number | null
  ref: string | null
  sellerName: string | null
  isActive: boolean | null
}

type InactiveItem = {
  listingId: number
  productId: number
  productName: string
  price: number | null
  ref: string | null
  sellerName: string | null
  isActive: boolean | null
}

function buildData(): Promise<{
  noBrandProducts: NoBrandItem[]
  zeroPriceListings: ZeroPriceItem[]
  inactiveListings: InactiveItem[]
  totalProducts: number
  totalListings: number
  fetchError: string | null
}> {
  return Promise.all([getProducts(), getProductListings()])
    .then(([products, listings]) => {
      const noBrandProducts: NoBrandItem[] = products
        .filter((p) => !p.brand || p.brand.trim() === "")
        .map((p) => ({
          productId: p.id,
          name: p.name,
          brand: p.brand,
          description: p.description,
          imageUrl: p.image_url,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))

      const zeroPriceListings: ZeroPriceItem[] = listings
        .filter((l) => l.productId !== null && l.price !== null && l.price === 0)
        .map((l) => ({
          listingId: l.id,
          productId: l.productId!,
          productName: l.productName ?? `Product #${l.productId}`,
          productBrand: null,
          productImageUrl: null,
          price: l.price,
          ref: l.ref,
          sellerName: l.sellerName,
          isActive: l.is_active,
        }))
        .sort((a, b) => a.productName.localeCompare(b.productName))

      const inactiveListings: InactiveItem[] = listings
        .filter((l) => l.is_active === false)
        .map((l) => ({
          listingId: l.id,
          productId: l.productId ?? 0,
          productName: l.productName ?? (l.productId ? `Product #${l.productId}` : "Unknown"),
          price: l.price,
          ref: l.ref,
          sellerName: l.sellerName,
          isActive: l.is_active,
        }))
        .sort((a, b) => a.productName.localeCompare(b.productName))

      return {
        noBrandProducts,
        zeroPriceListings,
        inactiveListings,
        totalProducts: products.length,
        totalListings: listings.length,
        fetchError: null,
      }
    })
    .catch((error) => ({
      noBrandProducts: [],
      zeroPriceListings: [],
      inactiveListings: [],
      totalProducts: 0,
      totalListings: 0,
      fetchError: error instanceof Error ? error.message : "Unable to load product issues.",
    }))
}

export default async function ProductIssuesQualityPage() {
  const { noBrandProducts, zeroPriceListings, inactiveListings, totalProducts, totalListings, fetchError } = await buildData()

  return (
    <section className="w-full max-w-none space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Product Issues</h1>
          <p className="text-sm text-muted-foreground">
            Products missing brand information or listings with zero price that need cleanup.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/quality-control/product-issues">Refresh</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/quality-control">Back to Data Quality</Link>
          </Button>
        </div>
      </div>

      {fetchError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {fetchError}
        </div>
      ) : (
        <>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm font-semibold">Cleanup Workflow</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Open a section and review the products or listings with quality issues.</li>
              <li>For missing brand: use the dialog to view full product info and set the brand.</li>
              <li>For zero price: deactivate or delete listings with price = 0.</li>
              <li>For inactive listings: activate them to make them visible on B2C, or delete if no longer needed.</li>
            </ul>
          </div>

          <ProductIssuesPanel
            noBrandProducts={noBrandProducts}
            zeroPriceListings={zeroPriceListings}
            inactiveListings={inactiveListings}
          />

          {noBrandProducts.length === 0 && zeroPriceListings.length === 0 && inactiveListings.length === 0 ? (
            <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
              No product issues found. Every product has a brand and all listings have valid prices and are active.
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
