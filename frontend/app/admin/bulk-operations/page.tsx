"use client"

import { useState } from "react"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function parseIds(raw: string): number[] {
  return Array.from(
    new Set(
      raw
        .split(/[\s,]+/)
        .map((part) => Number(part.trim()))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  )
}

function summarizeIds(raw: string): { valid: number; invalid: number } {
  const tokens = raw
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter((part) => part !== "")

  if (tokens.length === 0) {
    return { valid: 0, invalid: 0 }
  }

  let valid = 0
  let invalid = 0

  for (const token of tokens) {
    const value = Number(token)
    if (Number.isInteger(value) && value > 0) {
      valid++
    } else {
      invalid++
    }
  }

  return { valid, invalid }
}

export default function BulkOperationsPage() {
  const [openListingPanel, setOpenListingPanel] = useState(true)
  const [openProductPanel, setOpenProductPanel] = useState(true)
  const [openReviewPanel, setOpenReviewPanel] = useState(true)

  const [listingIdsRaw, setListingIdsRaw] = useState("")
  const [listingState, setListingState] = useState<"" | "active" | "inactive">("")
  const [listingAvailability, setListingAvailability] = useState<"" | "available" | "unavailable">("")
  const [listingPrice, setListingPrice] = useState("")
  const [listingOldPrice, setListingOldPrice] = useState("")
  const [listingSellerId, setListingSellerId] = useState("")
  const [listingProductId, setListingProductId] = useState("")
  const [listingProductUrl, setListingProductUrl] = useState("")
  const [listingRef, setListingRef] = useState("")
  const [listingSubmitting, setListingSubmitting] = useState(false)

  const [productIdsRaw, setProductIdsRaw] = useState("")
  const [productCategoryId, setProductCategoryId] = useState("")
  const [productSubmitting, setProductSubmitting] = useState(false)

  const [reviewIdsRaw, setReviewIdsRaw] = useState("")
  const [reviewStatus, setReviewStatus] = useState<"APPROVED" | "REJECTED" | "PENDING">("APPROVED")
  const [reviewNote, setReviewNote] = useState("")
  const [reviewSubmitting, setReviewSubmitting] = useState(false)

  const hasListingUpdate =
    listingState !== "" ||
    listingAvailability !== "" ||
    listingPrice.trim() !== "" ||
    listingOldPrice.trim() !== "" ||
    listingSellerId.trim() !== "" ||
    listingProductId.trim() !== "" ||
    listingProductUrl.trim() !== "" ||
    listingRef.trim() !== ""

  const hasProductUpdate = productCategoryId.trim() !== ""
  const listingIdSummary = summarizeIds(listingIdsRaw)
  const productIdSummary = summarizeIds(productIdsRaw)
  const reviewIdSummary = summarizeIds(reviewIdsRaw)

  function buildListingPayload() {
    const payload: Record<string, string | number | boolean | null> = {}

    if (listingState !== "") {
      payload.is_active = listingState === "active"
    }
    if (listingAvailability !== "") {
      payload.availability = listingAvailability === "available"
    }
    if (listingPrice.trim() !== "") {
      payload.price = Number(listingPrice)
    }
    if (listingOldPrice.trim() !== "") {
      payload.old_price = Number(listingOldPrice)
    }
    if (listingSellerId.trim() !== "") {
      payload.sellerId = Number(listingSellerId)
    }
    if (listingProductId.trim() !== "") {
      payload.productId = Number(listingProductId)
    }
    if (listingProductUrl.trim() !== "") {
      payload.product_url = listingProductUrl.trim()
    }
    if (listingRef.trim() !== "") {
      payload.ref = listingRef.trim()
    }

    return payload
  }

  async function handleBulkListingStateUpdate() {
    const ids = parseIds(listingIdsRaw)
    if (ids.length === 0) {
      toast.error("Enter at least one valid listing ID.")
      return
    }

    if (!hasListingUpdate) {
      toast.error("Choose at least one listing change to apply.")
      return
    }

    setListingSubmitting(true)

    let updated = 0
    let failed = 0
    const payload = buildListingPayload()

    for (const id of ids) {
      try {
        const response = await fetch(`/api/product-listings/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          failed++
        } else {
          updated++
        }
      } catch {
        failed++
      }
    }

    setListingSubmitting(false)

    if (failed === 0) {
      toast.success(`Updated ${updated} listing(s).`)
    } else {
      toast.warning(`Updated ${updated} listing(s), failed ${failed}.`)
    }
  }

  async function handleBulkProductCategoryUpdate() {
    const ids = parseIds(productIdsRaw)
    const categoryId = Number(productCategoryId)

    if (ids.length === 0) {
      toast.error("Enter at least one valid product ID.")
      return
    }

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      toast.error("Enter a valid category ID.")
      return
    }

    if (!hasProductUpdate) {
      toast.error("Enter a category ID to apply.")
      return
    }

    setProductSubmitting(true)

    let updated = 0
    let failed = 0

    for (const id of ids) {
      try {
        const response = await fetch(`/api/products/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId }),
        })

        if (!response.ok) {
          failed++
        } else {
          updated++
        }
      } catch {
        failed++
      }
    }

    setProductSubmitting(false)

    if (failed === 0) {
      toast.success(`Updated ${updated} product(s).`)
    } else {
      toast.warning(`Updated ${updated} product(s), failed ${failed}.`)
    }
  }

  async function handleBulkReviewModeration() {
    const ids = parseIds(reviewIdsRaw)
    if (ids.length === 0) {
      toast.error("Enter at least one valid review ID.")
      return
    }

    setReviewSubmitting(true)

    try {
      const response = await fetch("/api/admin/reviews/batch-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_ids: ids,
          status: reviewStatus,
          moderation_note: reviewNote.trim() || undefined,
        }),
      })

      const data = (await response.json().catch(() => ({}))) as {
        updated?: number
        failed?: number
        error?: string
      }

      if (!response.ok) {
        throw new Error(data.error || "Bulk review moderation failed.")
      }

      toast.success(`Moderation applied. Updated ${data.updated ?? 0}, failed ${data.failed ?? 0}.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bulk review moderation failed.")
    } finally {
      setReviewSubmitting(false)
    }
  }

  return (
    <section className="w-full max-w-none space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Bulk Operations</h1>
        <p className="text-sm text-muted-foreground">
          Execute high-volume admin actions in one place.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Listing Batch</p>
          <p className="mt-1 text-sm text-muted-foreground">Use to change activity, availability, pricing, refs, and ownership.</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Product Batch</p>
          <p className="mt-1 text-sm text-muted-foreground">Use to re-assign categories after cleanup or taxonomy updates.</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Review Batch</p>
          <p className="mt-1 text-sm text-muted-foreground">Use to apply one moderation decision to multiple review IDs.</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4 rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Bulk Listing Updates</h2>
              <p className="text-sm text-muted-foreground">
                Update active state, availability, pricing, seller, product, or URL across many listings.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpenListingPanel((value) => !value)}>
              {openListingPanel ? "Close" : "Open"}
            </Button>
          </div>

          {openListingPanel ? (
            <>

          <div className="space-y-2">
            <Label htmlFor="listing-ids">Listing IDs (comma or newline separated)</Label>
            <textarea
              id="listing-ids"
              className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="101, 102, 103"
              value={listingIdsRaw}
              onChange={(event) => setListingIdsRaw(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Parsed IDs: {listingIdSummary.valid} valid{listingIdSummary.invalid > 0 ? `, ${listingIdSummary.invalid} invalid` : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setListingState("inactive")}>Quick: Deactivate</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setListingState("active")}>Quick: Activate</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setListingAvailability("unavailable")}>Quick: Mark Unavailable</Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="listing-state">Active State</Label>
              <select
                id="listing-state"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={listingState}
                onChange={(event) => setListingState(event.target.value as "" | "active" | "inactive")}
              >
                <option value="">Keep unchanged</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="listing-availability">Availability</Label>
              <select
                id="listing-availability"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={listingAvailability}
                onChange={(event) => setListingAvailability(event.target.value as "" | "available" | "unavailable")}
              >
                <option value="">Keep unchanged</option>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="listing-price">Price</Label>
              <Input id="listing-price" type="number" step="0.01" value={listingPrice} onChange={(event) => setListingPrice(event.target.value)} placeholder="Leave blank to keep unchanged" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="listing-old-price">Old Price</Label>
              <Input id="listing-old-price" type="number" step="0.01" value={listingOldPrice} onChange={(event) => setListingOldPrice(event.target.value)} placeholder="Leave blank to keep unchanged" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="listing-seller-id">Seller ID</Label>
              <Input id="listing-seller-id" type="number" min={1} value={listingSellerId} onChange={(event) => setListingSellerId(event.target.value)} placeholder="Leave blank to keep unchanged" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="listing-product-id">Product ID</Label>
              <Input id="listing-product-id" type="number" min={1} value={listingProductId} onChange={(event) => setListingProductId(event.target.value)} placeholder="Leave blank to keep unchanged" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="listing-product-url">Product URL</Label>
            <Input id="listing-product-url" value={listingProductUrl} onChange={(event) => setListingProductUrl(event.target.value)} placeholder="https://seller.example/product" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="listing-ref">Reference</Label>
            <Input id="listing-ref" value={listingRef} onChange={(event) => setListingRef(event.target.value)} placeholder="External reference" />
          </div>

              <Button onClick={handleBulkListingStateUpdate} disabled={listingSubmitting}>
                {listingSubmitting ? "Applying..." : "Apply Listing Updates"}
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Listing operation window is closed.</p>
          )}
        </div>

        <div className="space-y-4 rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Bulk Product Category Assignment</h2>
              <p className="text-sm text-muted-foreground">
                Move multiple products to a new category in one pass.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpenProductPanel((value) => !value)}>
              {openProductPanel ? "Close" : "Open"}
            </Button>
          </div>

          {openProductPanel ? (
            <>

          <div className="space-y-2">
            <Label htmlFor="product-ids">Product IDs (comma or newline separated)</Label>
            <textarea
              id="product-ids"
              className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="301, 302, 303"
              value={productIdsRaw}
              onChange={(event) => setProductIdsRaw(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Parsed IDs: {productIdSummary.valid} valid{productIdSummary.invalid > 0 ? `, ${productIdSummary.invalid} invalid` : ""}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-category-id">Target Category ID</Label>
            <Input
              id="product-category-id"
              type="number"
              min={1}
              value={productCategoryId}
              onChange={(event) => setProductCategoryId(event.target.value)}
              placeholder="Category ID"
            />
          </div>

              <Button onClick={handleBulkProductCategoryUpdate} disabled={productSubmitting}>
                {productSubmitting ? "Applying..." : "Apply Category Assignment"}
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Product category operation window is closed.</p>
          )}
        </div>

        <div className="space-y-4 rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Bulk Review Moderation</h2>
              <p className="text-sm text-muted-foreground">
                Apply one moderation status to many reviews at once.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpenReviewPanel((value) => !value)}>
              {openReviewPanel ? "Close" : "Open"}
            </Button>
          </div>

          {openReviewPanel ? (
            <>

          <div className="space-y-2">
            <Label htmlFor="review-ids">Review IDs (comma or newline separated)</Label>
            <textarea
              id="review-ids"
              className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="2001, 2002, 2003"
              value={reviewIdsRaw}
              onChange={(event) => setReviewIdsRaw(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Parsed IDs: {reviewIdSummary.valid} valid{reviewIdSummary.invalid > 0 ? `, ${reviewIdSummary.invalid} invalid` : ""}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-status">Status</Label>
            <select
              id="review-status"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={reviewStatus}
              onChange={(event) => setReviewStatus(event.target.value as "APPROVED" | "REJECTED" | "PENDING")}
            >
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-note">Moderation Note (optional)</Label>
            <Input
              id="review-note"
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
              placeholder="Reason for moderation"
            />
          </div>

              <Button onClick={handleBulkReviewModeration} disabled={reviewSubmitting}>
                {reviewSubmitting ? "Applying..." : "Apply to Reviews"}
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Review moderation operation window is closed.</p>
          )}
        </div>
      </div>
    </section>
  )
}
