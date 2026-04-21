"use client"

import { useState } from "react"
import { useEffect } from "react"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { mergeProducts } from "@/services/admin/quality"

type MergeProductsPanelProps = {
  initialPrimaryId?: number | null
  initialDuplicateIds?: number[]
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
}: MergeProductsPanelProps) {
  const [primaryIdRaw, setPrimaryIdRaw] = useState(initialPrimaryId ? String(initialPrimaryId) : "")
  const [duplicateIdsRaw, setDuplicateIdsRaw] = useState(initialDuplicateIds.join(", "))
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setPrimaryIdRaw(initialPrimaryId ? String(initialPrimaryId) : "")
    setDuplicateIdsRaw(initialDuplicateIds.join(", "))
  }, [initialPrimaryId, initialDuplicateIds])

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

      <div className="mt-4 flex justify-end">
        <Button onClick={handleMerge} disabled={submitting}>
          {submitting ? "Merging..." : "Run Merge"}
        </Button>
      </div>
    </div>
  )
}
