"use client"

import Image from "next/image"
import { Bell, Eye, Heart } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { Product } from "@/utils/types"

type ProductCardProps = {
  product: Product
  bestPriceLabel: string
  offersCount: number
}

export function ProductCard({ product, bestPriceLabel, offersCount }: ProductCardProps) {
  const [isSaved, setIsSaved] = useState(false)
  const [isAlerted, setIsAlerted] = useState(false)

  return (
    <Dialog>
      <Card className="group overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
        <div className="relative mx-3 mt-3 overflow-hidden rounded-3xl bg-[#f6f7fb]">
          <div className="absolute right-3 top-3 z-20 flex items-center gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <Button
              type="button"
              variant={isSaved ? "default" : "secondary"}
              size="icon"
              className="h-8 w-8 rounded-full shadow-sm"
              aria-pressed={isSaved}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setIsSaved((value) => !value)
              }}
            >
              <Heart className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
            </Button>

            <Button
              type="button"
              variant={isAlerted ? "default" : "secondary"}
              size="icon"
              className="h-8 w-8 rounded-full shadow-sm"
              aria-pressed={isAlerted}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setIsAlerted((value) => !value)
              }}
            >
              <Bell className={`h-4 w-4 ${isAlerted ? "fill-current" : ""}`} />
            </Button>

            <DialogTrigger asChild>
              <Button type="button" variant="secondary" size="icon" className="h-8 w-8 rounded-full shadow-sm">
                <Eye className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </div>

          <div className="flex min-h-62.5 items-center justify-center p-6">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              width={720}
              height={360}
              className="h-auto w-full max-w-60 object-contain transition-transform duration-300 group-hover:scale-105"
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
        </CardContent>
      </Card>

      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{product.name}</DialogTitle>
          <DialogDescription>{product.brand || "Unknown brand"}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-[1.15fr_0.85fr]">
          <div className="overflow-hidden rounded-2xl border bg-muted/20">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                width={1200}
                height={800}
                className="h-auto w-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex min-h-80 items-center justify-center text-sm text-muted-foreground">
                No image available
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Best existing price</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">{bestPriceLabel}</p>
            </div>

            <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="mt-1 text-sm leading-6 text-foreground">
                {product.description || "No description available."}
              </p>
            </div>

            <Button type="button" variant="outline" className="w-full rounded-xl">
              View product
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
