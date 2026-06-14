"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import type { B2BBannerCampaign } from "@/types/b2b"
import {
  ArrowRight,
  BarChart3,
  Bell,
  ChevronDown,
  ChevronRight,
  Flame,
  Gamepad2,
  Menu,
  ShoppingBag,
  Sparkles,
  Star,
  TicketPercent,
  Trophy,
  type LucideIcon,
} from "lucide-react"

import { useApiUrl } from "@/lib/use-api-url"
import { useI18n } from "@/lib/i18n-context"
import { translateCategoryName } from "@/lib/category-translations"
import BannerCarousel from "./banner-carousel"

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
  brand: string | null
  offersCount: number
  bestPrice: number | null
  discountPercent: number
}

type SponsoredProduct = {
  id: number
  listing_id: number
  product_id: number
  product_name: string
  product_image: string | null
  product_brand: string | null
  price: number | null
  seller_name: string | null
  seller_id: number | null
  in_stock: boolean
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

// ─── Logo Configuration (logo.dev) ───────────────────────────────────────────────
const LOGO_DEV_PUBLIC_KEY = process.env.NEXT_PUBLIC_LOGO_DEV_KEY || 'pk_RNnnRFTeTLerEF502SvlPg'

/** Map of brand/seller name (lowercase) → domain */
const BRAND_DOMAIN_MAP: Record<string, string> = {
  msi: "msi.com",
  apple: "apple.com",
  lenovo: "lenovo.com",
  asus: "asus.com",
  samsung: "samsung.com",
  hp: "hp.com",
  dell: "dell.com",
  xiaomi: "xiaomi.com",
  jbl: "jbl.com",
  redragon: "redragon.com",
  gigabyte: "gigabyte.com",
  infinix: "infinixmobiles.com",
  "d-link": "dlink.com",
  havit: "havit.com",
  "white shark": "whitesharkgaming.com",
  hoco: "hoco.com",
  sony: "sony.com",
  lg: "lg.com",
  acer: "acer.com",
  logitech: "logitech.com",
  corsair: "corsair.com",
  razer: "razer.com",
  intel: "intel.com",
  amd: "amd.com",
  nvidia: "nvidia.com",
  microsoft: "microsoft.com",
  huawei: "huawei.com",
}

/** Premium partner sellers with their website domains */
const SELLER_CONFIG: { name: string; domain: string; color: string }[] = [
  { name: "Gamershop", domain: "gamershop.tn", color: "from-red-500 to-rose-600" },
  { name: "iStore", domain: "istore.com.tn", color: "from-slate-700 to-slate-900" },
  { name: "L'Officiel", domain: "lofficielshop.tn", color: "from-amber-500 to-orange-600" },
  { name: "Mytek", domain: "mytek.tn", color: "from-blue-500 to-indigo-600" },
  { name: "Tunisianet", domain: "tunisianet.com.tn", color: "from-emerald-500 to-teal-600" },
]

/** Logo component using logo.dev */
function CompanyLogo({
  name, domain, fallbackGradient = "from-slate-600 to-slate-700", size = "h-14 w-14", bgSize = "p-2"
}: {
  name: string
  domain?: string
  fallbackGradient?: string
  size?: string
  bgSize?: string
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className={`flex ${size} items-center justify-center rounded-2xl shadow-sm overflow-hidden ${domain && !imgError ? `bg-white ${bgSize}` : `bg-gradient-to-br ${fallbackGradient}`}`}>
      {domain && !imgError ? (
        <img
          src={`https://img.logo.dev/${domain}?token=${LOGO_DEV_PUBLIC_KEY}`}
          alt={name}
          className="h-full w-full object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-sm font-bold text-white">{name.charAt(0).toUpperCase()}</span>
      )}
    </div>
  )
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

/** Collapsible section: Premium Partners */
function PremiumPartnersSection({
  sellers,
}: {
  sellers: { id: number; name: string }[]
}) {
  const [open, setOpen] = useState(false)

  // Match DB sellers to SELLER_CONFIG by name (case-insensitive)
  const matchedSellers = SELLER_CONFIG.filter((cfg) =>
    sellers.some((s) => s.name.toLowerCase().includes(cfg.name.toLowerCase().replace("'", "")) ||
      cfg.name.toLowerCase().includes(s.name.toLowerCase()))
  )
  // Fall back to raw sellers if no matches
  const displaySellers = matchedSellers.length > 0 ? matchedSellers : sellers.slice(0, 5).map((s) => ({
    name: s.name,
    domain: undefined as string | undefined,
    color: "from-slate-600 to-slate-700",
  }))

  if (displaySellers.length === 0) return null

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-sm">
      {/* Clickable header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-slate-50/80"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100">
            <Trophy className="h-5 w-5 text-amber-600" />
          </div>
          <div className="text-left">
            <p className="text-base font-bold tracking-tight text-slate-900">Nos partenaires premium</p>
            <p className="text-xs text-muted-foreground">Offres exclusives de nos partenaires officiels</p>
          </div>
        </div>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white shadow-xs transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </div>
      </button>

      {/* Expandable content */}
      {open && (
        <div className="border-t border-slate-100 px-6 pb-6 pt-5 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {displaySellers.map((cfg) => {
              const rawSeller = sellers.find((s) =>
                s.name.toLowerCase().includes(cfg.name.toLowerCase().replace("'", "")) ||
                cfg.name.toLowerCase().includes(s.name.toLowerCase())
              )
              const searchName = rawSeller?.name ?? cfg.name
              return (
                <Link
                  key={cfg.name}
                  href={`/B2C/products?search=${encodeURIComponent(searchName)}`}
                  className="group flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:-translate-y-1 hover:border-amber-300 hover:shadow-md"
                >
                  <CompanyLogo
                    name={cfg.name}
                    domain={"domain" in cfg ? (cfg as { domain?: string }).domain : undefined}
                    fallbackGradient={cfg.color}
                    size="h-16 w-16"
                    bgSize="p-2.5"
                  />
                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-800 group-hover:text-amber-600 transition-colors">{cfg.name}</p>
                    <p className="mt-0.5 text-[10px] font-medium text-amber-500">Voir les offres →</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

export default function ClientHomePage() {
  const apiUrl = useApiUrl()
  const { locale, t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [rootCategories, setRootCategories] = useState<CategoryWithChildren[]>([])
  const [productsForShowcase, setProductsForShowcase] = useState<ShowcaseProduct[]>([])
  const [sponsoredProducts, setSponsoredProducts] = useState<SponsoredProduct[]>([])
  const [banners, setBanners] = useState<B2BBannerCampaign[]>([])
  const [popularBrands, setPopularBrands] = useState<{ id: number; name: string; product_count: number }[]>([])
  const [sellers, setSellers] = useState<{ id: number; name: string }[]>([])

  const homeCacheLoadedRef = useRef(false)

  useEffect(() => {
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
        const [catsRes, prodsRes, listRes, sponsoredRes, bannersRes] = await Promise.all([
          homeCachedFetch(apiUrl("/api/categories")),
          homeCachedFetch(apiUrl("/api/products?limit=200")),
          homeCachedFetch(apiUrl("/api/product-listings")),
          homeCachedFetch(apiUrl("/api/b2c/sponsored-products")),
          fetch("/api/b2c/banners").then((r) => r.json()).catch(() => ({ items: [] })),
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
          .map((product: { id: number; name: string; image_url: string | null; brand?: string | null; categoryId?: number | null }) => {
            const stats = listingStatsByProduct.get(product.id)
            return {
              id: product.id,
              name: product.name,
              imageUrl: product.image_url,
              brand: product.brand ?? null,
              offersCount: stats?.count ?? 0,
              bestPrice: stats?.bestPrice ?? null,
              discountPercent: stats?.bestDiscount ?? 0,
            }
          })
          .filter((p: ShowcaseProduct) => p.offersCount > 0)
          .sort((a: ShowcaseProduct, b: ShowcaseProduct) => b.offersCount - a.offersCount)

        const sponsoredRaw: any = sponsoredRes ?? { items: [] }
        const sponsored: SponsoredProduct[] = (sponsoredRaw.items ?? [])
          .filter((s: any) => s.in_stock !== false)
          .slice(0, 10)

        if (!cancelled) {
          setProductsForShowcase(showcase)
          setSponsoredProducts(sponsored)
          setBanners((bannersRes as { items?: B2BBannerCampaign[] })?.items ?? [])
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
    // Fetch brands from brand table
    homeCachedFetch(apiUrl("/api/brands")).then((data) => {
      if (!cancelled && Array.isArray(data)) {
        const BLACKLIST = new Set([
          "generic", "reseller_blacklist", "tunisianet", "gamershop", "myteck",
          "tunisia net", "gamershop tunisie", "myteck tunisie", "unknown",
        ])
        const filtered = data
          .filter((b: any) => {
            const name = (b.name ?? "").toLowerCase().trim()
            return !BLACKLIST.has(name) && b.product_count > 0
          })
          .slice(0, 16)
        setPopularBrands(filtered)
      }
    }).catch(() => {})
    // Fetch sellers for premium partners section
    homeCachedFetch(apiUrl("/api/sellers")).then((data) => {
      if (!cancelled && Array.isArray(data)) {
        setSellers(data.slice(0, 12))
      }
    }).catch(() => {})
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
  const trendingGrid = [...productsForShowcase]
    .sort((a, b) => (b.offersCount * (1 + b.discountPercent / 100)) - (a.offersCount * (1 + a.discountPercent / 100)))
    .slice(0, 8)
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

        {/* ─── Banner Ads ─── */}
        {banners.length > 0 && (
          <section>
            <BannerCarousel banners={banners} />
          </section>
        )}

        {/* ─── Popular Brands (with Brandfetch real logos) ─── */}
        {popularBrands.length > 0 && (
          <section>
            <SectionHeader icon={Star} label={t("home.popular_brands")} color="bg-purple-100" iconColor="text-purple-600" />
            <p className="-mt-3 mb-5 text-xs text-muted-foreground">Discover the most followed brands on ProductRadar.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {popularBrands.map((brand) => {
                const domain = BRAND_DOMAIN_MAP[brand.name.toLowerCase().trim()]
                return (
                  <Link
                    key={brand.id}
                    href={`/B2C/products?search=${encodeURIComponent(brand.name)}`}
                    className="group flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-md"
                  >
                    <CompanyLogo
                      name={brand.name}
                      domain={domain}
                      fallbackGradient="from-purple-500 to-indigo-600"
                      size="h-14 w-14"
                      bgSize="p-2"
                    />
                    <span className="line-clamp-1 text-center text-xs font-medium text-slate-700 group-hover:text-purple-600">{brand.name}</span>
                    <span className="text-[10px] text-muted-foreground">{brand.product_count.toLocaleString("en-US")} produits</span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ─── Premium Partners ─── */}
        {sellers.length > 0 && (
          <PremiumPartnersSection sellers={sellers} />
        )}

        {/* ─── Sponsored Products (Recommended for you) ─── */}
        {sponsoredProducts.length > 0 && (
          <section>
            <SectionHeader icon={Star} label={t("home.sponsored")} color="bg-amber-100" iconColor="text-amber-600" />
            <div className="flex gap-4 overflow-x-auto pb-2">
              {sponsoredProducts.map((sp) => (
                <Link
                  key={sp.id}
                  href={`/B2C/products/${sp.product_id}`}
                  className="group flex min-w-[230px] max-w-[230px] shrink-0 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-300 hover:shadow-md"
                >
                  <div className="relative mb-3 flex h-44 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {sp.product_image ? (
                      <Image
                        src={sp.product_image}
                        alt={sp.product_name}
                        width={230}
                        height={176}
                        className="h-full w-full object-contain p-3 transition-all duration-500 group-hover:scale-110"
                        unoptimized
                      />
                    ) : (
                      <ShoppingBag className="h-12 w-12 text-slate-200" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between gap-1.5">
                    <h3 className="line-clamp-2 text-sm font-medium leading-snug text-slate-800">{sp.product_name}</h3>
                    {sp.price !== null && sp.price > 0 && (
                      <p className="text-lg font-bold text-orange-600">{toMoney(sp.price)}</p>
                    )}
                    {sp.seller_name && (
                      <p className="truncate text-xs font-medium text-slate-400">{sp.seller_name}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ─── Featured Products ─── */}
        <section>
          <SectionHeader icon={Sparkles} label={t("home.featured")} href="/B2C/products" color="bg-amber-100" iconColor="text-amber-600" />
          <p className="-mt-3 mb-5 text-xs text-muted-foreground">{t("home.featured_explanation")}</p>
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
          <SectionHeader icon={Flame} label={t("home.trending")} href="/B2C/products?sort=trending" color="bg-red-100" iconColor="text-red-500" />
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
        <footer className="border-t border-slate-200 pt-10 pb-6">
          {/* About section - top */}
          <div className="mb-8 rounded-2xl bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm ring-1 ring-slate-200/50">
            <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
                  <ShoppingBag className="h-5 w-5 text-orange-500" />
                  ProductRadar
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {t("home.hero_description")}
                </p>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-bold tracking-tight text-slate-900">Service client</h4>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li><Link href="/B2C/contact-us" className="transition-colors hover:text-orange-600">Contactez-nous</Link></li>
                  <li><Link href="/B2C/contact-us" className="transition-colors hover:text-orange-600">Aide / FAQ</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-bold tracking-tight text-slate-900">Découvrir</h4>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li><Link href="/B2C/products" className="transition-colors hover:text-orange-600">Tous les produits</Link></li>
                  <li><Link href="/B2C/products?sort=discount" className="transition-colors hover:text-orange-600">Meilleures offres</Link></li>
                  <li><Link href="/B2C/products?sort=trending" className="transition-colors hover:text-orange-600">Tendances</Link></li>
                  <li><Link href="/B2C/contact-us?section=marques" className="transition-colors hover:text-orange-600">Marques populaires</Link></li>
                  <li><Link href="/B2C/contact-us?section=paiement" className="transition-colors hover:text-orange-600">Abonnements Premium</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-bold tracking-tight text-slate-900">Fonctionnalités</h4>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li className="flex items-center gap-1.5"><Bell className="h-3.5 w-3.5" /> Alertes de prix</li>
                  <li className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Historique des prix</li>
                  <li className="flex items-center gap-1.5"><ShoppingBag className="h-3.5 w-3.5" /> Comparaison d'offres</li>
                  <li className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5" /> Favoris et watchlist</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Separator */}
          <Separator className="mb-8" />

          {/* Bottom links */}
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <div>
              <h4 className="mb-3 text-sm font-bold tracking-tight text-slate-900">Service client</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link href="/B2C/contact-us" className="transition-colors hover:text-orange-600">Contactez-nous</Link></li>
                <li><Link href="/B2C/contact-us" className="transition-colors hover:text-orange-600">Aide</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-bold tracking-tight text-slate-900">Marques</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link href="/B2C/contact-us?section=marques" className="transition-colors hover:text-orange-600">Marques populaires</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-bold tracking-tight text-slate-900">Promotions</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link href="/B2C/products?sort=discount" className="transition-colors hover:text-orange-600">Meilleures offres</Link></li>
                <li><Link href="/B2C/products?sort=trending" className="transition-colors hover:text-orange-600">Tendances</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-bold tracking-tight text-slate-900">Paiement</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link href="/B2C/profile/plans" className="transition-colors hover:text-orange-600">Abonnements</Link></li>
                <li><Link href="/B2C/contact-us?section=paiement" className="transition-colors hover:text-orange-600">Plans et tarifs</Link></li>
              </ul>
            </div>
          </div>
          <Separator className="my-6" />
          <p className="text-center text-xs text-slate-400">
            {t("home.footer_tagline")}
          </p>
        </footer>
      </main>
    </>
  )
}
