import Link from "next/link"
import Image from "next/image"
import { BadgePercent, Flame, Gamepad2, TicketPercent } from "lucide-react"

import { B2CNavbar } from "@/components/B2C/b2c-navbar"
import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { Separator } from "@/components/ui/separator"
import { getRawCategories } from "@/services/admin/categories"
import { getProductListings } from "@/services/admin/product-listings"
import { getProducts } from "@/services/admin/products"

type RootCategory = {
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

type ShowcaseProduct = {
  id: number
  name: string
  imageUrl: string | null
  offersCount: number
  bestPrice: number | null
  discountPercent: number
}

function buildRootCategories(
  rows: Array<{ id: number; name: string; parentId: number | null }>
): RootCategory[] {
  const byParent = new Map<
    number | null,
    Array<{ id: number; name: string; parentId: number | null }>
  >()

  for (const row of rows) {
    const parentRows = byParent.get(row.parentId) ?? []
    parentRows.push(row)
    byParent.set(row.parentId, parentRows)
  }

  const roots = byParent.get(null) ?? []

  function getDescendantIds(categoryId: number): number[] {
    const directChildren = byParent.get(categoryId) ?? []
    const descendants: number[] = []

    for (const child of directChildren) {
      descendants.push(child.id)
      descendants.push(...getDescendantIds(child.id))
    }

    return descendants
  }

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

function toMoney(value: number | null): string {
  if (value === null) {
    return "-"
  }

  return `${value.toFixed(2)} DT`
}

function ProductTile({ product }: { product: ShowcaseProduct }) {
  return (
    <article className="group rounded-xl border bg-white p-3 shadow-sm transition-transform hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <span className="rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          -{product.discountPercent}%
        </span>
        <span className="text-[10px] text-muted-foreground">{product.offersCount} offers</span>
      </div>

      <div className="mt-2 flex h-28 items-center justify-center overflow-hidden rounded-lg border bg-[#f7f9ff]">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={224}
            height={112}
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <span className="text-xs text-muted-foreground">No image</span>
        )}
      </div>

      <h4 className="mt-3 line-clamp-2 min-h-10 text-sm font-medium text-slate-900">{product.name}</h4>
      <p className="mt-2 text-lg font-semibold text-orange-600">{toMoney(product.bestPrice)}</p>

      <Button asChild size="sm" className="mt-3 h-8 w-full rounded-full text-xs">
        <Link href={`/B2C/products/${product.id}`}>View product</Link>
      </Button>
    </article>
  )
}

export default async function Page() {
  let rootCategories: RootCategory[] = []
  let productsForShowcase: ShowcaseProduct[] = []

  try {
    const categories = await getRawCategories()
    rootCategories = buildRootCategories(categories)
  } catch {
    rootCategories = []
  }

  try {
    const [products, listings] = await Promise.all([getProducts(), getProductListings()])

    const listingStatsByProduct = new Map<number, { count: number; bestPrice: number | null }>()
    for (const listing of listings) {
      if (listing.productId === null) {
        continue
      }

      const current = listingStatsByProduct.get(listing.productId) ?? { count: 0, bestPrice: null }
      current.count += 1

      if (listing.price !== null) {
        if (current.bestPrice === null || listing.price < current.bestPrice) {
          current.bestPrice = listing.price
        }
      }

      listingStatsByProduct.set(listing.productId, current)
    }

    productsForShowcase = products
      .map((product) => {
        const stats = listingStatsByProduct.get(product.id)
        const discountPercent = ((product.id * 7) % 31) + 5

        return {
          id: product.id,
          name: product.name,
          imageUrl: product.image_url,
          offersCount: stats?.count ?? 0,
          bestPrice: stats?.bestPrice ?? null,
          discountPercent,
        }
      })
      .filter((product) => product.offersCount > 0)
      .sort((a, b) => b.offersCount - a.offersCount)
  } catch {
    productsForShowcase = []
  }

  const favoriteNow = productsForShowcase.slice(0, 4)
  const bestDeals = [...productsForShowcase]
    .sort((a, b) => {
      if (a.bestPrice === null && b.bestPrice === null) return 0
      if (a.bestPrice === null) return 1
      if (b.bestPrice === null) return -1
      return a.bestPrice - b.bestPrice
    })
    .slice(0, 6)
  const bestSellers = productsForShowcase.slice(4, 10)
  const gamingPicks = productsForShowcase
    .filter((product) => /game|gaming|xbox|playstation|gpu|headset|keyboard|mouse/i.test(product.name))
    .slice(0, 4)

  return (
    <div className="min-h-svh bg-[#eef2f7]">
      <style>{`
        @keyframes scroll-right-to-left {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .scroll-text {
          animation: scroll-right-to-left 15s linear infinite;
          white-space: nowrap;
        }
      `}</style>

      <div className="overflow-hidden bg-muted px-6 py-2">
        <p className="scroll-text text-sm text-muted-foreground">
          Discover the latest product trends and market insights in real-time • Track price
          movements and competitor strategies • Make data-driven decisions with ProductRadar
        </p>
      </div>

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
                                      <li
                                        key={`${category.id}-${item.id}-${child.id}`}
                                        className="text-sm leading-6"
                                      >
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
                                <p className="mt-2 text-sm text-muted-foreground">
                                  No child categories
                                </p>
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

      <main className="mx-auto w-full max-w-8xl space-y-7 px-4 py-8 sm:px-10">
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Flame className="h-4 w-4 text-orange-500" />
            Produits favoris
          </div>
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {(favoriteNow.length > 0 ? favoriteNow : productsForShowcase.slice(0, 4)).map((product) => (
                <ProductTile key={product.id} product={product} />
              ))}
            </div>
            <aside className="relative overflow-hidden rounded-2xl bg-linear-to-br from-emerald-700 via-emerald-600 to-lime-500 p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
                Weekly Spotlight
              </p>
              <h3 className="mt-2 text-2xl font-semibold leading-tight">
                Give your garden the attention it deserves.
              </h3>
              <p className="mt-2 text-sm text-emerald-50/90">
                Discover smart outdoor tools and best-rated seasonal picks from our partners.
              </p>
              <Button asChild className="mt-5 h-9 rounded-full bg-white px-4 text-emerald-700 hover:bg-emerald-50">
                <Link href="/B2C/products">Shop now</Link>
              </Button>
            </aside>
          </div>
        </section>

        <section className="rounded-2xl border bg-[#dce7f4] p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <BadgePercent className="h-4 w-4 text-blue-700" />
            Nos meilleurs bons plans
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {(bestDeals.length > 0 ? bestDeals : productsForShowcase.slice(0, 6)).map((product) => (
              <ProductTile key={product.id} product={product} />
            ))}
          </div>
          <div className="mt-4 text-center">
            <Button asChild className="h-9 rounded-full px-5">
              <Link href="/B2C/products">Plus de bons plans</Link>
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">
            Recevez des offres, promotions et actualites ProductRadar par e-mail
          </p>
          <Button asChild variant="outline" className="mt-3 h-9 rounded-full px-5">
            <Link href="/B2C/profile/alerts">S&apos;inscrire aux alertes</Link>
          </Button>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <TicketPercent className="h-4 w-4 text-indigo-600" />
            Decouvrez les n1 des ventes
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {(bestSellers.length > 0 ? bestSellers : productsForShowcase.slice(0, 6)).map((product) => (
              <ProductTile key={product.id} product={product} />
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Gamepad2 className="h-4 w-4 text-purple-600" />
            Les indispensables gaming
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {(gamingPicks.length > 0 ? gamingPicks : productsForShowcase.slice(0, 4)).map((product) => (
                <ProductTile key={product.id} product={product} />
              ))}
            </div>
            <aside className="relative overflow-hidden rounded-2xl bg-linear-to-br from-blue-900 via-indigo-700 to-cyan-500 p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">Gaming Focus</p>
              <h3 className="mt-2 text-2xl font-semibold leading-tight">Performance gear for serious players.</h3>
              <p className="mt-2 text-sm text-cyan-50/90">
                Build your setup with top-value components and accessories selected from active deals.
              </p>
              <Button asChild className="mt-5 h-9 rounded-full bg-white px-4 text-blue-800 hover:bg-cyan-50">
                <Link href="/B2C/products">Explore gaming</Link>
              </Button>
            </aside>
          </div>
        </section>
      </main>
    </div>
  )
}