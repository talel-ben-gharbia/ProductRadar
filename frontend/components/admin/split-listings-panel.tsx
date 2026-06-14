"use client"

import { useEffect, useMemo, useState } from "react"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { getProductListings } from "@/services/product-listings"
import { splitListingToNewProduct } from "@/services/quality"
import type { ProductListing } from "@/utils/types"

type CandidateItem = {
  productId: number
  name: string
  brand: string | null
  description: string
}

type SplitListingsPanelProps = {
  items: CandidateItem[]
  onActionComplete?: () => void
}

type ProductDetails = {
  id: number
  name: string
  brand: string | null
  description: string
  image_url?: string | null
  categoryId?: number | null
}

async function fetchProduct(id: number): Promise<ProductDetails> {
  const response = await fetch(`/api/products/${id}`, { cache: "no-store" })
  const data = (await response.json().catch(() => ({}))) as { error?: string } & Partial<ProductDetails>

  if (!response.ok) {
    throw new Error(data.error || `Failed to fetch product #${id}.`)
  }

  return {
    id: Number(data.id ?? id),
    name: String(data.name ?? ""),
    brand: (data.brand ?? null) as string | null,
    description: String(data.description ?? ""),
    image_url: (data.image_url ?? null) as string | null,
    categoryId: (data.categoryId ?? null) as number | null,
  }
}

export default function SplitListingsPanel({ items, onActionComplete }: SplitListingsPanelProps) {
  const candidates = useMemo(
    () => items.filter((item) => Number.isInteger(item.productId) && item.productId > 0),
    [items],
  )

  const [sourceProductIdRaw, setSourceProductIdRaw] = useState(candidates[0] ? String(candidates[0].productId) : "")
  const [listings, setListings] = useState<ProductListing[]>([])
  const [loadingListings, setLoadingListings] = useState(false)
  const [selectedListingIdRaw, setSelectedListingIdRaw] = useState("")

  const [newName, setNewName] = useState("")
  const [newBrand, setNewBrand] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newImageUrl, setNewImageUrl] = useState("")
  const [newCategoryIdRaw, setNewCategoryIdRaw] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const selectedListing = useMemo(
    () => listings.find((listing) => String(listing.id) === selectedListingIdRaw) ?? null,
    [listings, selectedListingIdRaw],
  )

  useEffect(() => {
    setSourceProductIdRaw(candidates[0] ? String(candidates[0].productId) : "")
  }, [candidates])

  useEffect(() => {
    let cancelled = false

    async function loadProductContext() {
      const sourceProductId = Number(sourceProductIdRaw)
      if (!Number.isInteger(sourceProductId) || sourceProductId <= 0) {
        setListings([])
        setSelectedListingIdRaw("")
        return
      }

      setLoadingListings(true)
      try {
        const [listingRows, productDetails] = await Promise.all([
          getProductListings(sourceProductId),
          fetchProduct(sourceProductId),
        ])

        if (cancelled) {
          return
        }

        setListings(listingRows)
        setSelectedListingIdRaw(listingRows[0] ? String(listingRows[0].id) : "")

        setNewName((previous) => previous.trim() || `${productDetails.name} (Split)`)
        setNewBrand((previous) => previous.trim() || (productDetails.brand ?? ""))
        setNewDescription((previous) => previous.trim() || productDetails.description)
        setNewImageUrl((previous) => previous.trim() || (productDetails.image_url ?? ""))
        setNewCategoryIdRaw((previous) => previous.trim() || (productDetails.categoryId ? String(productDetails.categoryId) : ""))
      } catch (error) {
        if (cancelled) {
          return
        }

        setListings([])
        setSelectedListingIdRaw("")
        toast.error(error instanceof Error ? error.message : "Failed to load product listings.")
      } finally {
        if (!cancelled) {
          setLoadingListings(false)
        }
      }
    }

    if (candidates.length > 0) {
      loadProductContext()
    }

    return () => {
      cancelled = true
    }
  }, [sourceProductIdRaw, candidates.length])

  async function handleSplit() {
    const listingId = Number(selectedListingIdRaw)
    if (!Number.isInteger(listingId) || listingId <= 0) {
      toast.error("Select a listing to split.")
      return
    }

    if (!newName.trim()) {
      toast.error("New product name is required.")
      return
    }

    const categoryId = newCategoryIdRaw.trim() ? Number(newCategoryIdRaw) : null
    if (newCategoryIdRaw.trim() && (!Number.isInteger(categoryId) || Number(categoryId) <= 0)) {
      toast.error("Category ID must be a positive number.")
      return
    }

    setSubmitting(true)
    try {
      const result = await splitListingToNewProduct(listingId, {
        name: newName.trim(),
        brand: newBrand.trim() || null,
        description: newDescription.trim() || null,
        image_url: newImageUrl.trim() || null,
        categoryId: categoryId,
      })

      toast.success(`Split complete. New product #${result.new_product.id} created.`)

      const sourceProductId = Number(sourceProductIdRaw)
      if (Number.isInteger(sourceProductId) && sourceProductId > 0) {
        const refreshedListings = await getProductListings(sourceProductId)
        setListings(refreshedListings)
        setSelectedListingIdRaw(refreshedListings[0] ? String(refreshedListings[0].id) : "")
      }

      onActionComplete?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Split operation failed.")
    } finally {
      setSubmitting(false)
    }
  }

  function resetFormFromSourceProduct() {
    const sourceProductId = Number(sourceProductIdRaw)
    if (!Number.isInteger(sourceProductId) || sourceProductId <= 0) {
      return
    }

    fetchProduct(sourceProductId)
      .then((productDetails) => {
        setNewName(`${productDetails.name} (Split)`)
        setNewBrand(productDetails.brand ?? "")
        setNewDescription(productDetails.description)
        setNewImageUrl(productDetails.image_url ?? "")
        setNewCategoryIdRaw(productDetails.categoryId ? String(productDetails.categoryId) : "")
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Unable to reset form from source product.")
      })
  }

  if (candidates.length === 0) {
    return null
  }

  return (
    <div className="rounded-md border border-dashed p-3">
      <p className="text-sm font-medium">Split Listing To New Product</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Move one listing from a duplicate product into a brand new product when it is not actually the same item.
      </p>

      <div className="mt-3 space-y-3">
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={resetFormFromSourceProduct}>
            Reset From Source Product
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Source Product</label>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={sourceProductIdRaw}
              onChange={(event) => setSourceProductIdRaw(event.target.value)}
            >
              {candidates.map((candidate) => (
                <option key={`split-source-${candidate.productId}`} value={candidate.productId}>
                  #{candidate.productId} - {candidate.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Listing To Split</label>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={selectedListingIdRaw}
              onChange={(event) => setSelectedListingIdRaw(event.target.value)}
              disabled={loadingListings || listings.length === 0}
            >
              {listings.length === 0 ? (
                <option value="">No listings found</option>
              ) : (
                listings.map((listing) => (
                  <option key={`split-listing-${listing.id}`} value={listing.id}>
                    #{listing.id} | ref: {listing.ref ?? "-"} | seller: {listing.sellerName ?? listing.sellerId ?? "-"}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {selectedListing ? (
          <div className="rounded-md border bg-muted/20 p-3 text-xs space-y-1">
            <p className="font-semibold">Selected Listing Preview</p>
            <p>
              Listing #{selectedListing.id} | ref: {selectedListing.ref ?? "-"} | seller: {selectedListing.sellerName ?? selectedListing.sellerId ?? "-"}
            </p>
            <p>Price: {selectedListing.price ?? "-"} | Old price: {selectedListing.old_price ?? "-"}</p>
            <p className="text-muted-foreground break-all">URL: {selectedListing.product_url || "-"}</p>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">New Product Name</label>
            <Input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Required" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Brand</label>
            <Input value={newBrand} onChange={(event) => setNewBrand(event.target.value)} placeholder="Optional" />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Category ID</label>
            <Input
              value={newCategoryIdRaw}
              onChange={(event) => setNewCategoryIdRaw(event.target.value)}
              placeholder="Optional"
              inputMode="numeric"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Image URL</label>
            <Input value={newImageUrl} onChange={(event) => setNewImageUrl(event.target.value)} placeholder="Optional" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <Textarea
            value={newDescription}
            onChange={(event) => setNewDescription(event.target.value)}
            placeholder="Optional"
            className="min-h-24"
          />
        </div>

        <Button type="button" onClick={handleSplit} disabled={submitting || loadingListings || listings.length === 0}>
          {submitting ? "Splitting..." : "Split Listing To New Product"}
        </Button>
      </div>
    </div>
  )
}
