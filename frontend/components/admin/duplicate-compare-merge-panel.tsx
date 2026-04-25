"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { mergeProducts } from "@/services/admin/quality"

type CompareItem = {
  productId: number
  name: string
  brand: string | null
  description: string
}

type ProductDetails = {
  id: number
  name: string
  brand: string | null
  description: string
  image_url?: string | null
  categoryId?: number | null
  listings?: ProductListingSummary[]
}

type ProductListingSummary = {
  id: number
  sellerId: number | null
  sellerName: string | null
  ref: string | null
  price: number | null
  old_price: number | null
  product_url: string | null
  availability: boolean | null
  trust_score: number | null
  is_active: boolean | null
  created_at: string | null
  updatet_at: string | null
}

type ListingOption = {
  productId: number
  productName: string
  listing: ProductListingSummary
}

type SellerCollisionGroup = {
  sellerId: number
  sellerName: string
  options: ListingOption[]
}

type MergeStrategy = "keep-primary" | "keep-duplicate" | "keep-both"

type DuplicateCompareMergePanelProps = {
  items: CompareItem[]
  onActionComplete?: () => void
}

function compactText(value: string | null | undefined): string {
  return (value ?? "").trim()
}

function buildMergedDescription(primary: ProductDetails, duplicate: ProductDetails): string {
  const left = compactText(primary.description)
  const right = compactText(duplicate.description)

  if (!left) return right
  if (!right) return left
  if (left.toLowerCase() === right.toLowerCase()) return left

  return `${left}\n\n---\nMerged notes:\n${right}`
}

function formatListingSummary(listing: ProductListingSummary): string {
  const sellerLabel = listing.sellerName || (listing.sellerId != null ? `Seller #${listing.sellerId}` : "Unknown seller")
  const priceLabel = listing.price != null ? `${listing.price}` : "-"
  const refLabel = listing.ref?.trim() ? listing.ref : "-"

  return `${sellerLabel} | Listing #${listing.id} | Ref: ${refLabel} | Price: ${priceLabel}`
}

function formatListingOption(option: ListingOption): string {
  return `${option.productName} | ${formatListingSummary(option.listing)}`
}

function parseIsoDate(value: string | null): number {
  if (!value) {
    return 0
  }

  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function scoreListingOption(option: ListingOption): number {
  const listing = option.listing
  let score = 0

  if (listing.is_active === true) {
    score += 4
  }

  if (listing.availability === true) {
    score += 3
  }

  if ((listing.ref ?? "").trim() !== "") {
    score += 2
  }

  if ((listing.product_url ?? "").trim() !== "") {
    score += 1
  }

  if (listing.trust_score !== null) {
    score += Math.min(2, Math.max(0, Math.round(listing.trust_score / 50)))
  }

  if (listing.price !== null) {
    score += 1
  }

  score += parseIsoDate(listing.updatet_at) / 100000000000000

  return score
}

function buildSuggestedSurvivors(groups: SellerCollisionGroup[]): Record<number, number> {
  const next: Record<number, number> = {}

  for (const group of groups) {
    if (group.options.length === 0) {
      continue
    }

    let winner = group.options[0]
    let winnerScore = scoreListingOption(winner)

    for (let index = 1; index < group.options.length; index += 1) {
      const candidate = group.options[index]
      const candidateScore = scoreListingOption(candidate)

      if (candidateScore > winnerScore) {
        winner = candidate
        winnerScore = candidateScore
      }
    }

    next[group.sellerId] = winner.listing.id
  }

  return next
}

function productDetailsHref(productId: number): string {
  return `/admin/products/${productId}`
}

function buildSellerCollisionGroups(products: ProductDetails[]): SellerCollisionGroup[] {
  const groups = new Map<number, SellerCollisionGroup>()

  for (const product of products) {
    for (const listing of product.listings ?? []) {
      if (listing.sellerId == null) {
        continue
      }

      const sellerId = listing.sellerId
      const current = groups.get(sellerId) ?? {
        sellerId,
        sellerName: listing.sellerName || `Seller #${sellerId}`,
        options: [],
      }

      current.options.push({
        productId: product.id,
        productName: `Product #${product.id}`,
        listing,
      })

      if (!current.sellerName || current.sellerName.startsWith("Seller #")) {
        current.sellerName = listing.sellerName || current.sellerName
      }

      groups.set(sellerId, current)
    }
  }

  return Array.from(groups.values())
    .filter((group) => group.options.length > 1)
    .map((group) => ({
      ...group,
      options: [...group.options].sort((left, right) => {
        if (left.productId !== right.productId) {
          return left.productId - right.productId
        }

        return left.listing.id - right.listing.id
      }),
    }))
    .sort((left, right) => left.sellerId - right.sellerId)
}

async function fetchProduct(id: number): Promise<ProductDetails> {
  const response = await fetch(`/api/products/${id}`, { cache: "no-store" })
  const data = (await response.json().catch(() => ({}))) as { error?: string } & Partial<ProductDetails>

  if (!response.ok) {
    throw new Error(data.error || `Failed to fetch product #${id}.`)
  }

  const rawListings = Array.isArray((data as { listings?: unknown[] }).listings)
    ? ((data as { listings?: unknown[] }).listings ?? [])
    : []

  const listings: ProductListingSummary[] = rawListings.map((listing) => {
    const item = (listing ?? {}) as Partial<ProductListingSummary>
    return {
      id: Number(item.id ?? 0),
      sellerId: item.sellerId == null ? null : Number(item.sellerId),
      sellerName: item.sellerName == null ? null : String(item.sellerName),
      ref: item.ref == null ? null : String(item.ref),
      price: item.price == null ? null : Number(item.price),
      old_price: item.old_price == null ? null : Number(item.old_price),
      product_url: item.product_url == null ? null : String(item.product_url),
      availability: item.availability == null ? null : Boolean(item.availability),
      trust_score: item.trust_score == null ? null : Number(item.trust_score),
      is_active: item.is_active == null ? null : Boolean(item.is_active),
      created_at: item.created_at == null ? null : String(item.created_at),
      updatet_at: item.updatet_at == null ? null : String(item.updatet_at),
    }
  })

  return {
    id: Number(data.id ?? id),
    name: String(data.name ?? ""),
    brand: (data.brand ?? null) as string | null,
    description: String(data.description ?? ""),
    image_url: (data.image_url ?? null) as string | null,
    categoryId: (data.categoryId ?? null) as number | null,
    listings,
  }
}

export default function DuplicateCompareMergePanel({ items, onActionComplete }: DuplicateCompareMergePanelProps) {
  const mergeCandidates = useMemo(
    () => items.filter((item) => Number.isInteger(item.productId) && item.productId > 0),
    [items],
  )
  const [detailsById, setDetailsById] = useState<Record<number, ProductDetails>>({})
  const [loadingComparison, setLoadingComparison] = useState(false)
  const [primaryIdRaw, setPrimaryIdRaw] = useState(mergeCandidates[0] ? String(mergeCandidates[0].productId) : "")
  const [duplicateIdRaw, setDuplicateIdRaw] = useState(mergeCandidates[1] ? String(mergeCandidates[1].productId) : "")
  const [strategy, setStrategy] = useState<MergeStrategy>("keep-primary")
  const [listingSurvivorBySeller, setListingSurvivorBySeller] = useState<Record<number, number>>({})
  const [unavailableProductIds, setUnavailableProductIds] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)

  const comparisonProducts = useMemo(
    () =>
      mergeCandidates.map((candidate) =>
        detailsById[candidate.productId] ?? {
          id: candidate.productId,
          name: candidate.name,
          brand: candidate.brand,
          description: candidate.description,
          image_url: null,
          categoryId: null,
          listings: [],
        },
      ),
    [detailsById, mergeCandidates],
  )

  const sellerCollisionGroups = useMemo(
    () => buildSellerCollisionGroups(comparisonProducts),
    [comparisonProducts],
  )

  const pairComparisonProducts = useMemo(() => {
    const primaryId = Number(primaryIdRaw)
    const duplicateId = Number(duplicateIdRaw)

    if (!Number.isInteger(primaryId) || !Number.isInteger(duplicateId) || primaryId <= 0 || duplicateId <= 0) {
      return [] as ProductDetails[]
    }

    return comparisonProducts.filter((product) => product.id === primaryId || product.id === duplicateId)
  }, [comparisonProducts, duplicateIdRaw, primaryIdRaw])

  const pairSellerCollisionGroups = useMemo(
    () => buildSellerCollisionGroups(pairComparisonProducts),
    [pairComparisonProducts],
  )

  const unresolvedSellerCollisionGroups = sellerCollisionGroups.filter(
    (group) => listingSurvivorBySeller[group.sellerId] == null,
  )

  const unresolvedPairSellerCollisionGroups = pairSellerCollisionGroups.filter(
    (group) => listingSurvivorBySeller[group.sellerId] == null,
  )

  const suggestedPairSurvivors = useMemo(
    () => buildSuggestedSurvivors(pairSellerCollisionGroups),
    [pairSellerCollisionGroups],
  )

  const suggestedGroupSurvivors = useMemo(
    () => buildSuggestedSurvivors(sellerCollisionGroups),
    [sellerCollisionGroups],
  )

  const weakerSelectionWarnings = useMemo(() => {
    return pairSellerCollisionGroups
      .map((group) => {
        const selectedId = listingSurvivorBySeller[group.sellerId]
        const suggestedId = suggestedPairSurvivors[group.sellerId]

        if (!selectedId || !suggestedId || selectedId === suggestedId) {
          return null
        }

        const selectedOption = group.options.find((option) => option.listing.id === selectedId)
        const suggestedOption = group.options.find((option) => option.listing.id === suggestedId)
        if (!selectedOption || !suggestedOption) {
          return null
        }

        return {
          sellerId: group.sellerId,
          sellerName: group.sellerName,
          selectedListingId: selectedId,
          suggestedListingId: suggestedId,
        }
      })
      .filter((item): item is {
        sellerId: number
        sellerName: string
        selectedListingId: number
        suggestedListingId: number
      } => item !== null)
  }, [listingSurvivorBySeller, pairSellerCollisionGroups, suggestedPairSurvivors])

  const estimatedFinalListings = useMemo(() => {
    const totalListings = comparisonProducts.reduce((sum, product) => sum + (product.listings?.length ?? 0), 0)
    return totalListings - sellerCollisionGroups.length
  }, [comparisonProducts, sellerCollisionGroups.length])

  const estimatedPairFinalListings = useMemo(() => {
    const totalListings = pairComparisonProducts.reduce((sum, product) => sum + (product.listings?.length ?? 0), 0)
    return totalListings - pairSellerCollisionGroups.length
  }, [pairComparisonProducts, pairSellerCollisionGroups.length])

  useEffect(() => {
    if (pairSellerCollisionGroups.length === 0) {
      return
    }

    setListingSurvivorBySeller((current) => {
      const next = { ...current }
      let changed = false

      for (const group of pairSellerCollisionGroups) {
        if (next[group.sellerId] == null && suggestedPairSurvivors[group.sellerId] != null) {
          next[group.sellerId] = suggestedPairSurvivors[group.sellerId]
          changed = true
        }
      }

      return changed ? next : current
    })
  }, [pairSellerCollisionGroups, suggestedPairSurvivors])

  async function loadComparisonDetails() {
    const ids = mergeCandidates.map((item) => item.productId)
    setLoadingComparison(true)

    try {
      const products = await Promise.allSettled(ids.map((id) => fetchProduct(id)))
      const nextDetails: Record<number, ProductDetails> = {}
      const nextUnavailableProductIds: number[] = []
      let failedCount = 0

      for (let index = 0; index < products.length; index += 1) {
        const result = products[index]
        const productId = ids[index]

        if (result.status === "fulfilled") {
          nextDetails[result.value.id] = result.value
          continue
        }

        nextUnavailableProductIds.push(productId)
        failedCount += 1
      }

      setDetailsById(nextDetails)
      setUnavailableProductIds(nextUnavailableProductIds)

      if (failedCount > 0) {
        toast.warning(`${failedCount} product detail request(s) failed. Those products are already merged or deleted.`)
      }
    } finally {
      setLoadingComparison(false)
    }
  }

  useEffect(() => {
    setPrimaryIdRaw(mergeCandidates[0] ? String(mergeCandidates[0].productId) : "")
    setDuplicateIdRaw(mergeCandidates[1] ? String(mergeCandidates[1].productId) : "")
    setListingSurvivorBySeller({})
    setUnavailableProductIds([])
  }, [mergeCandidates])

  useEffect(() => {
    if (mergeCandidates.length < 2) {
      return
    }

    loadComparisonDetails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergeCandidates])

  async function handleSingleMerge() {
    const primaryId = Number(primaryIdRaw)
    const duplicateId = Number(duplicateIdRaw)

    if (!Number.isInteger(primaryId) || primaryId <= 0 || !Number.isInteger(duplicateId) || duplicateId <= 0) {
      toast.error("Enter valid primary and duplicate IDs.")
      return
    }

    if (primaryId === duplicateId) {
      toast.error("Primary and duplicate IDs must be different.")
      return
    }

    if (unavailableProductIds.includes(primaryId) || unavailableProductIds.includes(duplicateId)) {
      toast.error("One of the selected products no longer exists. Refresh the comparison first.")
      return
    }

    setSubmitting(true)

    try {
      const pairListingSurvivorBySeller = pairSellerCollisionGroups.reduce<Record<number, number>>((acc, group) => {
        const selectedListingId = listingSurvivorBySeller[group.sellerId]
        if (selectedListingId != null) {
          acc[group.sellerId] = selectedListingId
        }

        return acc
      }, {})

      const [primaryProduct, duplicateProduct] = await Promise.all([
        fetchProduct(primaryId),
        fetchProduct(duplicateId),
      ])

      if (strategy !== "keep-primary") {
        const updatePayload =
          strategy === "keep-duplicate"
            ? {
                name: duplicateProduct.name || primaryProduct.name,
                brand: duplicateProduct.brand ?? primaryProduct.brand,
                description: duplicateProduct.description || primaryProduct.description,
              }
            : {
                name: primaryProduct.name || duplicateProduct.name,
                brand: primaryProduct.brand ?? duplicateProduct.brand,
                description: buildMergedDescription(primaryProduct, duplicateProduct),
              }

        const updateResponse = await fetch(`/api/products/${primaryId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        })

        const updateData = (await updateResponse.json().catch(() => ({}))) as { error?: string }
        if (!updateResponse.ok) {
          throw new Error(updateData.error || "Failed to apply keep strategy before merge.")
        }
      }

      const result = await mergeProducts(primaryId, [duplicateId], "keep-duplicate", pairListingSurvivorBySeller)
      toast.success(
        `Merged ${result.summary.merged_count} product(s). Moved ${result.summary.moved_listings} listing(s).`,
      )
      onActionComplete?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Merge failed.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMergeAllToPrimary() {
    const primaryId = Number(primaryIdRaw)
    if (!Number.isInteger(primaryId) || primaryId <= 0) {
      toast.error("Select a valid primary product ID.")
      return
    }

    if (unavailableProductIds.includes(primaryId)) {
      toast.error("The selected primary product no longer exists. Refresh the comparison first.")
      return
    }

    const duplicateIds = mergeCandidates
      .map((item) => item.productId)
      .filter((id) => id !== primaryId)
      .filter((id) => !unavailableProductIds.includes(id))

    if (duplicateIds.length === 0) {
      toast.error("No duplicates available to merge into the selected primary.")
      return
    }

    setSubmitting(true)
    try {
      const result = await mergeProducts(primaryId, duplicateIds, "keep-duplicate", listingSurvivorBySeller)
      toast.success(
        `Merged ${result.summary.merged_count} product(s). Moved ${result.summary.moved_listings} listing(s).`,
      )
      onActionComplete?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bulk merge failed.")
    } finally {
      setSubmitting(false)
    }
  }

  if (mergeCandidates.length < 2) {
    return null
  }

  const tableProducts = comparisonProducts

  return (
    <div className="rounded-md border border-dashed p-3">
      <p className="text-sm font-medium">Compare & Merge (Multi-Duplicate)</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Comparison adapts automatically to {mergeCandidates.length} products in this duplicate group.
      </p>

      <div className="mt-3 space-y-4">
        <Button type="button" variant="outline" size="sm" onClick={loadComparisonDetails} disabled={loadingComparison}>
          {loadingComparison ? "Refreshing..." : "Refresh Full Details"}
        </Button>

        {tableProducts.length > 1 ? (
          <div className="overflow-auto rounded-md border">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-2 text-left">Field</th>
                  {tableProducts.map((product) => (
                    <th key={`head-${product.id}`} className="px-3 py-2 text-left">
                      <div className="flex items-center gap-2">
                        <span>Product #{product.id}</span>
                        <Link
                          href={productDetailsHref(product.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-blue-600 hover:underline"
                        >
                          Open
                        </Link>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-3 py-2 font-medium">Name</td>
                  {tableProducts.map((product) => (
                    <td key={`name-${product.id}`} className="px-3 py-2">{product.name || "-"}</td>
                  ))}
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2 font-medium">Brand</td>
                  {tableProducts.map((product) => (
                    <td key={`brand-${product.id}`} className="px-3 py-2">{product.brand || "-"}</td>
                  ))}
                </tr>
                <tr className="border-t align-top">
                  <td className="px-3 py-2 font-medium">Description</td>
                  {tableProducts.map((product) => (
                    <td key={`description-${product.id}`} className="px-3 py-2 whitespace-pre-wrap text-muted-foreground">
                      {product.description || "-"}
                    </td>
                  ))}
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2 font-medium">Category ID</td>
                  {tableProducts.map((product) => (
                    <td key={`category-${product.id}`} className="px-3 py-2">{product.categoryId ?? "-"}</td>
                  ))}
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2 font-medium">Image URL</td>
                  {tableProducts.map((product) => (
                    <td key={`image-${product.id}`} className="px-3 py-2 text-muted-foreground break-all">
                      {product.image_url || "-"}
                    </td>
                  ))}
                </tr>
                <tr className="border-t align-top">
                  <td className="px-3 py-2 font-medium">Listings</td>
                  {tableProducts.map((product) => {
                    const listings = product.listings ?? []
                    return (
                      <td key={`listings-${product.id}`} className="px-3 py-2 text-muted-foreground">
                        {listings.length === 0 ? (
                          <span>-</span>
                        ) : (
                          <div className="space-y-1">
                            {listings.map((listing) => (
                              <p key={`listing-row-${product.id}-${listing.id}`} className="whitespace-pre-wrap break-words">
                                {formatListingSummary(listing)}
                              </p>
                            ))}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="rounded-md border p-3 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Merge One Pair</p>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground">Primary Product ID</label>
                {Number(primaryIdRaw) > 0 ? (
                  <Link
                    href={productDetailsHref(Number(primaryIdRaw))}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Open selected
                  </Link>
                ) : null}
              </div>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={primaryIdRaw}
                onChange={(event) => setPrimaryIdRaw(event.target.value)}
              >
                {mergeCandidates.map((candidate) => (
                  <option key={`primary-${candidate.productId}`} value={candidate.productId}>
                    #{candidate.productId} - {candidate.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground">Duplicate Product ID</label>
                {Number(duplicateIdRaw) > 0 ? (
                  <Link
                    href={productDetailsHref(Number(duplicateIdRaw))}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Open selected
                  </Link>
                ) : null}
              </div>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={duplicateIdRaw}
                onChange={(event) => setDuplicateIdRaw(event.target.value)}
              >
                {mergeCandidates
                  .filter((candidate) => String(candidate.productId) !== primaryIdRaw)
                  .map((candidate) => (
                    <option key={`duplicate-${candidate.productId}`} value={candidate.productId}>
                      #{candidate.productId} - {candidate.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">When fields conflict:</p>
            <div className="flex flex-wrap gap-3 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="merge-strategy"
                  checked={strategy === "keep-primary"}
                  onChange={() => setStrategy("keep-primary")}
                />
                Keep primary
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="merge-strategy"
                  checked={strategy === "keep-duplicate"}
                  onChange={() => setStrategy("keep-duplicate")}
                />
                Keep duplicate
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="merge-strategy"
                  checked={strategy === "keep-both"}
                  onChange={() => setStrategy("keep-both")}
                />
                Keep both descriptions
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seller Listing Survivors</p>
            <p className="text-xs text-muted-foreground">
              Choose one surviving listing for each seller collision. Unique listings stay as-is.
            </p>

            {sellerCollisionGroups.length > 0 ? (
              <div className="space-y-3 rounded-md border bg-muted/20 p-3">
                {pairSellerCollisionGroups.length > 0 ? (
                  pairSellerCollisionGroups.map((group) => (
                  <div key={`seller-group-${group.sellerId}`} className="rounded border bg-background p-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{group.sellerName}</p>
                        <p className="text-xs text-muted-foreground">Seller #{group.sellerId} | {group.options.length} listings found</p>
                      </div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Surviving listing
                        <select
                          className="mt-1 h-9 w-full min-w-[280px] rounded-md border bg-background px-3 text-sm"
                          value={listingSurvivorBySeller[group.sellerId] ?? ""}
                          onChange={(event) => {
                            const value = Number(event.target.value)
                            setListingSurvivorBySeller((current) => ({
                              ...current,
                              [group.sellerId]: Number.isInteger(value) && value > 0 ? value : undefined,
                            }))
                          }}
                        >
                          <option value="">Select a listing to keep</option>
                          {group.options.map((option) => (
                            <option key={`seller-${group.sellerId}-listing-${option.listing.id}`} value={option.listing.id}>
                              {formatListingOption(option)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {group.options.map((option) => (
                        <div key={`seller-${group.sellerId}-detail-${option.listing.id}`} className="flex items-center gap-2">
                          <p>{formatListingOption(option)}</p>
                          <Link
                            href={productDetailsHref(option.productId)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-blue-600 hover:underline"
                          >
                            Open product
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    For the currently selected pair, there are no seller collisions. Pair merge can run without survivor selection.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No seller listing collisions found. Every listing can be merged automatically.</p>
            )}

            {unresolvedPairSellerCollisionGroups.length > 0 ? (
              <p className="text-xs text-amber-600">
                Select a surviving listing for {unresolvedPairSellerCollisionGroups.length} seller collision(s) before merging this pair.
              </p>
            ) : null}
            {weakerSelectionWarnings.length > 0 ? (
              <p className="text-xs text-amber-600">
                Warning: {weakerSelectionWarnings.length} seller choice differs from suggested best listing quality.
              </p>
            ) : null}
            {unresolvedSellerCollisionGroups.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Merge all still requires survivor selection for {unresolvedSellerCollisionGroups.length} collision(s) across the full group.
              </p>
            ) : null}
            {unavailableProductIds.length > 0 ? (
              <p className="text-xs text-red-600">
                Removed from comparison because they no longer exist: {unavailableProductIds.map((id) => `#${id}`).join(", ")}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Estimated final listings: <strong>{estimatedFinalListings}</strong>
            </p>
            <div className="rounded-md border bg-muted/20 p-2 text-xs text-muted-foreground space-y-1">
              <p>Pair impact preview: products removed 1, seller collisions {pairSellerCollisionGroups.length}, final pair listings {estimatedPairFinalListings}.</p>
              <p>Merge-all impact preview: products removed {Math.max(0, mergeCandidates.length - 1)}, seller collisions {sellerCollisionGroups.length}, final group listings {estimatedFinalListings}.</p>
              <p>Auto-suggestions applied: pair {Object.keys(suggestedPairSurvivors).length}, group {Object.keys(suggestedGroupSurvivors).length} seller(s).</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">When product fields conflict:</p>
            <div className="flex flex-wrap gap-3 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="merge-strategy"
                  checked={strategy === "keep-primary"}
                  onChange={() => setStrategy("keep-primary")}
                />
                Keep primary
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="merge-strategy"
                  checked={strategy === "keep-duplicate"}
                  onChange={() => setStrategy("keep-duplicate")}
                />
                Keep duplicate
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="merge-strategy"
                  checked={strategy === "keep-both"}
                  onChange={() => setStrategy("keep-both")}
                />
                Keep both descriptions
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleSingleMerge} disabled={submitting || unresolvedPairSellerCollisionGroups.length > 0 || unavailableProductIds.length > 0}>
              {submitting ? "Merging..." : "Merge Pair"}
            </Button>
            <Button type="button" variant="outline" onClick={handleMergeAllToPrimary} disabled={submitting || unresolvedSellerCollisionGroups.length > 0 || unavailableProductIds.length > 0}>
              Merge All Into Selected Primary
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
