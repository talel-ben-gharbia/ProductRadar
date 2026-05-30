"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

import { ProductCard } from "@/components/B2C/product-card"
import { PriceRangeFilter } from "@/components/B2C/price-range-filter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"

import type { Product, ProductListing, B2CFavorite } from "@/utils/types"

const dataCache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL = 300_000
const LS_TTL = 600_000

async function cachedFetch(url: string): Promise<any> {
  const cached = dataCache.get(url)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data
  }
  try {
    const res = await fetch(url)
    const data = await res.json()
    dataCache.set(url, { data, ts: Date.now() })
    return data
  } catch {
    return []
  }
}

function lsCacheKey(ids: number[], term: string) {
  return `b2c_prod_${ids.join("_")}_${term || "_"}`
}

function readLs<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (Date.now() - entry.ts > LS_TTL) return null
    return entry.data as T
  } catch { return null }
}

function writeLs(key: string, data: unknown) {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })) } catch {}
}

type B2CProductListingProps = {
  categoryIds?: number[]
  searchTerm?: string
}

type ProductWithBestPrice = {
  product: Product
  bestPrice?: number
  bestListingId?: number
  bestTrustScore?: number | null
  offersCount: number
  discountPercent: number
}

type PageToken = number | "ellipsis"

function formatPrice(value?: number) {
  if (value === undefined) return "No available price"
  return `${value.toFixed(2)} DT`
}

function buildPaginationTokens(currentPage: number, totalPages: number): PageToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const tokens: PageToken[] = [1]
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  if (start > 2) tokens.push("ellipsis")
  for (let page = start; page <= end; page += 1) tokens.push(page)
  if (end < totalPages - 1) tokens.push("ellipsis")
  tokens.push(totalPages)
  return tokens
}

export default function B2CProductListing({ categoryIds = [], searchTerm = "" }: B2CProductListingProps) {
  const [allProducts, setAllProducts] = useState<ProductWithBestPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [favoritedIds, setFavoritedIds] = useState<Set<number>>(new Set())

  const cacheLoadedRef = useRef(false)

  useLayoutEffect(() => {
    const cached = readLs<ProductWithBestPrice[]>(lsCacheKey(categoryIds, searchTerm))
    if (cached) {
      cacheLoadedRef.current = true
      setAllProducts(cached)
      setLoading(false)
    }
    const favIds = readLs<number[]>(`${lsCacheKey(categoryIds, searchTerm)}_favs`)
    if (favIds) {
      setFavoritedIds(new Set(favIds))
    }
  }, [categoryIds.join(","), searchTerm])

  const [selectedSort, setSelectedSort] = useState("price-asc")
  const [selectedBrand, setSelectedBrand] = useState("")
  const [pricedOnly, setPricedOnly] = useState(false)
  const [minPrice, setMinPrice] = useState<number | undefined>()
  const [maxPrice, setMaxPrice] = useState<number | undefined>()
  const [page, setPage] = useState(1)
  const pageSize = 24

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!cacheLoadedRef.current) setLoading(true)
      cacheLoadedRef.current = false
      try {
        const params = new URLSearchParams()
        if (categoryIds.length > 0) params.set("categoryIds", categoryIds.join(","))
        if (searchTerm) params.set("search", searchTerm)
        const query = params.toString()

        const [productsRes, listingsRes] = await Promise.all([
          cachedFetch(`/api/products${query ? `?${query}` : ""}`),
          cachedFetch(`/api/product-listings`),
        ])

        if (cancelled) return

        const rawProducts: Product[] = (productsRes ?? []) as Product[]
        const rawListings: ProductListing[] = (listingsRes ?? []) as ProductListing[]

        const selectedCategorySet = new Set(categoryIds)
        const categoryFiltered = selectedCategorySet.size > 0
          ? rawProducts.filter((p) => p.categoryId !== null && selectedCategorySet.has(p.categoryId))
          : rawProducts

        const deduped = new Map<number, Product>()
        for (const product of categoryFiltered) deduped.set(product.id, product)

        const bestPriceMap = new Map<number, number>()
        const bestListingIdMap = new Map<number, number>()
        const bestTrustScoreMap = new Map<number, number | null>()
        const offersCountMap = new Map<number, number>()
        const discountMap = new Map<number, number>()
        const refsMap = new Map<number, string[]>()

        for (const listing of rawListings) {
          const pid = listing.productId
          if (pid === null) continue
          if (listing.is_active === false || listing.availability === false) continue
          if (listing.price !== null && listing.price === 0) continue

          offersCountMap.set(pid, (offersCountMap.get(pid) ?? 0) + 1)

          if (listing.price !== null) {
            const current = bestPriceMap.get(pid)
            if (current === undefined || listing.price < current) {
              bestPriceMap.set(pid, listing.price)
              bestListingIdMap.set(pid, listing.id)
              bestTrustScoreMap.set(pid, listing.trust_score)
            }
          }

          if (listing.price !== null && listing.old_price !== null && listing.old_price > listing.price) {
            const disc = Math.round(((listing.old_price - listing.price) / listing.old_price) * 100)
            const current = discountMap.get(pid) ?? 0
            if (disc > current) discountMap.set(pid, disc)
          }
        }

        let processed = [...deduped.values()].map((product) => ({
          product,
          bestPrice: bestPriceMap.get(product.id),
          bestListingId: bestListingIdMap.get(product.id),
          bestTrustScore: bestTrustScoreMap.get(product.id) ?? null,
          offersCount: offersCountMap.get(product.id) ?? 0,
          discountPercent: discountMap.get(product.id) ?? 0,
        }))

        const normalizedSearch = searchTerm.toLowerCase()
        if (normalizedSearch) {
          for (const listing of rawListings) {
            if (listing.productId !== null && listing.ref) {
              const refs = refsMap.get(listing.productId) ?? []
              refs.push(listing.ref.toLowerCase())
              refsMap.set(listing.productId, refs)
            }
          }
          processed = processed.filter(({ product }) => {
            if (product.name.toLowerCase().includes(normalizedSearch)) return true
            const refs = refsMap.get(product.id) ?? []
            return refs.some((ref) => ref.includes(normalizedSearch))
          })
        }

        if (cancelled) return
        setAllProducts(processed)
        setLoading(false)
        writeLs(lsCacheKey(categoryIds, searchTerm), processed)
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [categoryIds.join(","), searchTerm])

  useEffect(() => {
    if (allProducts.length === 0) return

    const listingIds = allProducts
      .map((p) => p.bestListingId)
      .filter((id): id is number => id !== undefined)

    if (listingIds.length === 0) return

    async function loadFavorites() {
      try {
        const res = await fetch(`/api/b2c/favorites?productListingIds=${listingIds.join(",")}`)
        if (!res.ok) return
        const data = (await res.json()) as { favorites?: B2CFavorite[] }
        if (data.favorites) {
          const favSet = new Set<number>()
          for (const fav of data.favorites) {
            if (fav.productListingId !== null) favSet.add(fav.productListingId)
          }
          setFavoritedIds(favSet)
          writeLs(`${lsCacheKey(categoryIds, searchTerm)}_favs`, [...favSet])
        }
      } catch {
        // favorites optional - silently ignore
      }
    }

    loadFavorites()
  }, [allProducts])

  const hasMinPrice = minPrice !== undefined && Number.isFinite(minPrice) && minPrice > 0
  const hasMaxPrice = maxPrice !== undefined && Number.isFinite(maxPrice) && maxPrice > 0

  const filteredProducts = useMemo(() => {
    let result = allProducts

    if (selectedBrand) {
      result = result.filter(
        ({ product }) => (product.brand || "Unknown").toLowerCase() === selectedBrand.toLowerCase(),
      )
    }

    if (pricedOnly) {
      result = result.filter(({ bestPrice }) => bestPrice !== undefined)
    }

    if (hasMinPrice) {
      result = result.filter(
        ({ bestPrice }) => bestPrice !== undefined && bestPrice >= (minPrice as number),
      )
    }

    if (hasMaxPrice) {
      result = result.filter(
        ({ bestPrice }) => bestPrice !== undefined && bestPrice <= (maxPrice as number),
      )
    }

    result.sort((a, b) => {
      if (selectedSort === "name-asc") {
        return a.product.name.localeCompare(b.product.name)
      }
      if (selectedSort === "price-desc") {
        if (a.bestPrice === undefined && b.bestPrice === undefined) return 0
        if (a.bestPrice === undefined) return 1
        if (b.bestPrice === undefined) return -1
        return b.bestPrice - a.bestPrice
      }
      if (selectedSort === "discount") {
        return b.discountPercent - a.discountPercent
      }
      if (a.bestPrice === undefined && b.bestPrice === undefined) {
        return a.product.name.localeCompare(b.product.name)
      }
      if (a.bestPrice === undefined) return 1
      if (b.bestPrice === undefined) return -1
      return a.bestPrice - b.bestPrice
    })

    return result
  }, [allProducts, selectedSort, selectedBrand, pricedOnly, minPrice, maxPrice, hasMinPrice, hasMaxPrice])

  const totalProducts = filteredProducts.length
  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalProducts)
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

  const availablePrices = filteredProducts
    .map((item) => item.bestPrice)
    .filter((value): value is number => value !== undefined)
  const minAvailablePrice = availablePrices.length > 0 ? Math.floor(Math.min(...availablePrices)) : 0
  const maxAvailablePrice = availablePrices.length > 0 ? Math.ceil(Math.max(...availablePrices)) : 0
  const sliderMin = minAvailablePrice
  const sliderMax = Math.max(maxAvailablePrice, sliderMin)
  const sliderMinValue = hasMinPrice ? minPrice as number : sliderMin
  const sliderMaxValue = hasMaxPrice ? maxPrice as number : sliderMax

  const brandCounts = new Map<string, number>()
  for (const item of filteredProducts) {
    const brand = item.product.brand || "Unknown"
    brandCounts.set(brand, (brandCounts.get(brand) ?? 0) + 1)
  }
  const topBrands = [...brandCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)

  function changeSort(sort: string) {
    setSelectedSort(sort)
    setPage(1)
  }

  function changeBrand(brand: string) {
    setSelectedBrand(brand)
    setPage(1)
  }

  function togglePriced() {
    setPricedOnly((v) => !v)
    setPage(1)
  }

  function handlePriceChange(min?: number, max?: number) {
    setMinPrice(min)
    setMaxPrice(max)
    setPage(1)
  }

  function resetFilters() {
    setSelectedBrand("")
    setMinPrice(undefined)
    setMaxPrice(undefined)
    setPricedOnly(false)
    setPage(1)
  }

  const paginationTokens = buildPaginationTokens(safePage, totalPages)

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <Spinner className="mx-auto mb-4 h-8 w-8" />
          <p className="text-sm text-muted-foreground">Chargement des produits...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[300px_1fr]">
      <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Filtrer</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-muted-foreground">Prix (DT)</p>
              <PriceRangeFilter
                minBound={sliderMin}
                maxBound={sliderMax}
                initialMin={sliderMinValue}
                initialMax={sliderMaxValue}
                baseParams={{}}
                onPriceChange={handlePriceChange}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-sm font-semibold text-muted-foreground">Autres filtres</p>
              <Button
                onClick={togglePriced}
                variant={pricedOnly ? "default" : "outline"}
                className="w-full"
              >
                {pricedOnly ? "Prix uniquement: ON" : "Prix uniquement: OFF"}
              </Button>
              <Button onClick={resetFilters} variant="ghost" className="w-full">
                Reset filters
              </Button>
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-sm font-semibold text-muted-foreground">Fabricants</p>
              <div className="space-y-2">
                <button
                  onClick={() => changeBrand("")}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${selectedBrand ? "hover:bg-muted" : "bg-muted font-medium"}`}
                >
                  <span>All brands</span>
                  <span className="text-muted-foreground">({totalProducts})</span>
                </button>

                {topBrands.map(([brand, count]) => (
                  <button
                    key={brand}
                    onClick={() => changeBrand(brand)}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${selectedBrand.toLowerCase() === brand.toLowerCase() ? "bg-muted font-medium" : "hover:bg-muted"}`}
                  >
                    <span className="truncate pr-2">{brand}</span>
                    <span className="text-muted-foreground">({count})</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </aside>

      <section className="space-y-4">
        <Card className="rounded-xl border-border/70">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{totalProducts}</Badge>
              <span>produits trouves</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Trier par :</span>
              <Button
                onClick={() => changeSort("discount")}
                size="sm"
                variant={selectedSort === "discount" ? "default" : "outline"}
              >
                Meilleures offres
              </Button>
              <Button
                onClick={() => changeSort("price-asc")}
                size="sm"
                variant={selectedSort === "price-asc" ? "default" : "outline"}
              >
                Prix croissants
              </Button>
              <Button
                onClick={() => changeSort("price-desc")}
                size="sm"
                variant={selectedSort === "price-desc" ? "default" : "outline"}
              >
                Prix decroissants
              </Button>
              <Button
                onClick={() => changeSort("name-asc")}
                size="sm"
                variant={selectedSort === "name-asc" ? "default" : "outline"}
              >
                Nom A-Z
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/70">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
            <p className="font-medium text-foreground">
              Affichage {totalProducts === 0 ? 0 : startIndex + 1}-{endIndex} de {totalProducts} article(s)
            </p>

            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => { e.preventDefault(); setPage(Math.max(1, safePage - 1)) }}
                  />
                </PaginationItem>

                {paginationTokens.map((token, index) =>
                  token === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${index}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={token}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => { e.preventDefault(); setPage(token) }}
                        isActive={token === safePage}
                      >
                        {token}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => { e.preventDefault(); setPage(Math.min(totalPages, safePage + 1)) }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </CardContent>
        </Card>

        {totalProducts === 0 ? (
          <Card className="rounded-xl">
            <CardContent className="pt-6 text-sm text-muted-foreground">
              No products found{searchTerm ? ` for "${searchTerm}"` : ""}.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginatedProducts.map(({ product, bestPrice, bestListingId, bestTrustScore, offersCount }) => (
              <ProductCard
                key={product.id}
                product={product}
                bestPriceLabel={
                  bestPrice !== undefined
                    ? formatPrice(bestPrice)
                    : offersCount > 0
                      ? "Épuisé"
                      : "No available price"
                }
                offersCount={offersCount}
                bestTrustScore={bestTrustScore}
                favoriteListingId={bestListingId}
                isFavorited={bestListingId !== undefined ? favoritedIds.has(bestListingId) : false}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
