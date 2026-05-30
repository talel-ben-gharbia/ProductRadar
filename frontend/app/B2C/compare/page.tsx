"use client"

import Link from "next/link"
import { Fragment, useEffect, useMemo, useState } from "react"
import {
  Award,
  BarChart3,
  Battery,
  Camera,
  ChevronRight,
  Cpu,
  Eye,
  Monitor,
  Smartphone,
  Trash2,
  Weight,
  X,
} from "lucide-react"

import { B2CNavbar } from "@/components/B2C/b2c-navbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useApiUrl } from "@/lib/use-api-url"
import { useI18n } from "@/lib/i18n-context"
import { useCompare } from "@/lib/compare-context"
import { normalizeSpecs } from "@/utils/specs"
import type { CanonicalSpecs, Product, ProductListing } from "@/utils/types"
import { SPEC_LABELS } from "@/utils/types"

type CompareProduct = {
  product: Product
  specs: CanonicalSpecs
  bestPrice: number | null
  offersCount: number
  discountPercent: number
  sellers: string[]
}

type SpecGroup = {
  label: string
  icon: React.ReactNode
  keys: (keyof CanonicalSpecs)[]
}

function toMoney(value: number | null): string {
  if (value === null) return "—"
  return `${value.toFixed(3)} DT`
}

function EmptyState() {
  const { t } = useI18n()
  return (
    <div className="relative flex min-h-[70vh] items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,146,60,0.06),transparent_70%)]" />
      <div className="relative z-10 mx-auto max-w-md px-4 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 ring-1 ring-orange-200/50">
          <BarChart3 className="h-10 w-10 text-orange-400" />
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">{t("compare.empty_title")}</h1>
        <p className="mb-8 text-sm leading-relaxed text-slate-500">
          {t("compare.empty_desc")}
        </p>
        <Link href="/B2C/products">
          <Button className="h-11 rounded-xl bg-orange-500 px-8 text-sm font-medium shadow-sm shadow-orange-200 transition-all hover:bg-orange-600 hover:shadow-md hover:shadow-orange-200">
            {t("compare.browse")}
          </Button>
        </Link>
      </div>
    </div>
  )
}

function LoadingSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" style={count < 3 ? { maxWidth: count * 380, marginLeft: 0 } : {}}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden rounded-2xl border shadow-sm">
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-7 w-28" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
            <Skeleton className="h-9 w-full rounded-xl" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function SpecValue({ value, isBest }: { value: string | undefined; isBest: boolean }) {
  if (!value) return <span className="text-slate-300">—</span>

  return (
    <span className={`text-sm ${isBest ? "font-semibold text-slate-900" : "text-slate-600"}`}>
      {value}
    </span>
  )
}

export default function ComparePage() {
  const apiUrl = useApiUrl()
  const { t } = useI18n()
  const { comparedIds, removeFromCompare, clearCompare } = useCompare()

  const SPEC_GROUPS: SpecGroup[] = [
    { label: t("compare.performance"), icon: <Cpu className="h-3.5 w-3.5" />, keys: ["cpu", "ram", "gpu", "storage"] },
    { label: t("compare.display"), icon: <Monitor className="h-3.5 w-3.5" />, keys: ["screen", "resolution", "panel", "refresh"] },
    { label: t("compare.camera"), icon: <Camera className="h-3.5 w-3.5" />, keys: ["camera"] },
    { label: t("compare.battery_power"), icon: <Battery className="h-3.5 w-3.5" />, keys: ["battery"] },
    { label: t("compare.dimensions"), icon: <Smartphone className="h-3.5 w-3.5" />, keys: ["weight", "color", "water"] },
    { label: t("compare.system"), icon: <Cpu className="h-3.5 w-3.5" />, keys: ["os"] },
  ]
  const [data, setData] = useState<CompareProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (comparedIds.length === 0) {
      setData([])
      setLoading(false)
      return
    }

    async function load() {
      try {
        const [productsRes, listingsRes] = await Promise.all([
          fetch(apiUrl(`/api/products?ids=${encodeURIComponent(comparedIds.join(","))}`)),
          fetch(apiUrl(`/api/product-listings`)),
        ])
        const products: Product[] = await productsRes.json()
        const listings: ProductListing[] = await listingsRes.json()

        const compared: CompareProduct[] = comparedIds.map((id) => {
          const product = products.find((p) => p.id === id)
          const rawSpecs = product?.specs_json ?? null
          const specs = normalizeSpecs(rawSpecs)

          const relevantListings = listings.filter(
            (l) => l.productId === id && l.is_active !== false && l.availability !== false && l.price !== null && l.price > 0
          )
          const sorted = [...relevantListings].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
          const best = sorted[0]
          const sellers = [...new Set(relevantListings.map((l) => l.sellerName).filter(Boolean))] as string[]
          let discount = 0
          if (best?.price && best?.old_price && best.old_price > best.price) {
            discount = Math.round(((best.old_price - best.price) / best.old_price) * 100)
          }

          return {
            product: product ?? { id, name: t("compare.unknown_product"), brand: null, description: "", image_url: null, categoryId: null },
            specs,
            bestPrice: best?.price ?? null,
            offersCount: relevantListings.length,
            discountPercent: discount,
            sellers,
          }
        })
        setData(compared)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [comparedIds])

  const bestPriceIdx = useMemo(() => {
    if (data.length < 2) return -1
    const prices = data.map((d) => d.bestPrice)
    const valid = prices.filter((p): p is number => p !== null)
    if (valid.length === 0) return -1
    const min = Math.min(...valid)
    return prices.indexOf(min)
  }, [data])

  const maxPrice = useMemo(() => {
    const valid = data.map((d) => d.bestPrice).filter((p): p is number => p !== null)
    return valid.length > 0 ? Math.max(...valid) : 0
  }, [data])

  if (comparedIds.length === 0) {
    return (
      <div className="min-h-svh bg-slate-50">
        <B2CNavbar />
        <EmptyState />
      </div>
    )
  }

  const gridCols = data.length === 1
    ? "md:grid-cols-1 max-w-sm mx-auto"
    : data.length === 2
      ? "md:grid-cols-2 max-w-2xl mx-auto"
      : "md:grid-cols-2 lg:grid-cols-3"

  return (
    <div className="min-h-svh bg-slate-50">
      <B2CNavbar />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs text-slate-400">
          <Link href="/B2C/products" className="transition-colors hover:text-orange-500">
            {t("general.products")}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-slate-600">{t("compare.title")}</span>
        </div>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t("compare.title")}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {comparedIds.length} {comparedIds.length > 1 ? t("compare.products") + "s" : t("compare.products")}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearCompare}
              className="h-9 rounded-xl border-slate-200 text-xs text-slate-500 hover:text-red-500"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {t("compare.clear")}
            </Button>
            <Link href="/B2C/products">
              <Button variant="ghost" size="sm" className="h-9 rounded-xl text-xs text-slate-500">
                {t("compare.add")}
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton count={comparedIds.length} />
        ) : (
          <div className="space-y-10">
            {/* ============================== */}
            {/* PRODUCT CARDS                  */}
            {/* ============================== */}
            <section>
              <div className={`grid grid-cols-1 gap-5 ${gridCols}`}>
                {data.map((item, idx) => (
                  <Card
                    key={item.product.id}
                    className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-200 hover:shadow-md ${
                      bestPriceIdx === idx
                        ? "border-orange-300 shadow-sm shadow-orange-100"
                        : "border-slate-200"
                    }`}
                  >
                    <button
                      onClick={() => removeFromCompare(item.product.id)}
                      className="absolute right-2.5 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-slate-400 opacity-0 shadow-xs backdrop-blur-xs transition-all hover:bg-white hover:text-red-500 group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>

                    <div className="relative flex aspect-[4/3] items-center justify-center bg-gradient-to-b from-slate-50 p-6">
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="h-full w-full object-contain transition-all duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <Smartphone className="h-12 w-12 text-slate-200" />
                      )}
                      {bestPriceIdx === idx && (
                        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                          <Award className="h-3 w-3" />
                          {t("compare.best_price")}
                        </div>
                      )}
                      {item.discountPercent > 0 && (
                        <div className="absolute right-2.5 top-2.5 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                          -{item.discountPercent}%
                        </div>
                      )}
                    </div>

                    <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-3">
                      <div>
                        {item.product.brand && (
                          <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                            {item.product.brand}
                          </p>
                        )}
                        <Link
                          href={`/B2C/products/${item.product.id}`}
                          className="line-clamp-2 text-sm font-medium leading-snug text-slate-900 transition-colors hover:text-orange-600"
                        >
                          {item.product.name}
                        </Link>
                      </div>

                      <div className="flex items-baseline gap-1">
                        {item.bestPrice !== null ? (
                          <>
                            <span className="text-2xl font-bold tracking-tight text-slate-900">
                              {item.bestPrice.toFixed(3)}
                            </span>
                            <span className="text-sm text-slate-400">DT</span>
                          </>
                        ) : (
                          <span className="text-sm text-slate-400">{t("compare.no_price")}</span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                          {item.offersCount} {item.offersCount > 1 ? t("compare.offers") + "s" : t("compare.offers")}
                        </span>
                        {item.sellers.length > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-0.5 text-[11px] text-slate-500">
                            {item.sellers[0]}
                            {item.sellers.length > 1 ? ` +${item.sellers.length - 1}` : ""}
                          </span>
                        )}
                      </div>

                      <div className="mt-auto pt-1">
                        <Link href={`/B2C/products/${item.product.id}`}>
                          <Button
                            variant={bestPriceIdx === idx ? "default" : "outline"}
                            className={`h-9 w-full rounded-xl text-xs font-medium transition-all ${
                              bestPriceIdx === idx
                                ? "bg-orange-500 text-white shadow-xs shadow-orange-200 hover:bg-orange-600"
                                : "border-slate-200 text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                            }`}
                          >
                            {t("compare.view_offers")}
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* ============================== */}
            {/* PRICE COMPARISON               */}
            {/* ============================== */}
            {data.length >= 2 && (
              <section>
                <div className="mb-5 flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-slate-400" />
                  <h2 className="text-sm font-semibold text-slate-700">{t("compare.price_comparison")}</h2>
                </div>

                <div className="space-y-3">
                  {data.map((item, idx) => {
                    if (item.bestPrice === null || maxPrice === 0) return null
                    const ratio = item.bestPrice / maxPrice
                    const savings = bestPriceIdx >= 0 && data[bestPriceIdx].bestPrice !== null
                      ? item.bestPrice - data[bestPriceIdx].bestPrice!
                      : 0

                    return (
                      <div
                        key={item.product.id}
                        className={`rounded-xl border px-5 py-4 ${
                          bestPriceIdx === idx
                            ? "border-orange-200 bg-orange-50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="mb-2.5 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${
                                bestPriceIdx === idx
                                  ? "bg-orange-500 text-white"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <span className="truncate text-sm text-slate-700">
                              {item.product.brand ? `${item.product.brand} — ` : ""}
                              {item.product.name}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-baseline gap-1">
                            <span className={`text-xl font-bold ${bestPriceIdx === idx ? "text-orange-600" : "text-slate-800"}`}>
                              {item.bestPrice.toFixed(3)}
                            </span>
                            <span className="text-xs text-slate-400">DT</span>
                          </div>
                        </div>

                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              bestPriceIdx === idx ? "bg-orange-400" : "bg-slate-300"
                            }`}
                            style={{ width: `${Math.max((1 - ratio + 0.15) * 100, 4)}%` }}
                          />
                        </div>

                        {bestPriceIdx === idx ? (
                          <p className="mt-1.5 text-[11px] font-medium text-emerald-600">
                            {t("compare.best_price")} &mdash; {t("compare.save_up_to")}{" "}
                            {data
                              .filter((d) => d.bestPrice !== null)
                              .reduce((max, d) => {
                                const diff = (d.bestPrice ?? 0) - (item.bestPrice ?? 0)
                                return diff > max ? diff : max
                              }, 0)
                              .toFixed(3)}{" "}
                            DT
                          </p>
                        ) : (
                          <p className="mt-1.5 text-[11px] text-slate-400">
                            +{savings.toFixed(3)} DT {t("compare.more_expensive")}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* ============================== */}
            {/* SPECS COMPARISON               */}
            {/* ============================== */}
            {data.some((d) => Object.keys(d.specs).length > 0) && (
              <section>
                <div className="mb-5 flex items-center gap-3">
                  <Monitor className="h-5 w-5 text-slate-400" />
                  <h2 className="text-sm font-semibold text-slate-700">{t("compare.specs")}</h2>
                  <span className="text-[11px] text-slate-400">
                    {data.reduce((max, d) => Math.max(max, Object.keys(d.specs).length), 0)} {data.reduce((max, d) => Math.max(max, Object.keys(d.specs).length), 0) > 1 ? t("compare.specifications") + "s" : t("compare.specifications")}
                  </span>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-slate-100 bg-slate-50/50">
                          <TableHead className="w-44 px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            {t("compare.spec")}
                          </TableHead>
                          {data.map((item, idx) => (
                            <TableHead key={item.product.id} className="px-5 py-3.5">
                              <span className={`text-[11px] font-semibold uppercase tracking-wider ${
                                bestPriceIdx === idx ? "text-orange-600" : "text-slate-400"
                              }`}>
                                {item.product.brand ?? t("compare.product_n", { n: idx + 1 })}
                              </span>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {SPEC_GROUPS.map((group) => {
                          const keys = group.keys.filter((k) => data.some((d) => d.specs[k]))
                          if (keys.length === 0) return null

                          return (
                            <Fragment key={group.label}>
                              <TableRow className="border-b border-slate-100 bg-slate-50/30">
                                <TableCell
                                  colSpan={data.length + 1}
                                  className="px-5 py-2.5"
                                >
                                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                    <span className="text-slate-400">{group.icon}</span>
                                    {group.label}
                                  </div>
                                </TableCell>
                              </TableRow>

                              {keys.map((key, rowIdx) => {
                                const values = data.map((d) => d.specs[key])
                                const nonNull = values.filter((v): v is string => v !== undefined && v !== null)
                                const allSame = nonNull.length < 2 || new Set(nonNull.map((v) => v.toLowerCase().trim())).size === 1

                                return (
                                  <TableRow
                                    key={key}
                                    className={`border-b border-slate-50 transition-colors hover:bg-slate-50/50 ${
                                      rowIdx === keys.length - 1 ? "border-slate-100" : ""
                                    }`}
                                  >
                                    <TableCell className="px-5 py-3">
                                      <span className="text-sm text-slate-500">
                                        {(SPEC_LABELS as Record<string, string>)[key] ?? key}
                                      </span>
                                    </TableCell>
                                    {data.map((item, colIdx) => (
                                      <TableCell key={item.product.id} className="px-5 py-3">
                                        <SpecValue value={item.specs[key]} isBest={!allSame} />
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                )
                              })}
                            </Fragment>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </section>
            )}

            {/* Bottom spacer for floating compare bar */}
            <div className="h-20" />
          </div>
        )}
      </main>
    </div>
  )
}
