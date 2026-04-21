import Link from "next/link"

import { B2CNavbar } from "@/components/B2C/b2c-navbar"
import { ProductCard } from "@/components/B2C/product-card"
import { PriceRangeFilter } from "@/components/B2C/price-range-filter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
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
import { getRawCategories } from "@/services/admin/categories"
import { getProductListings } from "@/services/admin/product-listings"
import { getProducts } from "@/services/admin/products"
import type { CategoryRaw } from "@/services/admin/categories"
import type { Product, ProductListing } from "@/utils/types"

type ProductsPageProps = {
  searchParams?: Promise<{
    search?: string | string[]
    categoryId?: string | string[]
    categoryIds?: string | string[]
    categoryName?: string | string[]
    page?: string | string[]
    sort?: string | string[]
    brand?: string | string[]
    minPrice?: string | string[]
    maxPrice?: string | string[]
    priced?: string | string[]
  }>
}

type ProductWithBestPrice = {
  product: Product
  bestPrice?: number
  bestListingId?: number
  bestTrustScore?: number | null
  offersCount: number
}

type RootCategoryMenu = {
  id: number
  name: string
  under: Array<{
    id: number
    name: string
    allCategoryIds: number[]
    children: Array<{
      id: number
      name: string
      allCategoryIds: number[]
    }>
  }>
}

type PageToken = number | "ellipsis"

function getSingleParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? ""
  }

  return value ?? ""
}

function parseCategoryIds(params?: { categoryId?: string | string[]; categoryIds?: string | string[] }) {
  const ids = new Set<number>()

  if (params?.categoryIds) {
    const categoryIdsValue = Array.isArray(params.categoryIds)
      ? params.categoryIds[0] ?? ""
      : params.categoryIds

    for (const rawId of categoryIdsValue.split(",")) {
      const parsed = Number(rawId)
      if (Number.isInteger(parsed) && parsed > 0) {
        ids.add(parsed)
      }
    }
  }

  if (params?.categoryId) {
    const categoryIdValue = Array.isArray(params.categoryId)
      ? params.categoryId[0] ?? ""
      : params.categoryId

    const parsed = Number(categoryIdValue)
    if (Number.isInteger(parsed) && parsed > 0) {
      ids.add(parsed)
    }
  }

  return [...ids]
}

function computeBestListingByProduct(listings: ProductListing[]) {
  const bestPriceMap = new Map<number, number>()
  const bestListingIdMap = new Map<number, number>()
  const bestTrustScoreMap = new Map<number, number | null>()

  for (const listing of listings) {
    if (listing.productId === null || listing.price === null) {
      continue
    }

    if (listing.is_active === false || listing.availability === false) {
      continue
    }

    const currentBest = bestPriceMap.get(listing.productId)
    if (currentBest === undefined || listing.price < currentBest) {
      bestPriceMap.set(listing.productId, listing.price)
      bestListingIdMap.set(listing.productId, listing.id)
      bestTrustScoreMap.set(listing.productId, listing.trust_score)
    }
  }

  return { bestPriceMap, bestListingIdMap, bestTrustScoreMap }
}

function formatPrice(value?: number) {
  if (value === undefined) {
    return "No available price"
  }

  return `${value.toFixed(2)} DT`
}

function buildBreadcrumbTrail(categories: CategoryRaw[], categoryId?: number) {
  if (!categoryId) {
    return []
  }

  const byId = new Map<number, CategoryRaw>()
  for (const category of categories) {
    byId.set(category.id, category)
  }

  const trail: CategoryRaw[] = []
  const visited = new Set<number>()
  let current = byId.get(categoryId) ?? null

  while (current && !visited.has(current.id)) {
    trail.push(current)
    visited.add(current.id)
    current = current.parentId ? byId.get(current.parentId) ?? null : null
  }

  return trail.reverse()
}

function buildPaginationTokens(currentPage: number, totalPages: number): PageToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const tokens: PageToken[] = [1]
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  if (start > 2) {
    tokens.push("ellipsis")
  }

  for (let page = start; page <= end; page += 1) {
    tokens.push(page)
  }

  if (end < totalPages - 1) {
    tokens.push("ellipsis")
  }

  tokens.push(totalPages)
  return tokens
}

function buildRootCategoriesForMenu(rows: CategoryRaw[]): RootCategoryMenu[] {
  const byParent = new Map<number | null, CategoryRaw[]>()

  for (const row of rows) {
    const parentRows = byParent.get(row.parentId) ?? []
    parentRows.push(row)
    byParent.set(row.parentId, parentRows)
  }

  function getDescendantIds(categoryId: number): number[] {
    const directChildren = byParent.get(categoryId) ?? []
    const descendants: number[] = []

    for (const child of directChildren) {
      descendants.push(child.id)
      descendants.push(...getDescendantIds(child.id))
    }

    return descendants
  }

  const roots = byParent.get(null) ?? []
  return roots
    .map((root) => {
      const under = (byParent.get(root.id) ?? [])
        .map((item) => {
          const children = (byParent.get(item.id) ?? [])
            .map((child) => ({
              id: child.id,
              name: child.name,
              allCategoryIds: [child.id, ...getDescendantIds(child.id)],
            }))
            .sort((a, b) => a.name.localeCompare(b.name))

          return {
            id: item.id,
            name: item.name,
            allCategoryIds: [item.id, ...getDescendantIds(item.id)],
            children,
          }
        })
        .sort((a, b) => b.children.length - a.children.length)

      return {
        id: root.id,
        name: root.name,
        under,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export default async function B2CProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedSearchParams = await searchParams
  const searchTerm = getSingleParam(resolvedSearchParams?.search).trim()
  const normalizedSearchTerm = searchTerm.toLowerCase()
  const categoryName = getSingleParam(resolvedSearchParams?.categoryName) || "Products"
  const categoryIds = parseCategoryIds(resolvedSearchParams)
  const selectedSort = getSingleParam(resolvedSearchParams?.sort) || "price-asc"
  const selectedBrand = getSingleParam(resolvedSearchParams?.brand).trim()
  const pricedOnly = getSingleParam(resolvedSearchParams?.priced) === "1"

  const minPriceParam = getSingleParam(resolvedSearchParams?.minPrice).trim()
  const maxPriceParam = getSingleParam(resolvedSearchParams?.maxPrice).trim()
  const minPrice = minPriceParam ? Number(minPriceParam) : undefined
  const maxPrice = maxPriceParam ? Number(maxPriceParam) : undefined
  const hasMinPrice = minPrice !== undefined && Number.isFinite(minPrice) && minPrice > 0
  const hasMaxPrice = maxPrice !== undefined && Number.isFinite(maxPrice) && maxPrice > 0

  const pageFromQuery = Number(getSingleParam(resolvedSearchParams?.page) || "1")
  const page = Number.isInteger(pageFromQuery) && pageFromQuery > 0 ? pageFromQuery : 1
  const pageSize = 24

  let products: ProductWithBestPrice[] = []
  let categoryRows: CategoryRaw[] = []
  let errorMessage = ""

  try {
    const [allProducts, fetchedCategories] = await Promise.all([
      getProducts(),
      getRawCategories().catch(() => [] as CategoryRaw[]),
    ])

    categoryRows = fetchedCategories

    const selectedCategorySet = new Set(categoryIds)
    const categoryFilteredProducts =
      selectedCategorySet.size > 0
        ? allProducts.filter(
            (product) =>
              product.categoryId !== null && selectedCategorySet.has(product.categoryId),
          )
        : allProducts

    const deduped = new Map<number, Product>()
    for (const product of categoryFilteredProducts) {
      deduped.set(product.id, product)
    }

    let bestPriceByProduct = new Map<number, number>()
    let bestListingIdByProduct = new Map<number, number>()
    let bestTrustScoreByProduct = new Map<number, number | null>()
    let offersCountByProduct = new Map<number, number>()
    let refsByProduct = new Map<number, string[]>()
    try {
      const listings = await getProductListings()
      const bestListingResult = computeBestListingByProduct(listings)
      bestPriceByProduct = bestListingResult.bestPriceMap
      bestListingIdByProduct = bestListingResult.bestListingIdMap
      bestTrustScoreByProduct = bestListingResult.bestTrustScoreMap
      offersCountByProduct = listings.reduce((acc, listing) => {
        if (listing.productId === null) {
          return acc
        }
        acc.set(listing.productId, (acc.get(listing.productId) ?? 0) + 1)
        return acc
      }, new Map<number, number>())

      refsByProduct = listings.reduce((acc, listing) => {
        if (listing.productId === null || !listing.ref) {
          return acc
        }

        const refs = acc.get(listing.productId) ?? []
        refs.push(listing.ref.toLowerCase())
        acc.set(listing.productId, refs)
        return acc
      }, new Map<number, string[]>())
    } catch {
      bestPriceByProduct = new Map<number, number>()
      bestTrustScoreByProduct = new Map<number, number | null>()
      offersCountByProduct = new Map<number, number>()
      refsByProduct = new Map<number, string[]>()
    }

    products = [...deduped.values()].map((product) => ({
      product,
      bestPrice: bestPriceByProduct.get(product.id),
      bestListingId: bestListingIdByProduct.get(product.id),
      bestTrustScore: bestTrustScoreByProduct.get(product.id) ?? null,
      offersCount: offersCountByProduct.get(product.id) ?? 0,
    }))

    if (selectedBrand) {
      products = products.filter(
        ({ product }) => (product.brand || "Unknown").toLowerCase() === selectedBrand.toLowerCase(),
      )
    }

    if (normalizedSearchTerm) {
      products = products.filter(({ product }) => {
        if (product.name.toLowerCase().includes(normalizedSearchTerm)) {
          return true
        }

        const refs = refsByProduct.get(product.id) ?? []
        return refs.some((ref) => ref.includes(normalizedSearchTerm))
      })
    }

    if (pricedOnly) {
      products = products.filter(({ bestPrice }) => bestPrice !== undefined)
    }

    if (hasMinPrice) {
      products = products.filter(
        ({ bestPrice }) => bestPrice !== undefined && bestPrice >= (minPrice as number),
      )
    }

    if (hasMaxPrice) {
      products = products.filter(
        ({ bestPrice }) => bestPrice !== undefined && bestPrice <= (maxPrice as number),
      )
    }

    products.sort((a, b) => {
      if (selectedSort === "name-asc") {
        return a.product.name.localeCompare(b.product.name)
      }

      if (selectedSort === "price-desc") {
        if (a.bestPrice === undefined && b.bestPrice === undefined) return 0
        if (a.bestPrice === undefined) return 1
        if (b.bestPrice === undefined) return -1
        return b.bestPrice - a.bestPrice
      }

      if (a.bestPrice === undefined && b.bestPrice === undefined) {
        return a.product.name.localeCompare(b.product.name)
      }

      if (a.bestPrice === undefined) return 1
      if (b.bestPrice === undefined) return -1
      return a.bestPrice - b.bestPrice
    })
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Unable to load products for this category."
  }

  const totalProducts = products.length
  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalProducts)
  const paginatedProducts = products.slice(startIndex, endIndex)

  const availablePrices = products
    .map((item) => item.bestPrice)
    .filter((value): value is number => value !== undefined)

  const minAvailablePrice = availablePrices.length > 0 ? Math.floor(Math.min(...availablePrices)) : 0
  const maxAvailablePrice = availablePrices.length > 0 ? Math.ceil(Math.max(...availablePrices)) : 0
  const sliderMin = minAvailablePrice
  const sliderMax = Math.max(maxAvailablePrice, sliderMin)
  const sliderMinValue = hasMinPrice ? (minPrice as number) : sliderMin
  const sliderMaxValue = hasMaxPrice ? (maxPrice as number) : sliderMax

  const priceFilterBaseParams: Record<string, string> = {}
  const baseCategoryId = getSingleParam(resolvedSearchParams?.categoryId)
  const baseCategoryIds = getSingleParam(resolvedSearchParams?.categoryIds)
  const baseCategoryName = getSingleParam(resolvedSearchParams?.categoryName)
  const baseSearch = getSingleParam(resolvedSearchParams?.search).trim()

  if (baseCategoryId) {
    priceFilterBaseParams.categoryId = baseCategoryId
  }
  if (baseCategoryIds) {
    priceFilterBaseParams.categoryIds = baseCategoryIds
  }
  if (baseCategoryName) {
    priceFilterBaseParams.categoryName = baseCategoryName
  }
  if (baseSearch) {
    priceFilterBaseParams.search = baseSearch
  }
  if (selectedSort) {
    priceFilterBaseParams.sort = selectedSort
  }
  if (selectedBrand) {
    priceFilterBaseParams.brand = selectedBrand
  }
  if (pricedOnly) {
    priceFilterBaseParams.priced = "1"
  }

  const brandCounts = new Map<string, number>()
  for (const item of products) {
    const brand = item.product.brand || "Unknown"
    brandCounts.set(brand, (brandCounts.get(brand) ?? 0) + 1)
  }

  const topBrands = [...brandCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)

  const primaryCategoryId =
    resolvedSearchParams?.categoryId && Number.isInteger(Number(resolvedSearchParams.categoryId))
      ? Number(resolvedSearchParams.categoryId)
      : categoryIds[0]
  const breadcrumbTrail = buildBreadcrumbTrail(categoryRows, primaryCategoryId)
  const rootCategories = buildRootCategoriesForMenu(categoryRows)

  function buildQueryParams(targetPage: number) {
    const params = new URLSearchParams()

    const categoryIdParam = getSingleParam(resolvedSearchParams?.categoryId)
    const categoryIdsParam = getSingleParam(resolvedSearchParams?.categoryIds)
    const categoryNameParam = getSingleParam(resolvedSearchParams?.categoryName)
    const searchParam = getSingleParam(resolvedSearchParams?.search).trim()

    if (categoryIdParam) {
      params.set("categoryId", categoryIdParam)
    }
    if (categoryIdsParam) {
      params.set("categoryIds", categoryIdsParam)
    }
    if (categoryNameParam) {
      params.set("categoryName", categoryNameParam)
    }
    if (searchParam) {
      params.set("search", searchParam)
    }

    if (selectedSort) {
      params.set("sort", selectedSort)
    }
    if (selectedBrand) {
      params.set("brand", selectedBrand)
    }
    if (pricedOnly) {
      params.set("priced", "1")
    }
    if (hasMinPrice) {
      params.set("minPrice", String(minPrice as number))
    }
    if (hasMaxPrice) {
      params.set("maxPrice", String(maxPrice as number))
    }

    params.set("page", String(targetPage))
    return params
  }

  function buildHref(overrides: {
    page?: number
    sort?: string
    brand?: string
    priced?: boolean
    resetFilters?: boolean
  }) {
    const params = buildQueryParams(overrides.page ?? 1)

    if (overrides.sort !== undefined) {
      params.set("sort", overrides.sort)
      params.set("page", "1")
    }

    if (overrides.brand !== undefined) {
      if (overrides.brand) {
        params.set("brand", overrides.brand)
      } else {
        params.delete("brand")
      }
      params.set("page", "1")
    }

    if (overrides.priced !== undefined) {
      if (overrides.priced) {
        params.set("priced", "1")
      } else {
        params.delete("priced")
      }
      params.set("page", "1")
    }

    if (overrides.resetFilters) {
      params.delete("brand")
      params.delete("minPrice")
      params.delete("maxPrice")
      params.delete("priced")
      params.set("page", "1")
    }

    return `/B2C/products?${params.toString()}`
  }

  const paginationTokens = buildPaginationTokens(safePage, totalPages)

  return (
    <div className="min-h-svh bg-muted/30">
      <B2CNavbar title="Products radar" />

      <section className="border-b bg-background">
        <div className="w-full px-4 py-2 sm:px-10">
          {rootCategories.length > 0 ? (
            <NavigationMenu viewport={false} className="w-full max-w-none justify-start">
              <NavigationMenuList className="w-full justify-start gap-2">
                {rootCategories.map((category) => (
                  <NavigationMenuItem key={category.id} className="static">
                    <NavigationMenuTrigger className="h-10 rounded-xl px-4 text-sm font-medium">
                      {category.name}
                    </NavigationMenuTrigger>

                    <NavigationMenuContent className="absolute left-0 top-full z-50 mt-2 w-screen max-w-300 rounded-xl border p-6 shadow-lg">
                      {category.under.length > 0 ? (
                        <div className="grid w-full grid-cols-1 gap-x-8 gap-y-6 pr-1 md:grid-cols-2 lg:grid-cols-4">
                          {category.under.map((item) => (
                            <div key={`${category.id}-${item.id}`} className="space-y-2">
                              <Link
                                href={`/B2C/products?categoryIds=${encodeURIComponent(item.allCategoryIds.join(","))}&categoryName=${encodeURIComponent(item.name)}`}
                                className="block text-sm font-semibold text-foreground hover:text-primary"
                              >
                                {item.name}
                              </Link>

                              {item.children.length > 0 ? (
                                <>
                                  <Separator />
                                  <ul className="mt-2 space-y-1">
                                    {item.children.map((child) => (
                                      <li key={`${category.id}-${item.id}-${child.id}`} className="text-sm leading-6">
                                        <Link
                                          href={`/B2C/products?categoryIds=${encodeURIComponent(child.allCategoryIds.join(","))}&categoryName=${encodeURIComponent(child.name)}`}
                                          className="text-muted-foreground hover:text-primary"
                                        >
                                          {child.name}
                                        </Link>
                                      </li>
                                    ))}
                                  </ul>
                                </>
                              ) : (
                                <p className="mt-2 text-sm text-muted-foreground">No child categories</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No under categories</p>
                      )}
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          ) : (
            <p className="px-2 py-1 text-sm text-muted-foreground">No categories available</p>
          )}
        </div>
      </section>

      <main className="mx-auto w-full max-w-8xl px-4 py-6 sm:px-10">
        <Card className="mb-5 rounded-xl border-border/70">
          <CardContent className="flex flex-wrap items-center gap-2 py-3 text-sm">
            <Link href="/" className="font-medium text-muted-foreground hover:text-foreground">
              Accueil
            </Link>

            {breadcrumbTrail.length > 0
              ? breadcrumbTrail.map((crumb) => (
                  <span key={crumb.id} className="flex items-center gap-2 text-muted-foreground">
                    <span>|</span>
                    <span className="font-medium">{crumb.name}</span>
                  </span>
                ))
              : (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span>|</span>
                    <span className="font-medium">{categoryName}</span>
                  </span>
                )}

            {categoryIds.length > 0 ? (
              <Badge variant="outline" className="ml-2">
                {categoryIds.length} categories selected
              </Badge>
            ) : null}
          </CardContent>
        </Card>

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
                    baseParams={priceFilterBaseParams}
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground">Autres filtres</p>
                  <Button asChild variant={pricedOnly ? "default" : "outline"} className="w-full">
                    <Link href={buildHref({ priced: !pricedOnly })}>
                      {pricedOnly ? "Prix uniquement: ON" : "Prix uniquement: OFF"}
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="w-full">
                    <Link href={buildHref({ resetFilters: true })}>Reset filters</Link>
                  </Button>
                </div>

                <Separator />

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground">Fabricants</p>
                  <div className="space-y-2">
                    <Link
                      href={buildHref({ brand: "" })}
                      className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${selectedBrand ? "hover:bg-muted" : "bg-muted font-medium"}`}
                    >
                      <span>All brands</span>
                      <span className="text-muted-foreground">({totalProducts})</span>
                    </Link>

                    {topBrands.map(([brand, count]) => (
                      <Link
                        key={brand}
                        href={buildHref({ brand })}
                        className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${selectedBrand.toLowerCase() === brand.toLowerCase() ? "bg-muted font-medium" : "hover:bg-muted"}`}
                      >
                        <span className="truncate pr-2">{brand}</span>
                        <span className="text-muted-foreground">({count})</span>
                      </Link>
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
                  {searchTerm ? (
                    <Badge variant="outline" className="max-w-64 truncate">
                      Search: {searchTerm}
                    </Badge>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Trier par :</span>
                  <Button asChild size="sm" variant={selectedSort === "price-asc" ? "default" : "outline"}>
                    <Link href={buildHref({ sort: "price-asc" })}>Prix croissants</Link>
                  </Button>
                  <Button asChild size="sm" variant={selectedSort === "price-desc" ? "default" : "outline"}>
                    <Link href={buildHref({ sort: "price-desc" })}>Prix decroissants</Link>
                  </Button>
                  <Button asChild size="sm" variant={selectedSort === "name-asc" ? "default" : "outline"}>
                    <Link href={buildHref({ sort: "name-asc" })}>Nom A-Z</Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link href="/">Changer categorie</Link>
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
                      <PaginationPrevious href={buildHref({ page: Math.max(1, safePage - 1) })} />
                    </PaginationItem>

                    {paginationTokens.map((token, index) =>
                      token === "ellipsis" ? (
                        <PaginationItem key={`ellipsis-${index}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={token}>
                          <PaginationLink href={buildHref({ page: token })} isActive={token === safePage}>
                            {token}
                          </PaginationLink>
                        </PaginationItem>
                      ),
                    )}

                    <PaginationItem>
                      <PaginationNext href={buildHref({ page: Math.min(totalPages, safePage + 1) })} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </CardContent>
            </Card>

            {errorMessage ? (
              <Card className="rounded-xl">
                <CardContent className="pt-6 text-sm text-red-600">{errorMessage}</CardContent>
              </Card>
            ) : totalProducts === 0 ? (
              <Card className="rounded-xl">
                <CardContent className="pt-6 text-sm text-muted-foreground">
                  No products found for this category.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {paginatedProducts.map(({ product, bestPrice, bestListingId, bestTrustScore, offersCount }) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    bestPriceLabel={bestPrice !== undefined ? formatPrice(bestPrice) : "No available price"}
                    offersCount={offersCount}
                    bestTrustScore={bestTrustScore}
                    favoriteListingId={bestListingId}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
