import { getProductListings } from "@/services/admin/product-listings"
import { getProducts } from "@/services/admin/products"
import Link from "next/link"

import { Button } from "@/components/ui/button"

function StatCard({ title, value, note, href }: { title: string; value: number; note: string; href?: string }) {
  const content = (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{note}</p>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="transition-opacity hover:opacity-80">
        {content}
      </Link>
    )
  }

  return content
}

export default async function DataQualityPage() {
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
    <section className="w-full max-w-none space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Data Quality</h1>
        <p className="text-sm text-muted-foreground">
          Quick checks to identify missing or low-quality catalog data.
        </p>
      </div>

      {fetchError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {fetchError}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Product Issues</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Products without brand or listings with zero price.
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/admin/quality-control/product-issues">Open Product Issues</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Seller Listing Collisions</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Products with multiple listings from the same seller.
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/admin/quality-control/seller-collisions">Open Collision Manager</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Overview</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {totalProducts} products, {totalListings} listings in catalog.
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/admin/products">Manage Products</Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard
              title="Products Missing Brand"
              value={productsWithoutBrand}
              note="Fill brand values for better grouping and search."
              href="/admin/quality-control/product-issues"
            />
            <StatCard
              title="Products Missing Image"
              value={productsWithoutImage}
              note="Add product images for richer listings."
            />
            <StatCard
              title="Listings Missing Price"
              value={listingsWithoutPrice}
              note="Set listing prices to keep comparisons accurate."
            />
            <StatCard
              title="Zero Price Listings"
              value={zeroPriceListings}
              note="Listings with price=0 are hidden from B2C."
              href="/admin/quality-control/product-issues"
            />
            <StatCard
              title="Inactive Listings"
              value={inactiveListings}
              note="Review inactive listings for availability updates."
            />
          </div>
        </div>
      )}
    </section>
  )
}
