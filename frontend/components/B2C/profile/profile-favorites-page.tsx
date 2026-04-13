"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { B2CFavorite } from "@/utils/types"

export function ProfileFavoritesPage() {
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<B2CFavorite[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch("/api/b2c/favorites", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          favorites?: B2CFavorite[]
          error?: string
        }

        if (cancelled) {
          return
        }

        if (!response.ok) {
          setError(data.error || "Unable to load favorites.")
          setFavorites([])
          setLoading(false)
          return
        }

        setFavorites(data.favorites || [])
        setError(null)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setError("Unable to load favorites.")
          setFavorites([])
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function removeFavorite(favoriteId: number) {
    const response = await fetch(`/api/b2c/favorites/${favoriteId}`, { method: "DELETE" })

    if (!response.ok) {
      return
    }

    setFavorites((previous) => previous.filter((item) => item.id !== favoriteId))
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-xl border bg-background shadow-sm">
        <CardHeader>
          <CardTitle>Favorites</CardTitle>
          <CardDescription>Review the listings you saved from product cards or listing pages.</CardDescription>
        </CardHeader>
      </Card>

      {loading ? (
        <Card className="rounded-xl border bg-background shadow-sm">
          <CardContent className="py-6 text-sm text-muted-foreground">Loading favorites...</CardContent>
        </Card>
      ) : error ? (
        <Card className="rounded-xl border-destructive/40 bg-destructive/5 shadow-sm">
          <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : favorites.length === 0 ? (
        <Card className="rounded-xl border bg-background shadow-sm">
          <CardHeader>
            <CardTitle>No favorites yet</CardTitle>
            <CardDescription>
              Use the heart toggle on a listing to save it here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4">
          {favorites.map((favorite) => (
            <Card key={favorite.id} className="rounded-xl border bg-background shadow-sm">
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border bg-muted/20">
                    {favorite.productImageUrl ? (
                      <Image
                        src={favorite.productImageUrl}
                        alt={favorite.productName || "Product"}
                        width={120}
                        height={120}
                        className="h-14 w-14 object-contain"
                        unoptimized
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">No image</span>
                    )}
                  </div>

                  <div>
                    <p className="font-medium">{favorite.productName || "Unknown product"}</p>
                    <p className="text-sm text-muted-foreground">
                      Seller: {favorite.sellerName || "Unknown seller"}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge variant="outline">
                        {favorite.price !== null ? `${favorite.price.toFixed(2)} DT` : "-"}
                      </Badge>
                      {favorite.availability === null ? (
                        <Badge variant="outline">Unknown</Badge>
                      ) : favorite.availability ? (
                        <Badge variant="secondary">In stock</Badge>
                      ) : (
                        <Badge variant="destructive">Out of stock</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/B2C/products/${favorite.productId}`}>Open product</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href={favorite.product_url} target="_blank" rel="noreferrer">
                      Visit offer
                    </a>
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => removeFavorite(favorite.id)}>
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}