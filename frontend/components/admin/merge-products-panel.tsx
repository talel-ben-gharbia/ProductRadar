"use client"

import { useState } from "react"
import { useEffect } from "react"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { mergeProducts } from "@/services/quality"

type CandidateItem = {
  productId: number
  name: string
  brand: string | null
  description: string
}

type MergeProductsPanelProps = {
  initialPrimaryId?: number | null
  initialDuplicateIds?: number[]
  candidateItems?: CandidateItem[]
  onActionComplete?: () => void
}

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

export default function MergeProductsPanel({
  initialPrimaryId = null,
  initialDuplicateIds = [],
  candidateItems = [],
  onActionComplete,
}: MergeProductsPanelProps) {
  const [primaryIdRaw, setPrimaryIdRaw] = useState(initialPrimaryId ? String(initialPrimaryId) : "")
  const [duplicateIdsRaw, setDuplicateIdsRaw] = useState(initialDuplicateIds.join(", "))
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setPrimaryIdRaw(initialPrimaryId ? String(initialPrimaryId) : "")
    setDuplicateIdsRaw(initialDuplicateIds.join(", "))
  }, [initialPrimaryId, initialDuplicateIds])

  const availableCandidates = candidateItems
    .filter((item) => Number.isInteger(item.productId) && item.productId > 0)
    .sort((a, b) => a.productId - b.productId)

  function setPrimaryFromCandidates(productId: number) {
    setPrimaryIdRaw(String(productId))

    const currentDuplicates = parseIds(duplicateIdsRaw).filter((id) => id !== productId)
    setDuplicateIdsRaw(currentDuplicates.join(", "))
  }

  function toggleDuplicateFromCandidates(productId: number) {
    const currentPrimary = Number(primaryIdRaw)
    if (currentPrimary === productId) {
      return
    }

    const currentDuplicates = parseIds(duplicateIdsRaw)
    const exists = currentDuplicates.includes(productId)
    const nextDuplicates = exists
      ? currentDuplicates.filter((id) => id !== productId)
      : [...currentDuplicates, productId].sort((a, b) => a - b)

    setDuplicateIdsRaw(nextDuplicates.join(", "))
  }

  function autoSelectFromCandidates() {
    if (availableCandidates.length < 2) {
      return
    }

    const suggestedPrimaryId = availableCandidates[0].productId
    const suggestedDuplicates = availableCandidates.slice(1).map((item) => item.productId)

    setPrimaryIdRaw(String(suggestedPrimaryId))
    setDuplicateIdsRaw(suggestedDuplicates.join(", "))
  }

  async function handleMerge() {
    const primaryId = Number(primaryIdRaw)
    const duplicateIds = parseIds(duplicateIdsRaw)

    if (!Number.isInteger(primaryId) || primaryId <= 0) {
      toast.error("Enter a valid primary product ID.")
      return
    }

    if (duplicateIds.length === 0) {
      toast.error("Enter at least one duplicate product ID.")
      return
    }

    if (duplicateIds.includes(primaryId)) {
      toast.error("Primary product ID cannot be included in duplicates.")
      return
    }

    setSubmitting(true)
    try {
      const result = await mergeProducts(primaryId, duplicateIds)
      toast.success(
        `Merged ${result.summary.merged_count} product(s). Moved ${result.summary.moved_listings} listing(s).`,
      )
      setDuplicateIdsRaw("")
      onActionComplete?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Merge failed.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="text-sm font-semibold">Merge Products</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Move listings, alerts, and linked history from duplicate products into a primary product.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Primary Product ID</label>
          <Input
            value={primaryIdRaw}
            onChange={(event) => setPrimaryIdRaw(event.target.value)}
            placeholder="ex: 120"
            inputMode="numeric"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Duplicate Product IDs</label>
          <Input
            value={duplicateIdsRaw}
            onChange={(event) => setDuplicateIdsRaw(event.target.value)}
            placeholder="ex: 221, 305, 410"
          />
        </div>
      </div>

      {availableCandidates.length > 0 ? (
        <div className="mt-4 rounded-md border bg-muted/20 p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Group Candidates</p>
            <Button type="button" variant="outline" size="sm" onClick={autoSelectFromCandidates}>
              Auto-select (lowest ID primary)
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {availableCandidates.map((candidate) => {
              const isPrimary = Number(primaryIdRaw) === candidate.productId
              const isDuplicate = parseIds(duplicateIdsRaw).includes(candidate.productId)

              return (
                <div key={`merge-candidate-${candidate.productId}`} className="rounded-md border bg-card px-2 py-1.5 text-xs space-y-1">
                  <p className="font-semibold">#{candidate.productId} - {candidate.name}</p>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant={isPrimary ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPrimaryFromCandidates(candidate.productId)}
                    >
                      {isPrimary ? "Primary" : "Set Primary"}
                    </Button>
                    <Button
                      type="button"
                      variant={isDuplicate ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleDuplicateFromCandidates(candidate.productId)}
                      disabled={isPrimary}
                    >
                      {isDuplicate ? "Duplicate" : "Mark Duplicate"}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex justify-end">
        <Button onClick={handleMerge} disabled={submitting}>
          {submitting ? "Merging..." : "Run Merge"}
        </Button>
      </div>
    </div>
  )
}
