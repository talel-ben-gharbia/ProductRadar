import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getProductListings } from "@/services/admin/product-listings"
import type { ProductListing } from "@/utils/types"

type SellerSummary = {
  sellerId: number
  sellerName: string
  listingsCount: number
  productsCount: number
  activeListingsCount: number
}

function buildSellerSummaries(productListings: ProductListing[]): SellerSummary[] {
  const sellers = new Map<number, SellerSummary & { productIds: Set<number> }>()

  for (const listing of productListings) {
    if (listing.sellerId === null) {
      continue
    }

    const existing = sellers.get(listing.sellerId)

    if (existing) {
      existing.listingsCount += 1
      if (listing.productId !== null) {
        existing.productIds.add(listing.productId)
      }
      if (listing.is_active) {
        existing.activeListingsCount += 1
      }
      continue
    }

    sellers.set(listing.sellerId, {
      sellerId: listing.sellerId,
      sellerName: listing.sellerName ?? `Seller #${listing.sellerId}`,
      listingsCount: 1,
      productsCount: 0,
      activeListingsCount: listing.is_active ? 1 : 0,
      productIds: new Set(listing.productId !== null ? [listing.productId] : []),
    })
  }

  return Array.from(sellers.values())
    .map((seller) => ({
      sellerId: seller.sellerId,
      sellerName: seller.sellerName,
      listingsCount: seller.listingsCount,
      productsCount: seller.productIds.size,
      activeListingsCount: seller.activeListingsCount,
    }))
    .sort((a, b) => a.sellerName.localeCompare(b.sellerName))
}

export default async function SellersPage() {
  let sellers: SellerSummary[] = []
  let fetchError: string | null = null

  try {
    const productListings = await getProductListings()
    sellers = buildSellerSummaries(productListings)
  } catch (error) {
    fetchError =
      error instanceof Error
        ? error.message
        : "Unable to load sellers from backend"
  }

  return (
    <section className="w-full max-w-none space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Sellers</h1>
        <p className="text-sm text-muted-foreground">
          Browse sellers and jump directly to their product listings.
        </p>
      </div>

      <div className="w-full rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Seller</TableHead>
              <TableHead>Listings</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Active Listings</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fetchError ? (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-destructive">
                  {fetchError}
                </TableCell>
              </TableRow>
            ) : sellers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                  No sellers found
                </TableCell>
              </TableRow>
            ) : (
              sellers.map((seller) => (
                <TableRow key={seller.sellerId}>
                  <TableCell>{seller.sellerId}</TableCell>
                  <TableCell className="font-medium">{seller.sellerName}</TableCell>
                  <TableCell>{seller.listingsCount}</TableCell>
                  <TableCell>{seller.productsCount}</TableCell>
                  <TableCell>{seller.activeListingsCount}</TableCell>
                  <TableCell>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/product-listings?sellerId=${seller.sellerId}`}>
                        View listings
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
