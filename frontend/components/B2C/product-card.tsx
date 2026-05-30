"use client"

import Image from "next/image"
import { ArrowRight, BarChart2, Star } from "lucide-react"
import { useRouter } from "next/navigation"

import { ListingFavoriteToggle } from "@/components/B2C/listing-favorite-toggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Product } from "@/utils/types"

type ProductCardProps = {
  product: Product
  bestPriceLabel: string
  offersCount: number
  bestTrustScore?: number | null
  favoriteListingId?: number
  isFavorited?: boolean
  isSponsored?: boolean
}

function formatTrustScore(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A"
  return `${Math.round(value)}`
}

function getTrustScorePercentage(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return null
  return Math.max(0, Math.min(100, value))
}

function getTrustMeta(value?: number | null): { label: string; color: string; bg: string } {
  if (value === null || value === undefined || Number.isNaN(value))
    return { label: "N/A", color: "text-slate-400", bg: "bg-slate-100" }
  if (value >= 90) return { label: "Excellent", color: "text-emerald-700", bg: "bg-emerald-50" }
  if (value >= 75) return { label: "Très bien", color: "text-green-700", bg: "bg-green-50" }
  if (value >= 60) return { label: "Bien", color: "text-lime-700", bg: "bg-lime-50" }
  if (value >= 40) return { label: "Moyen", color: "text-amber-700", bg: "bg-amber-50" }
  return { label: "Faible", color: "text-red-700", bg: "bg-red-50" }
}

function TrustBar({ score }: { score: number | null | undefined }) {
  const pct = getTrustScorePercentage(score)
  const { label, color, bg } = getTrustMeta(score)

  if (pct === null) return null

  const barColor =
    pct >= 90 ? "bg-emerald-500" :
    pct >= 75 ? "bg-green-500" :
    pct >= 60 ? "bg-lime-500" :
    pct >= 40 ? "bg-amber-500" :
    "bg-red-500"

  return (
    <div className={cn("flex items-center gap-2 rounded-lg px-2.5 py-1.5", bg)}>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className={cn("text-[11px] font-semibold", color)}>{label}</span>
          <span className={cn("text-[11px] font-bold tabular-nums", color)}>{Math.round(pct)}/100</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-black/10">
          <div
            className={cn("h-full rounded-full transition-all duration-500", barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export function ProductCard({
  product,
  bestPriceLabel,
  offersCount,
  bestTrustScore,
  favoriteListingId,
  isFavorited,
  isSponsored,
}: ProductCardProps) {
  const router = useRouter()

  function openDetails() {
    router.push(`/B2C/products/${product.id}`)
  }

  function prefetchDetail() {
    if (typeof window === "undefined") return
    fetch(`/api/products/${product.id}`).catch(() => {})
    fetch(`/api/product-listings`).catch(() => {})
    fetch(`/api/price-history?productId=${product.id}`).catch(() => {})
  }

  return (
    <Card
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      role="button"
      tabIndex={0}
      onClick={openDetails}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          openDetails()
        }
      }}
      onMouseEnter={prefetchDetail}
    >
      {/* ── Image zone ── */}
      <div className="relative bg-slate-50">
        {/* top-left badges */}
        <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-1.5">
          {product.brand && (
            <Badge
              variant="secondary"
              className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 shadow-sm"
            >
              {product.brand}
            </Badge>
          )}
          {isSponsored && (
            <Badge className="flex items-center gap-1 rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-900 hover:bg-amber-400">
              <Star className="size-2.5 fill-amber-900" />
              Sponsorisé
            </Badge>
          )}
        </div>

        {/* favorite toggle */}
        {favoriteListingId ? (
          <div
            className="absolute right-3 top-3 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <ListingFavoriteToggle
              productListingId={favoriteListingId}
              defaultFavorited={isFavorited}
            />
          </div>
        ) : null}

        {/* product image */}
        <div className="flex aspect-square items-center justify-center p-6">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              width={400}
              height={400}
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-slate-300">
              Aucune image
            </div>
          )}
        </div>
      </div>

      {/* ── Content zone ── */}
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        {/* product name */}
        <h3 className="line-clamp-2 min-h-[2.75rem] text-[15px] font-semibold leading-snug text-slate-900">
          {product.name}
        </h3>

        {/* trust score bar */}
        <TrustBar score={bestTrustScore} />

        {/* price + offers */}
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[11px] font-medium text-slate-400">À partir de</p>
            <p className="text-2xl font-extrabold leading-none tracking-tight text-slate-900">
              {bestPriceLabel}
            </p>
          </div>
          <span className="mb-0.5 shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-semibold text-slate-600">
            {offersCount} offre{offersCount > 1 ? "s" : ""}
          </span>
        </div>

        {/* actions */}
        <div className="mt-auto flex gap-2 pt-1">
          <Button
            className="h-10 flex-1 rounded-xl bg-slate-900 text-[13px] font-semibold text-white hover:bg-slate-700"
            onClick={openDetails}
          >
            Voir les offres
            <ArrowRight className="ml-1.5 size-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
            onClick={(e) => { e.stopPropagation(); openDetails() }}
            aria-label="Comparer ce produit"
          >
            <BarChart2 className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}