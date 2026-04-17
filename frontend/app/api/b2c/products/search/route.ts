import { NextRequest, NextResponse } from "next/server"

import { getProductListings } from "@/services/admin/product-listings"
import { getProducts } from "@/services/admin/products"

type SearchResult = {
  id: number
  name: string
  imageUrl: string | null
  bestPrice: number | null
}

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get("q") ?? ""
  const query = rawQuery.trim().toLowerCase()

  if (query.length < 2) {
    return NextResponse.json([])
  }

  const limitRaw = request.nextUrl.searchParams.get("limit") ?? "8"
  const parsedLimit = Number(limitRaw)
  const limit = Number.isInteger(parsedLimit)
    ? Math.max(1, Math.min(parsedLimit, 20))
    : 8

  try {
    const [products, listings] = await Promise.all([getProducts(), getProductListings()])

    const refsByProduct = new Map<number, string[]>()
    const bestPriceByProduct = new Map<number, number>()

    for (const listing of listings) {
      if (listing.productId === null) {
        continue
      }

      if (listing.ref) {
        const refs = refsByProduct.get(listing.productId) ?? []
        refs.push(listing.ref.toLowerCase())
        refsByProduct.set(listing.productId, refs)
      }

      if (listing.price !== null && listing.is_active !== false && listing.availability !== false) {
        const currentBest = bestPriceByProduct.get(listing.productId)
        if (currentBest === undefined || listing.price < currentBest) {
          bestPriceByProduct.set(listing.productId, listing.price)
        }
      }
    }

    const startsWithMatches: SearchResult[] = []
    const containsMatches: SearchResult[] = []

    for (const product of products) {
      const productName = product.name.toLowerCase()
      const refs = refsByProduct.get(product.id) ?? []

      const nameStartsWith = productName.startsWith(query)
      const nameIncludes = productName.includes(query)
      const refStartsWith = refs.some((ref) => ref.startsWith(query))
      const refIncludes = refs.some((ref) => ref.includes(query))

      if (!nameIncludes && !refIncludes) {
        continue
      }

      const item: SearchResult = {
        id: product.id,
        name: product.name,
        imageUrl: product.image_url,
        bestPrice: bestPriceByProduct.get(product.id) ?? null,
      }

      if (nameStartsWith || refStartsWith) {
        startsWithMatches.push(item)
      } else {
        containsMatches.push(item)
      }
    }

    const collator = new Intl.Collator("en", { sensitivity: "base" })
    startsWithMatches.sort((a, b) => collator.compare(a.name, b.name))
    containsMatches.sort((a, b) => collator.compare(a.name, b.name))

    return NextResponse.json([...startsWithMatches, ...containsMatches].slice(0, limit))
  } catch {
    return NextResponse.json({ message: "Failed to fetch search results." }, { status: 500 })
  }
}
