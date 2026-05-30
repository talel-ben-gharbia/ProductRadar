"use client"

import { Heart } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useAuthDialog } from "@/lib/auth-dialog-context"

import { Button } from "@/components/ui/button"
import type { B2CFavorite } from "@/utils/types"

type ListingFavoriteToggleProps = {
  productListingId: number
  defaultFavorited?: boolean
  defaultFavoriteId?: number | null
}

export function ListingFavoriteToggle({
  productListingId,
  defaultFavorited,
  defaultFavoriteId,
}: ListingFavoriteToggleProps) {
  const { openAuthDialog } = useAuthDialog()
  const [favoriteId, setFavoriteId] = useState<number | null>(
    defaultFavorited ? (defaultFavoriteId ?? null) : null,
  )
  const [loading, setLoading] = useState(!defaultFavorited)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (defaultFavorited !== undefined) return

    let cancelled = false

    async function loadFavorite() {
      try {
        const response = await fetch(`/api/b2c/favorites?productListingId=${encodeURIComponent(String(productListingId))}`, {
          cache: "no-store",
        })

        if (cancelled) {
          return
        }

        if (!response.ok) {
          if (response.status === 401) {
            setLoading(false)
            return
          }
          console.warn(`Failed to load favorites: ${response.status}`)
          setFavoriteId(null)
          setLoading(false)
          return
        }

        const data = (await response.json().catch(() => ({}))) as { favorites?: B2CFavorite[] }
        
        if (cancelled) {
          return
        }

        setFavoriteId(data.favorites?.[0]?.id ?? null)
        setLoading(false)
      } catch (err) {
        if (!cancelled) {
          console.error("Error loading favorites:", err)
          setFavoriteId(null)
          setLoading(false)
        }
      }
    }

    loadFavorite()

    return () => {
      cancelled = true
    }
  }, [productListingId, defaultFavorited])

  async function toggleFavorite(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()

    if (loading || saving) {
      return
    }

    setSaving(true)

    try {
      if (favoriteId) {
        const response = await fetch(`/api/b2c/favorites/${favoriteId}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string }
          console.error(`Delete failed with status ${response.status}:`, data)
          toast.error(data.error || "Failed to remove favorite")
          setSaving(false)
          return
        }

        setFavoriteId(null)
        setSaving(false)
        return
      }

      const response = await fetch("/api/b2c/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productListingId }),
      })

      const data = (await response.json().catch(() => ({}))) as {
        favorite?: B2CFavorite
        error?: string
      }

      if (!response.ok) {
        console.error(`POST failed with status ${response.status}:`, data)
        if (response.status === 401) {
          setSaving(false)
          openAuthDialog()
          return
        } else if (response.status === 429) {
          toast.error(data.error || "Favorite limit reached for your plan")
        } else {
          toast.error(data.error || "Failed to save favorite")
        }
        setSaving(false)
        return
      }

      if (data.favorite?.id) {
        setFavoriteId(data.favorite.id)
      } else {
        toast.error("Unexpected response from server")
      }
      setSaving(false)
    } catch (err) {
      console.error("Error toggling favorite:", err)
      toast.error("Network error")
      setSaving(false)
    }
  }


  return (
    <Button
      type="button"
      variant={favoriteId !== null ? "default" : "outline"}
      size="sm"
      className="inline-flex items-center gap-2"
      aria-pressed={favoriteId !== null}
      aria-label={favoriteId !== null ? "Remove from favorites" : "Add to favorites"}
      onClick={toggleFavorite}
      disabled={loading || saving}
    >
      <Heart className={`h-4 w-4 ${favoriteId !== null ? "fill-current" : ""}`} />
      {loading ? "..." : favoriteId !== null ? "Saved" : "Save"}
    </Button>
  )
}
