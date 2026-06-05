"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  ArrowRight,
  ChevronRight,
  Flame,
  Gamepad2,
  Menu,
  ShoppingBag,
  Sparkles,
  TicketPercent,
  type LucideIcon,
} from "lucide-react"

import { useApiUrl } from "@/lib/use-api-url"
import { useI18n } from "@/lib/i18n-context"
import { translateCategoryName } from "@/lib/category-translations"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"

type ShowcaseProduct = {
  id: number
  name: string
  imageUrl: string | null
  offersCount: number
  bestPrice: number | null
  discountPercent: number
}

type CategoryWithChildren = {
  id: number
  name: string
  allCategoryIds: number[]
  children: CategoryWithChildren[]
}

function toMoney(value: number | null): string {
  if (value === null) return "-"
  return `${value.toFixed(3)} DT`
}

const GAMING_KEYWORDS = [
  "gaming", "playstation", "ps5", "ps4", "xbox", "nintendo", "switch",
  "rtx", "gpu", "graphics card", "graphics card", "controller",
  "gamer", "esports", "steam deck", "rog ally", "gamepad",
  "joystick", "racing wheel", "sim racing",
]

function matchesGaming(name: string): boolean {
  const lower = name.toLowerCase()
  return GAMING_KEYWORDS.some((kw) => lower.includes(kw))
}

function ProductTile({ product, priority = false }: { product: ShowcaseProduct; priority?: boolean }) {
  const { t } = useI18n()
  return (
    <article className="group flex flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md">
      <div className="relative mb-3 flex h-40 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-b from-slate-50 to-slate-100/50">
        {product.discountPercent > 0 && (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs">
            -{product.discountPercent}%
          </span>
        )}
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={224}
            height={180}
            className="h-full w-full object-contain p-4 transition-all duration-500 group-hover:scale-110"
            unoptimized
            priority={priority}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingBag className="h-12 w-12 text-slate-200" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      <div className="flex flex-1 flex-col justify-between gap-2">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-slate-800">{product.name}</h3>

        <div className="mt-auto space-y-2.5">
          <div className="flex items-baseline gap-2">
            {product.bestPrice !== null ? (
              <>
                <span className="text-lg font-bold text-orange-600">{toMoney(product.bestPrice)}</span>
                {product.discountPercent > 0 && (
                  <span className="text-xs text-slate-400 line-through">
                    {toMoney(Math.round(product.bestPrice / (1 - product.discountPercent / 100)))}
                  </span>
                )}
              </>
            ) : product.offersCount > 0 ? (
              <span className="text-sm font-medium text-slate-400">{t("detail.out_of_stock")}</span>
            ) : (
              <span className="text-sm font-medium text-slate-400">-</span>
            )}
          </div>

          <div className="flex items-center justify-between">
            {product.offersCount > 0 && (
              <span className="text-[11px] font-medium text-slate-400">
                {product.offersCount} {product.offersCount === 1 ? t("home.seller") : t("home.sellers")}
              </span>
            )}
            <Link
              href={`/B2C/products/${product.id}`}
              className="ml-auto inline-flex h-7 items-center rounded-full bg-slate-100 px-3 text-[11px] font-medium text-slate-600 transition-all hover:bg-orange-500 hover:text-white"
            >
              {t("home.view")}
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

function SectionHeader({
  icon: Icon,
  label,
  href,
  color = "bg-slate-100",
  iconColor = "text-slate-700",
}: {
  icon: LucideIcon
  label: string
  href?: string
  color?: string
  iconColor?: string
}) {
  const { t } = useI18n()
  return (
    <div className="mb-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <h2 className="text-lg font-bold tracking-tight text-slate-900">{label}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-medium text-orange-600 transition-colors hover:text-orange-700"
        >
          {t("home.see_all")} <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  )
}

const homeCache = new Map<string, { data: unknown; ts: number }>()
const HOME_CACHE_TTL = 300_000
const HOME_LS_TTL = 600_000

async function homeCachedFetch(url: string): Promise<any> {
  const cached = homeCache.get(url)
  if (cached && Date.now() - cached.ts < HOME_CACHE_TTL) {
    return cached.data
  }
  try {
    const res = await fetch(url)
    const data = await res.json()
    homeCache.set(url, { data, ts: Date.now() })
    return data
  } catch {
    return []
  }
}

function homeReadLs<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (Date.now() - entry.ts > HOME_LS_TTL) return null
    return entry.data as T
  } catch { return null }
}

function homeWriteLs(key: string, data: unknown) {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })) } catch {}
}

function prefetchCategory(ids: string, locale: string) {
  if (typeof window === "undefined") return
  fetch(`/api/products?categoryIds=${encodeURIComponent(ids)}&lang=${locale}`).catch(() => {})
  fetch(`/api/product-listings?lang=${locale}`).catch(() => {})
}

export default function ClientHomePage() {
  const apiUrl = useApiUrl()
  const { locale, t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [rootCategories, setRootCategories] = useState<CategoryWithChildren[]>([])
  const [productsForShowcase, setProductsForShowcase] = useState<ShowcaseProduct[]>([])

  const homeCacheLoadedRef = useRef(false)

  useLayoutEffect(() => {
    const cats = homeReadLs<CategoryWithChildren[]>("b2c_home_cats")
    const showcase = homeReadLs<ShowcaseProduct[]>("b2c_home_showcase")
    if (cats && showcase) {
      homeCacheLoadedRef.current = true
      setRootCategories(cats)
      setProductsForShowcase(showcase)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [catsRes, prodsRes, listRes] = await Promise.all([
          homeCachedFetch(apiUrl("/api/categories")),
          homeCachedFetch(apiUrl("/api/products?limit=200")),
          homeCachedFetch(apiUrl("/api/product-listings")),
        ])

        if (cancelled) return

        const cats: any[] = (catsRes ?? []) as any[]
        const rawProducts: any[] = (prodsRes ?? []) as any[]
        const rawListings: any[] = (listRes ?? []) as any[]

        const byParent = new Map<number | null, Array<{ id: number; name: string; parentId: number | null }>>()
        for (const row of cats) {
          const parentRows = byParent.get(row.parentId) ?? []
          parentRows.push(row)
          byParent.set(row.parentId, parentRows)
        }

        function getDescendantIds(catId: number): number[] {
          const direct = byParent.get(catId) ?? []
          const ids: number[] = []
          for (const child of direct) {
            ids.push(child.id)
            ids.push(...getDescendantIds(child.id))
          }
          return ids
        }

        const roots: CategoryWithChildren[] = (byParent.get(null) ?? []).map((root) => ({
          id: root.id,
          name: root.name,
          allCategoryIds: [root.id, ...getDescendantIds(root.id)],
          children: (byParent.get(root.id) ?? []).map((item) => ({
            id: item.id,
            name: item.name,
            allCategoryIds: [item.id, ...getDescendantIds(item.id)],
            children: (byParent.get(item.id) ?? []).map((child) => ({
              id: child.id,
              name: child.name,
              allCategoryIds: [child.id, ...getDescendantIds(child.id)],
              children: [],
            })).sort((a, b) => a.name.localeCompare(b.name)),
          })).sort((a, b) => b.children.length - a.children.length),
        })).sort((a, b) => a.name.localeCompare(b.name))

        const excluded = [
          "composants informatique", "périphériques & accessoires",
          "accessoires téléphonie", "smartphone et mobile",
          "son", "console et jeux",
        ].map((n) => n.toLowerCase())
        const filtered = roots.filter((r) => !excluded.includes(r.name.toLowerCase()))
        setRootCategories(filtered)

        const listingStatsByProduct = new Map<number, { count: number; bestPrice: number | null; bestDiscount: number }>()
        for (const listing of rawListings) {
          if (listing.productId === null || listing.is_active === false) continue
          const current = listingStatsByProduct.get(listing.productId) ?? { count: 0, bestPrice: null, bestDiscount: 0 }
          current.count += 1
          if (listing.price !== null && listing.price > 0) {
            if (current.bestPrice === null || listing.price < current.bestPrice) {
              current.bestPrice = listing.price
              if (listing.old_price !== null && listing.old_price > listing.price) {
                current.bestDiscount = Math.round(((listing.old_price - listing.price) / listing.old_price) * 100)
              }
            }
          }
          listingStatsByProduct.set(listing.productId, current)
        }

        const showcase = rawProducts
          .map((product: { id: number; name: string; image_url: string | null; categoryId?: number | null }) => {
            const stats = listingStatsByProduct.get(product.id)
            return {
              id: product.id,
              name: product.name,
              imageUrl: product.image_url,
              offersCount: stats?.count ?? 0,
              bestPrice: stats?.bestPrice ?? null,
              discountPercent: stats?.bestDiscount ?? 0,
            }
          })
          .filter((p: ShowcaseProduct) => p.offersCount > 0)
          .sort((a: ShowcaseProduct, b: ShowcaseProduct) => b.offersCount - a.offersCount)

        if (!cancelled) {
          setProductsForShowcase(showcase)
          setLoading(false)
          homeWriteLs("b2c_home_showcase", showcase)
          homeWriteLs("b2c_home_cats", filtered)
          // Categories loaded
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <Spinner className="mx-auto mb-4 h-10 w-10" />
          <p className="text-sm text-muted-foreground">{t("general.loading")}</p>
        </div>
      </div>
    )
  }

  const heroFeatured = productsForShowcase.slice(0, 3)
  const featuredGrid = productsForShowcase.slice(0, 8)
  const bestDeals = [...productsForShowcase].sort((a, b) => b.discountPercent - a.discountPercent).slice(0, 6)
  const trendingGrid = productsForShowcase.slice(0, 8)
  const gamingGrid = productsForShowcase.filter((p) => matchesGaming(p.name)).slice(0, 4)

  return (
    <>
      {/* ─── Sticky Navigation ─── */}
      <section className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-8xl items-center px-4 py-2 sm:px-10">
          {rootCategories.length > 0 && (
            <NavigationMenu viewport={false} className="w-full max-w-none justify-start">
              <NavigationMenuList className="w-full justify-start gap-1">
                {rootCategories.slice(0, 8).map((category) => (
                  <NavigationMenuItem key={category.id} className="static">
                    <NavigationMenuTrigger className="h-9 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-slate-100">
                      {translateCategoryName(locale, category.name)}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent className="absolute left-0 top-full z-50 mt-1 w-screen max-w-300 rounded-xl border bg-white p-6 shadow-lg">
                      {category.children.length > 0 ? (
                        <div className="grid w-full grid-cols-1 gap-x-8 gap-y-6 pr-1 md:grid-cols-2 lg:grid-cols-4">
                          {category.children.map((item) => (
                            <div key={`${category.id}-${item.id}`} className="space-y-2">
                              <Link
                                href={`/B2C/products?categoryIds=${encodeURIComponent(item.allCategoryIds.join(","))}&categoryName=${encodeURIComponent(item.name)}`}
                                className="block text-sm font-semibold text-foreground transition-colors hover:text-orange-600"
                                onMouseEnter={() => prefetchCategory(item.allCategoryIds.join(","), locale)}
                              >
                                {translateCategoryName(locale, item.name)}
                              </Link>
                              {item.children.length > 0 && (
                                <>
                                  <Separator />
                                  <ul className="mt-2 space-y-1">
                                    {item.children.map((child) => (
                                      <li key={`${category.id}-${item.id}-${child.id}`}>
                                        <Link
                                          href={`/B2C/products?categoryIds=${encodeURIComponent(child.allCategoryIds.join(","))}&categoryName=${encodeURIComponent(child.name)}`}
                                          className="text-sm leading-6 text-muted-foreground transition-colors hover:text-orange-600"
                                          onMouseEnter={() => prefetchCategory(child.allCategoryIds.join(","), locale)}
                                        >
                                          {translateCategoryName(locale, child.name)}
                                        </Link>
                                      </li>
                                    ))}
                                  </ul>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">{t("category.no_subcategories")}</p>
                      )}
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                ))}
                {rootCategories.length > 8 && (
                  <NavigationMenuItem className="static">
                    <NavigationMenuTrigger className="h-9 rounded-lg px-3 text-sm font-medium">
                      <Menu className="h-4 w-4" />
                      <span className="ml-1.5">{t("nav.more")}</span>
                    </NavigationMenuTrigger>
                    <NavigationMenuContent className="absolute left-0 top-full z-50 mt-1 w-screen max-w-xs rounded-xl border bg-white p-4 shadow-lg">
                      <div className="space-y-1">
                        {rootCategories.slice(8).map((cat) => (
                          <Link
                            key={cat.id}
                            href={`/B2C/products?categoryIds=${encodeURIComponent(cat.id.toString())}&categoryName=${encodeURIComponent(cat.name)}`}
                            className="block rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100"
                            onMouseEnter={() => prefetchCategory(cat.id.toString(), locale)}
                          >
                            {translateCategoryName(locale, cat.name)}
                          </Link>
                        ))}
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                )}
              </NavigationMenuList>
            </NavigationMenu>
          )}
        </div>
      </section>

      <main className="mx-auto w-full max-w-8xl space-y-10 px-4 py-8 sm:px-10">
        {/* ─── Hero ─── */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/50">
          <div className="grid lg:grid-cols-[1.45fr_1fr]">
            <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-8 text-white lg:p-10">
              <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
              <div className="absolute -bottom-12 -left-12 h-56 w-56 rounded-full bg-orange-500/10 blur-3xl" />
              <div className="relative">
                <span className="inline-block rounded-full bg-orange-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-orange-300 backdrop-blur-sm">
                  {t("home.brand")}
                </span>
                <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                  {t("home.hero_title_line1")}
                  <br />
                  <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">{t("home.hero_title_line2")}</span>
                </h1>
                <p className="mt-4 max-w-lg text-base leading-7 text-slate-300">
                  {t("home.hero_description")}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button
                    asChild
                    className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-7 text-white shadow-lg shadow-orange-500/30 transition-all hover:from-orange-600 hover:to-amber-600 hover:shadow-orange-500/40"
                  >
                    <Link href="/B2C/products">
                      <ShoppingBag className="mr-1.5 h-4 w-4" />
                      {t("home.start_browsing")}
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="rounded-full border-white/20 bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20"
                  >
                    <Link href="/B2C/profile/plans">
                      <Sparkles className="mr-1.5 h-4 w-4" />
                      {t("home.premium_plans")}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {heroFeatured.map((product) => (
                <Link
                  key={product.id}
                  href={`/B2C/products/${product.id}`}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xs">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110"
                      />
                    ) : (
                      <ShoppingBag className="h-8 w-8 text-slate-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-800">{product.name}</p>
                    {product.bestPrice !== null ? (
                      <>
                        <p className="mt-1 text-base font-bold text-orange-600">{toMoney(product.bestPrice)}</p>
                        {product.discountPercent > 0 && (
                          <p className="text-xs font-medium text-emerald-600">-{product.discountPercent}% {t("home.off")}</p>
                        )}
                      </>
                    ) : (
                      <p className="mt-1 text-sm font-medium text-slate-400">
                        {product.offersCount > 0 ? t("detail.out_of_stock") : "-"}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition-colors group-hover:text-orange-500" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Featured Products ─── */}
        <section>
          <SectionHeader icon={Sparkles} label={t("home.featured")} href="/B2C/products" color="bg-amber-100" iconColor="text-amber-600" />
          {featuredGrid.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredGrid.map((product, i) => (
                <ProductTile key={product.id} product={product} priority={i < 4} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-white py-16 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-slate-200" />
              <p className="mt-3 text-sm text-muted-foreground">{t("home.no_products")}</p>
            </div>
          )}
        </section>

        {/* ─── Best Deals ─── */}
        <section className="rounded-2xl bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-6 shadow-sm ring-1 ring-orange-100/50">
          <SectionHeader icon={TicketPercent} label={t("home.best_deals")} href="/B2C/products?sort=discount" color="bg-orange-100" iconColor="text-orange-600" />
          {bestDeals.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {bestDeals.map((product) => (
                <ProductTile key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("home.no_deals")}</p>
          )}
        </section>

        {/* ─── Trending Now ─── */}
        <section>
          <SectionHeader icon={Flame} label={t("home.trending")} href="/B2C/products" color="bg-red-100" iconColor="text-red-500" />
          {trendingGrid.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {trendingGrid.map((product) => (
                <ProductTile key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-white py-16 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-slate-200" />
              <p className="mt-3 text-sm text-muted-foreground">{t("home.no_trending")}</p>
            </div>
          )}
          <div className="mt-8 text-center">
            <Button
              asChild
              className="h-12 rounded-full bg-gradient-to-r from-slate-800 to-slate-700 px-10 shadow-sm transition-all hover:from-slate-900 hover:to-slate-800"
            >
              <Link href="/B2C/products" className="inline-flex items-center gap-2 text-sm">
                {t("home.browse_all")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* ─── Gaming Zone ─── */}
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
          <SectionHeader icon={Gamepad2} label={t("home.gaming_zone")} color="bg-purple-100" iconColor="text-purple-600" />
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {gamingGrid.length > 0 ? (
                gamingGrid.map((product) => (
                  <ProductTile key={product.id} product={product} />
                ))
              ) : (
                  <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
                    {t("home.no_gaming")}
                  </p>
              )}
            </div>
            <aside className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-purple-800 to-indigo-700 p-7 text-white">
              <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
              <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-purple-400/10 blur-2xl" />
              <div className="relative">
                <Gamepad2 className="h-10 w-10 text-cyan-300" />
                <h3 className="mt-4 text-2xl font-bold leading-tight">{t("home.level_up")}</h3>
                <p className="mt-3 text-sm leading-6 text-cyan-50/80">
                  {t("home.gaming_description")}
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="mt-6 rounded-full border-white/25 bg-white/10 text-white shadow-xs backdrop-blur-sm transition-all hover:bg-white/20"
                >
                  <Link href="/B2C/products?search=gaming">
                    {t("home.explore_gaming")}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </aside>
          </div>
        </section>

        {/* ─── Footer ─── */}
        <footer className="border-t border-slate-200 pb-6 pt-8 text-center">
          <p className="text-xs text-slate-400">
            {t("home.footer_tagline")}
          </p>
        </footer>
      </main>
    </>
  )
}
