/* eslint-disable @next/next/no-img-element */

import Image from "next/image"
import Link from "next/link"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { B2CNavbar } from "@/components/B2C/b2c-navbar"
import { CustomerReviewsSection } from "@/components/B2C/customer-reviews-section"
import { ListingFavoriteToggle } from "@/components/B2C/listing-favorite-toggle"
import ProductPriceHistoryLinearChart from "@/components/B2C/product-price-history-linear-chart"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { BACKEND_URL } from "@/utils/admin/constants"
import { COOKIE_NAME, verifyB2CSessionToken } from "@/lib/b2c-session"
import { getServerLocale } from "@/lib/get-server-locale"
import { serverT } from "@/lib/translations"
import { translateCategoryName } from "@/lib/category-translations"
import { getBestTimeToBuy } from "@/services/admin/best-time-to-buy"
import { getRawCategories } from "@/services/admin/categories"
import { getPriceHistory } from "@/services/admin/price-history"
import { getProductListings } from "@/services/admin/product-listings"
import { getProducts } from "@/services/admin/products"
import { getSellers, type Seller } from "@/services/admin/sellers"
import type { CategoryRaw } from "@/services/admin/categories"
import type {
  BestTimeToBuyPrediction,
  PriceHistoryEntry,
  Product,
  ProductListing,
} from "@/utils/types"

type ProductDetailsPageProps = {
  params: Promise<{
    id: string
  }>
}

type SellerWithLogo = Seller & {
  logo_url?: string | null
  logoUrl?: string | null
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

function toMoney(value: number | null): string {
  if (value === null) {
    return "-"
  }

  return `${value.toFixed(2)} DT`
}

function toDate(value: string | null): string {
  if (!value) {
    return "-"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return date.toLocaleString("fr-TN")
}

function toTrustScore(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "N/A"
  }

  return `${value.toFixed(2)}/100`
}

function toPercent(value: number): string {
  if (Number.isNaN(value)) {
    return "-"
  }

  return `${value.toFixed(1)}%`
}

function toSafeUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  try {
    return new URL(value).toString()
  } catch {
    return null
  }
}

function getBestPrice(listings: ProductListing[]): number | null {
  let bestPrice: number | null = null

  for (const listing of listings) {
    if (listing.price === null) {
      continue
    }

    if (listing.is_active === false || listing.availability === false) {
      continue
    }

    if (listing.price === 0) {
      continue
    }

    if (bestPrice === null || listing.price < bestPrice) {
      bestPrice = listing.price
    }
  }

  return bestPrice
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
    current = current.parentId ? (byId.get(current.parentId) ?? null) : null
  }

  return trail.reverse()
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

function getSpecsRows(product: Product) {
  if (!product.specs_json || typeof product.specs_json !== "object") {
    return [] as Array<{ key: string; value: string }>
  }

  return Object.entries(product.specs_json)
    .map(([key, value]) => {
      if (value === null || value === undefined) {
        return null
      }

      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        return {
          key,
          value: String(value),
        }
      }

      return {
        key,
        value: JSON.stringify(value),
      }
    })
    .filter((item): item is { key: string; value: string } => item !== null)
    .slice(0, 10)
}

function getDomainLabel(rawUrl: string | null | undefined): string {
  const safeUrl = toSafeUrl(rawUrl)
  if (!safeUrl) {
    return "Unknown domain"
  }

  try {
    return new URL(safeUrl).hostname.replace(/^www\./, "")
  } catch {
    return "Unknown domain"
  }
}

function getSellerLogoUrl(
  seller: SellerWithLogo | undefined,
  listing: ProductListing
): string | null {
  const explicitLogo = seller?.logo_url || seller?.logoUrl
  if (explicitLogo) {
    return explicitLogo
  }

  const sourceUrl = toSafeUrl(seller?.url) || toSafeUrl(listing.product_url)
  if (!sourceUrl) {
    return null
  }

  try {
    const hostname = new URL(sourceUrl).hostname
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=128`
  } catch {
    return null
  }
}

function ProductDetailSkeleton() {
  return (
    <main className="mx-auto w-full max-w-8xl space-y-6 px-4 py-6 sm:px-10">
      <div className="animate-pulse">
        <div className="mb-6 h-4 w-64 rounded bg-muted" />
        <div className="rounded-md border bg-background p-4 sm:p-5">
          <div className="grid gap-5 xl:grid-cols-[250px_1fr_440px] xl:items-start">
            <div className="h-56 rounded-xl bg-muted sm:h-64" />
            <div className="space-y-4">
              <div className="h-8 w-3/4 rounded bg-muted" />
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-2/3 rounded bg-muted" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="h-20 rounded bg-muted" />
                <div className="h-20 rounded bg-muted" />
              </div>
            </div>
            <div className="h-48 rounded bg-muted" />
          </div>
        </div>
        <div className="mt-6 h-64 rounded bg-muted" />
      </div>
    </main>
  )
}

async function ProductDetailContent({
  productId,
  b2cSession,
  isAuthenticated,
  categoryRows,
  locale,
}: {
  productId: number
  b2cSession: Awaited<ReturnType<typeof verifyB2CSessionToken>>
  isAuthenticated: boolean
  categoryRows: CategoryRaw[]
  locale: string
}) {
  let b2bSellerId: number | null = null
  if (b2cSession?.type === "b2b_company") {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      const response = await fetch(
        `${BACKEND_URL}/api/b2b/workspace/${encodeURIComponent(b2cSession.firebase_uid)}/summary?lang=${locale}`,
        { cache: "no-store", signal: controller.signal }
      )
      clearTimeout(timeoutId)
      if (response.ok) {
        const summary = await response.json()
        b2bSellerId = summary?.user?.seller_id ?? null
      }
    } catch {}
  }

  let product: Product | null = null
  let listings: ProductListing[] = []
  let priceHistory: PriceHistoryEntry[] = []
  let sellers: SellerWithLogo[] = []
  let bestTimePrediction: BestTimeToBuyPrediction | null = null
  let sponsoredListingId: number | null = null
  let bestTimeFriendlyMessage: string | null = null
  let historyAccessMonths = 1
  let fetchError: string | null = null

  try {
    const [allProducts, productListings, allSellers, history, sponsoredRes] = await Promise.all([
      getProducts(undefined, locale),
      getProductListings(productId, undefined, undefined, undefined, locale),
      getSellers(locale)
        .then((rows) => rows as SellerWithLogo[])
        .catch(() => []),
      isAuthenticated
        ? getPriceHistory(productId, undefined, locale).catch(() => [])
        : Promise.resolve([]),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/b2b/b2c/sponsored-products?product_id=${productId}&lang=${locale}`, { cache: "no-store" })
        .then((res) => res.ok ? res.json() : { items: [] })
        .catch(() => ({ items: [] })),
    ])

    product = allProducts.find((item) => item.id === productId) ?? null
    listings = productListings
    sellers = allSellers
    priceHistory = history

    if (sponsoredRes?.items?.[0]?.listing_id) {
      sponsoredListingId = sponsoredRes.items[0].listing_id
    }

    if (isAuthenticated && b2cSession) {
      try {
        const subscriptionResponse = await fetch(
          `${BACKEND_URL}/api/b2c/subscription/${encodeURIComponent(b2cSession.firebase_uid)}?lang=${locale}`,
          { cache: "no-store" }
        )

        if (subscriptionResponse.ok) {
          const subscriptionData = (await subscriptionResponse.json()) as {
            subscription?: { price_history_access?: number | null }
          }

          const access = Number(
            subscriptionData.subscription?.price_history_access ?? 1
          )
          historyAccessMonths = Number.isFinite(access) && access >= 6 ? 6 : 1
        }
      } catch {}
    }

    if (isAuthenticated && b2cSession) {
      try {
        const res = await getBestTimeToBuy(productId, b2cSession.id, locale)
        bestTimePrediction = res.prediction ?? null
        bestTimeFriendlyMessage = res.friendly_message ?? null
      } catch (error) {
        bestTimePrediction = null
        bestTimeFriendlyMessage = null
      }
    }
  } catch (error) {
    fetchError =
      error instanceof Error
        ? error.message
        : "Unable to load product details at the moment."
  }

  if (!fetchError && !product) {
    notFound()
  }

  const sellerById = new Map<number, SellerWithLogo>()
  for (const seller of sellers) {
    sellerById.set(seller.id, seller)
  }

  const activeListings = [...listings]
    .filter((listing) => {
      if (listing.is_active === false) return false
      if (listing.price !== null && listing.price === 0) return false
      return true
    })
    .sort((a, b) => {
      if (a.id === sponsoredListingId) return -1
      if (b.id === sponsoredListingId) return 1
      if (a.price === null && b.price === null) return a.id - b.id
      if (a.price === null) return 1
      if (b.price === null) return -1
      return a.price - b.price
    })

  const bestPrice = getBestPrice(activeListings)
  const specs = product ? getSpecsRows(product) : []
  const breadcrumbTrail = buildBreadcrumbTrail(
    categoryRows,
    product?.categoryId ?? undefined
  )

  return (
    <main className="mx-auto w-full max-w-8xl space-y-6 px-4 py-6 sm:px-10">
      {fetchError ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-5 text-sm text-destructive">
            {fetchError}
          </CardContent>
        </Card>
      ) : product ? (
        <>
          <div className="px-4 py-3 text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/" className="hover:text-foreground">
                {serverT(locale, "detail.home")}
              </Link>
              <span>/</span>
              <Link href="/B2C/products" className="hover:text-foreground">
                {serverT(locale, "detail.products")}
              </Link>
              {breadcrumbTrail.map((crumb) => (
                <span key={crumb.id} className="flex items-center gap-2">
                  <span>/</span>
                  <span className="font-medium text-muted-foreground">
                    {crumb.name}
                  </span>
                </span>
              ))}
              <span className="flex items-center gap-2">
                <span>/</span>
                <span className="font-semibold text-foreground">
                  {product.name}
                </span>
              </span>
            </div>
          </div>

          <section className="rounded-md border bg-background p-4 sm:p-5">
            <div className="grid gap-5 xl:grid-cols-[250px_1fr_440px] xl:items-start">
              <div className="group relative overflow-hidden rounded-xl bg-slate-50">
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    width={560}
                    height={560}
                    className="h-56 w-full object-contain transition-all duration-500 ease-out group-hover:scale-105 group-hover:drop-shadow-lg sm:h-64"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-56 items-center justify-center border bg-background text-sm text-muted-foreground sm:h-64">
                    {serverT(locale, "detail.no_image")}
                  </div>
                )}

                <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </div>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">#{product.id}</Badge>
                  {product.brand ? (
                    <Badge variant="secondary">{product.brand}</Badge>
                  ) : null}
                </div>

                <h2 className="text-3xl leading-tight font-semibold">
                  {product.name}
                </h2>

                <p className="text-sm leading-7 text-muted-foreground">
                {product.description ||
                  serverT(locale, "detail.no_description")}
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="border border-orange-200 bg-orange-50 px-3 py-2">
                    <p className="text-xs tracking-wide text-orange-700 uppercase">
                      {serverT(locale, "detail.best_price")}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-orange-600">
                      {toMoney(bestPrice)}
                    </p>
                  </div>
                  <div className="border bg-background px-3 py-2">
                    <p className="text-xs tracking-wide text-muted-foreground uppercase">
                      {serverT(locale, "detail.total_offers")}
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                      {activeListings.length}
                    </p>
                  </div>
                </div>

                {specs.length > 0 ? (
                  <div className="border bg-muted/20 p-3">
                    <p className="mb-2 text-xs tracking-wide text-muted-foreground uppercase">
                      {serverT(locale, "detail.specifications")}
                    </p>
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      {specs.map((item) => (
                        <div
                          key={item.key}
                          className="border bg-background px-2 py-1.5"
                        >
                          <span className="font-medium">{item.key}: </span>
                          <span className="text-muted-foreground">
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div>
                <div className="space-y-4">
                  {isAuthenticated ? (
                    <ProductPriceHistoryLinearChart
                      productId={product.id}
                      history={priceHistory}
                      bestTimePrediction={bestTimePrediction}
                      friendlyMessage={bestTimeFriendlyMessage}
                      historyAccessMonths={historyAccessMonths}
                    />
                  ) : (
                    <Card className="rounded-xl border">
                      <CardHeader>
                        <CardTitle>{serverT(locale, "detail.price_history")}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          {serverT(locale, "detail.authenticate")}
                        </p>
                        <Button
                          asChild
                          variant="outline"
                          className="w-full rounded-lg"
                        >
                          <Link href="/B2C/products">
                            {serverT(locale, "detail.authenticate_btn")}
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section>
            <Card className="rounded-xl border-border/70">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>{serverT(locale, "detail.compare_offers")}</CardTitle>
                <Badge variant="secondary">
                  {activeListings.length} {serverT(locale, "detail.offers")}
                </Badge>
              </CardHeader>

              <CardContent>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{serverT(locale, "detail.seller")}</TableHead>
                        <TableHead>{serverT(locale, "detail.price")}</TableHead>
                        <TableHead>{serverT(locale, "detail.old_price")}</TableHead>
                        <TableHead>{serverT(locale, "detail.availability")}</TableHead>
                        <TableHead>{serverT(locale, "detail.trust")}</TableHead>
                        <TableHead>{serverT(locale, "detail.updated")}</TableHead>
                        <TableHead className="text-right">{serverT(locale, "detail.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {activeListings.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="py-8 text-center text-muted-foreground"
                          >
                            {serverT(locale, "detail.no_listings")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        activeListings.map((listing) => {
                          const seller =
                            listing.sellerId !== null
                              ? sellerById.get(listing.sellerId)
                              : undefined
                          const sellerName =
                            listing.sellerName?.trim() ||
                            seller?.name ||
                            "Unknown seller"
                          const sellerLogo = getSellerLogoUrl(seller, listing)
                          const sellerLink = toSafeUrl(seller?.url)
                          const isOwnSellerListing =
                            b2bSellerId !== null &&
                            listing.sellerId === b2bSellerId

                          return (
                            <TableRow
                              key={listing.id}
                              className={
                                isOwnSellerListing
                                  ? "bg-emerald-50/80 ring-1 ring-emerald-400 ring-inset dark:bg-emerald-950/25 dark:ring-emerald-700"
                                  : ""
                              }
                            >
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted/40">
                                    {sellerLogo ? (
                                      <img
                                        src={sellerLogo}
                                        alt={`${sellerName} logo`}
                                        className="h-6 w-6 object-contain"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <span className="text-xs font-semibold text-muted-foreground">
                                        {sellerName.slice(0, 2).toUpperCase()}
                                      </span>
                                    )}
                                  </div>

                                  <div>
                                    <p
                                      className={
                                        isOwnSellerListing
                                          ? "font-medium text-emerald-700 dark:text-emerald-300"
                                          : "font-medium"
                                      }
                                    >
                                      {sellerName}
                                      {isOwnSellerListing && (
                                        <Badge
                                          variant="secondary"
                                          className="ml-2 border border-emerald-200 bg-emerald-100 text-[9px] tracking-wider text-emerald-700 uppercase dark:border-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                                        >
                                          {serverT(locale, "detail.you")}
                                        </Badge>
                                      )}
                                    </p>
                                    {sellerLink ? (
                                      <a
                                        href={sellerLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={
                                          isOwnSellerListing
                                            ? "text-xs text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
                                            : "text-xs text-muted-foreground hover:text-primary"
                                        }
                                      >
                                        {getDomainLabel(sellerLink)}
                                      </a>
                                    ) : (
                                      <p
                                        className={
                                          isOwnSellerListing
                                            ? "text-xs text-emerald-700 dark:text-emerald-300"
                                            : "text-xs text-muted-foreground"
                                        }
                                      >
                                        {getDomainLabel(listing.product_url)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="font-semibold">
                                {toMoney(listing.price)}
                              </TableCell>
                              <TableCell>
                                {toMoney(listing.old_price)}
                              </TableCell>
                              <TableCell>
                                {listing.availability === null ? (
                                  <Badge variant="outline">{serverT(locale, "detail.unknown")}</Badge>
                                ) : listing.availability ? (
                                  <Badge variant="secondary">{serverT(locale, "detail.in_stock")}</Badge>
                                ) : (
                                  <Badge variant="destructive">
                                    {serverT(locale, "detail.out_of_stock")}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {toTrustScore(listing.trust_score)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {toDate(listing.updated_at)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {isAuthenticated ? (
                                    <ListingFavoriteToggle
                                      productListingId={listing.id}
                                    />
                                  ) : null}
                                  <Button asChild size="sm" variant="outline">
                                    <a
                                      href={listing.product_url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      {serverT(locale, "detail.visit_store")}
                                    </a>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <CustomerReviewsSection
              productId={product.id}
              isAuthenticated={isAuthenticated}
            />
          </section>
        </>
      ) : null}
    </main>
  )
}

export default async function B2CProductDetailsPage({
  params,
}: ProductDetailsPageProps) {
  const resolvedParams = await params
  const parsedId = Number(resolvedParams.id)

  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    notFound()
  }

  const productId = parsedId

  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(COOKIE_NAME)?.value
  const b2cSession = sessionToken
    ? await verifyB2CSessionToken(sessionToken)
    : null
  const isAuthenticated = Boolean(b2cSession)
  const locale = await getServerLocale()

  const categoryRows = await getRawCategories().catch(() => [] as CategoryRaw[])
  const rootCategories = buildRootCategoriesForMenu(categoryRows)

  return (
    <div className="min-h-svh bg-muted/30">
      <B2CNavbar
        title={serverT(locale, "nav.brand")}
        backHref="/B2C/products"
        backLabel={serverT(locale, "general.back")}
      />

      <section className="border-b bg-background">
        <div className="w-full px-4 py-2 sm:px-10">
          {rootCategories.length > 0 ? (
            <nav className="flex w-full items-center gap-2 overflow-x-auto">
              {rootCategories.map((category) => (
                <div key={category.id} className="group/cat relative">
                  <button
                    type="button"
                    className="inline-flex h-10 items-center gap-1 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {translateCategoryName(locale, category.name)}
                    <svg className="ml-1 h-3 w-3 transition-transform group-hover/cat:rotate-180" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </button>

                  <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-screen max-w-[75rem] scale-95 rounded-xl border bg-popover p-6 opacity-0 shadow-lg transition-all duration-200 group-hover/cat:pointer-events-auto group-hover/cat:scale-100 group-hover/cat:opacity-100">
                    {category.under.length > 0 ? (
                      <div className="grid w-full grid-cols-1 gap-x-8 gap-y-6 pr-1 md:grid-cols-2 lg:grid-cols-4">
                        {category.under.map((item) => (
                          <div key={`${category.id}-${item.id}`} className="space-y-2">
                            <Link
                              href={`/B2C/products?categoryIds=${encodeURIComponent(item.allCategoryIds.join(","))}&categoryName=${encodeURIComponent(item.name)}`}
                              className="block text-sm font-semibold text-foreground hover:text-primary"
                            >
                              {translateCategoryName(locale, item.name)}
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
                                        {translateCategoryName(locale, child.name)}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </>
                            ) : (
                              <p className="mt-2 text-sm text-muted-foreground">
                                {serverT(locale, "detail.no_under_categories")}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {serverT(locale, "detail.no_under_categories")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </nav>
          ) : (
            <p className="px-2 py-1 text-sm text-muted-foreground">
              {serverT(locale, "detail.no_categories")}
            </p>
          )}
        </div>
      </section>

      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductDetailContent
          productId={productId}
          b2cSession={b2cSession}
          isAuthenticated={isAuthenticated}
          categoryRows={categoryRows}
          locale={locale}
        />
      </Suspense>
    </div>
  )
}
