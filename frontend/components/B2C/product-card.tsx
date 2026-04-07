"use client"

import Image from "next/image"
import { Heart, ShoppingBag } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Product } from "@/utils/types"

type ProductCardProps = {
  product: Product
  bestPriceLabel: string
  offersCount: number
}

export function ProductCard({ product, bestPriceLabel, offersCount }: ProductCardProps) {
  const router = useRouter()
  const [isSaved, setIsSaved] = useState(false)

  function openDetails() {
    router.push(`/B2C/products/${product.id}`)
  }

  return (
    <Card
      className="group overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
      role="button"
      tabIndex={0}
      onClick={openDetails}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          openDetails()
        }
      }}
    >
      <div className="relative mx-3 mt-3 overflow-hidden rounded-xl bg-[#f6f7fb]">
        <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
          <Button
            type="button"
            variant={isSaved ? "default" : "secondary"}
            size="icon"
            className="h-8 w-8 rounded-full"
            aria-pressed={isSaved}
            aria-label={isSaved ? "Remove from favorites" : "Add to favorites"}
            onClick={(event) => {
              event.stopPropagation()
              setIsSaved((value) => !value)
            }}
          >
            <Heart className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
          </Button>
        </div>

        <div className="flex  items-center justify-center">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            width={720}
            height={360}
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            No image
          </div>
        )}
        </div>
      </div>

      <CardHeader className="space-y-2 px-4 pb-2 pt-4">
        <CardTitle className="line-clamp-2 min-h-12 text-[15px] font-medium leading-6 tracking-tight text-slate-900">
          {product.name}
        </CardTitle>
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-0">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-slate-600">Dès</p>
            <p className="truncate text-[26px] font-extrabold leading-none text-rose-600">
              {bestPriceLabel}
            </p>
          </div>
          <p className="whitespace-nowrap text-sm text-slate-500">
            {offersCount} offre{offersCount > 1 ? "s" : ""}
          </p>
        </div>

        <Button
          variant="outline"
          className="mt-4 w-full rounded-lg"
          onClick={openDetails}
        >
          <ShoppingBag className="h-4 w-4" />
          Voir les offres
        </Button>
      </CardContent>
    </Card>
  )
}
