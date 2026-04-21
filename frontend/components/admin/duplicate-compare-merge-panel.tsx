"use client"

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
}

type MergeStrategy = "keep-primary" | "keep-duplicate" | "keep-both"

type DuplicateCompareMergePanelProps = {
  items: CompareItem[]
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

export default function DuplicateCompareMergePanel({ items }: DuplicateCompareMergePanelProps) {
  const mergeCandidates = useMemo(
    () => items.filter((item) => Number.isInteger(item.productId) && item.productId > 0),
    [items],
  )
  const [detailsById, setDetailsById] = useState<Record<number, ProductDetails>>({})
  const [loadingComparison, setLoadingComparison] = useState(false)
  const [primaryIdRaw, setPrimaryIdRaw] = useState(mergeCandidates[0] ? String(mergeCandidates[0].productId) : "")
  const [duplicateIdRaw, setDuplicateIdRaw] = useState(mergeCandidates[1] ? String(mergeCandidates[1].productId) : "")
  const [strategy, setStrategy] = useState<MergeStrategy>("keep-primary")
  const [submitting, setSubmitting] = useState(false)

  async function loadComparisonDetails() {
    const ids = mergeCandidates.map((item) => item.productId)
    setLoadingComparison(true)

    try {
      const products = await Promise.all(ids.map((id) => fetchProduct(id)))
      const nextDetails: Record<number, ProductDetails> = {}

      for (const product of products) {
        nextDetails[product.id] = product
      }

      setDetailsById(nextDetails)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load comparison data.")
    } finally {
      setLoadingComparison(false)
    }
  }

  useEffect(() => {
    setPrimaryIdRaw(mergeCandidates[0] ? String(mergeCandidates[0].productId) : "")
    setDuplicateIdRaw(mergeCandidates[1] ? String(mergeCandidates[1].productId) : "")
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

    setSubmitting(true)

    try {
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

      const result = await mergeProducts(primaryId, [duplicateId])
      toast.success(
        `Merged ${result.summary.merged_count} product(s). Moved ${result.summary.moved_listings} listing(s).`,
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Merge failed.")
    } finally {
      setSubmitting(false)
    }
  }

  if (mergeCandidates.length < 2) {
    return null
  }

  const tableProducts = mergeCandidates
    .map((candidate) => detailsById[candidate.productId] ?? {
      id: candidate.productId,
      name: candidate.name,
      brand: candidate.brand,
      description: candidate.description,
      image_url: null,
      categoryId: null,
    })

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
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-2 text-left">Field</th>
                  {tableProducts.map((product) => (
                    <th key={`head-${product.id}`} className="px-3 py-2 text-left">Product #{product.id}</th>
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
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="rounded-md border p-3 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Merge One Pair</p>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Primary Product ID</label>
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
              <label className="text-xs font-medium text-muted-foreground">Duplicate Product ID</label>
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

          <Button type="button" onClick={handleSingleMerge} disabled={submitting}>
            {submitting ? "Merging..." : "Merge Pair"}
          </Button>
        </div>
      </div>
    </div>
  )
}
