"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  deleteProductListing,
  setProductListingActive,
  updateProductListing,
} from "@/services/product-listings"

type CollisionListing = {
  id: number
  ref: string | null
  price: number | null
  isActive: boolean | null
  productUrl: string | null
}

type SellerCollisionIncident = {
  key: string
  productId: number
  productName: string
  sellerId: number
  sellerName: string
  listingCount: number
  uniqueRefCount: number
  listings: CollisionListing[]
  suggestedTargetProductId: number | null
  suggestedTargetProductName: string | null
}

type SellerCollisionQualityPanelProps = {
  incidents: SellerCollisionIncident[]
}

type ClassificationOption = {
  value: string
  label: string
}

type ClassificationFamily = "move" | "keep" | "split" | "manual"
type SortMode = "listings-desc" | "listings-asc" | "refs-desc" | "product-asc" | "seller-asc"
type SuggestionFilter = "all" | "with-suggestion" | "without-suggestion"
type ReviewFilter = "all" | "reviewed" | "unreviewed"

const CLASSIFICATION_STORAGE_KEY = "quality:seller-collision:classification"
const NOTE_STORAGE_KEY = "quality:seller-collision:note"

function toMoney(value: number | null): string {
  if (value === null) {
    return "-"
  }

  return (
    value.toLocaleString("fr-TN", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }) + " DT"
  )
}

function getDefaultClassification(incident: SellerCollisionIncident): string {
  if (incident.suggestedTargetProductId !== null) {
    return `move-to-${incident.suggestedTargetProductId}`
  }

  return "keep-one-drop-extras"
}

function readLocalStorageRecord(key: string): Record<string, string> {
  if (typeof window === "undefined") {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") {
      return {}
    }

    const next: Record<string, string> = {}
    for (const [entryKey, entryValue] of Object.entries(parsed)) {
      if (typeof entryValue === "string") {
        next[entryKey] = entryValue
      }
    }

    return next
  } catch {
    return {}
  }
}

function persistLocalStorageRecord(key: string, value: Record<string, string>) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore local storage failures
  }
}

function normalizeText(value: string | number | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
}

function getClassificationFamily(value: string): ClassificationFamily {
  if (value.startsWith("move-to-")) {
    return "move"
  }

  if (value === "split-to-new-product") {
    return "split"
  }

  if (value === "manual-review") {
    return "manual"
  }

  return "keep"
}

function toSafeAnchorId(key: string): string {
  return `incident-${key.replace(/[^a-zA-Z0-9-_]/g, "-")}`
}

export default function SellerCollisionQualityPanel({ incidents }: SellerCollisionQualityPanelProps) {
  const router = useRouter()
  const [classificationByKey, setClassificationByKey] = useState<Record<string, string>>(() =>
    readLocalStorageRecord(CLASSIFICATION_STORAGE_KEY),
  )
  const [noteByKey, setNoteByKey] = useState<Record<string, string>>(() =>
    readLocalStorageRecord(NOTE_STORAGE_KEY),
  )
  const [query, setQuery] = useState("")
  const [sortMode, setSortMode] = useState<SortMode>("listings-desc")
  const [classificationFilter, setClassificationFilter] = useState<"all" | ClassificationFamily>("all")
  const [suggestionFilter, setSuggestionFilter] = useState<SuggestionFilter>("all")
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all")
  const [minListingCountRaw, setMinListingCountRaw] = useState("2")
  const [openByKey, setOpenByKey] = useState<Record<string, boolean>>({})
  const [reviewIncidentKey, setReviewIncidentKey] = useState<string | null>(null)
  const [resolveSelectionById, setResolveSelectionById] = useState<Record<number, boolean>>({})
  const [resolveTargetProductIdRaw, setResolveTargetProductIdRaw] = useState("")
  const [resolveSubmitting, setResolveSubmitting] = useState(false)

  const resolvedClassifications = useMemo(() => {
    const next: Record<string, string> = {}
    for (const incident of incidents) {
      next[incident.key] = classificationByKey[incident.key] ?? getDefaultClassification(incident)
    }

    return next
  }, [incidents, classificationByKey])

  const classificationCounts = useMemo(() => {
    const totals = {
      move: 0,
      keep: 0,
      split: 0,
      manual: 0,
    }

    for (const incident of incidents) {
      const value = resolvedClassifications[incident.key]
      if (value?.startsWith("move-to-")) {
        totals.move += 1
      } else if (value === "keep-one-drop-extras") {
        totals.keep += 1
      } else if (value === "split-to-new-product") {
        totals.split += 1
      } else {
        totals.manual += 1
      }
    }

    return totals
  }, [incidents, resolvedClassifications])

  const minListingCount = Number.isInteger(Number(minListingCountRaw)) && Number(minListingCountRaw) > 0
    ? Number(minListingCountRaw)
    : 1

  const isReviewed = useCallback((incidentKey: string): boolean => {
    const hasClassification = Object.prototype.hasOwnProperty.call(classificationByKey, incidentKey)
    const hasNote = Boolean((noteByKey[incidentKey] ?? "").trim())
    return hasClassification || hasNote
  }, [classificationByKey, noteByKey])

  const visibleIncidents = useMemo(() => {
    const normalizedQuery = normalizeText(query)

    const filtered = incidents.filter((incident) => {
      if (incident.listingCount < minListingCount) {
        return false
      }

      if (suggestionFilter === "with-suggestion" && incident.suggestedTargetProductId === null) {
        return false
      }

      if (suggestionFilter === "without-suggestion" && incident.suggestedTargetProductId !== null) {
        return false
      }

      const classificationValue = resolvedClassifications[incident.key]
      const family = getClassificationFamily(classificationValue)
      if (classificationFilter !== "all" && family !== classificationFilter) {
        return false
      }

      const reviewed = isReviewed(incident.key)
      if (reviewFilter === "reviewed" && !reviewed) {
        return false
      }

      if (reviewFilter === "unreviewed" && reviewed) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      const refText = incident.listings.map((listing) => listing.ref ?? "").join(" ")
      const listingIds = incident.listings.map((listing) => String(listing.id)).join(" ")

      const haystack = [
        incident.productName,
        incident.sellerName,
        incident.productId,
        incident.sellerId,
        refText,
        listingIds,
      ]
        .map((value) => normalizeText(value))
        .join(" ")

      return haystack.includes(normalizedQuery)
    })

    const sorted = [...filtered]
    if (sortMode === "listings-desc") {
      sorted.sort((a, b) => b.listingCount - a.listingCount)
    } else if (sortMode === "listings-asc") {
      sorted.sort((a, b) => a.listingCount - b.listingCount)
    } else if (sortMode === "refs-desc") {
      sorted.sort((a, b) => b.uniqueRefCount - a.uniqueRefCount)
    } else if (sortMode === "seller-asc") {
      sorted.sort((a, b) => a.sellerName.localeCompare(b.sellerName))
    } else {
      sorted.sort((a, b) => a.productName.localeCompare(b.productName))
    }

    return sorted
  }, [
    incidents,
    minListingCount,
    suggestionFilter,
    resolvedClassifications,
    classificationFilter,
    reviewFilter,
    query,
    sortMode,
    isReviewed,
  ])

  const reviewedCount = useMemo(() => incidents.filter((incident) => isReviewed(incident.key)).length, [incidents, isReviewed])
  const unreviewedVisibleCount = useMemo(() => visibleIncidents.filter((incident) => !isReviewed(incident.key)).length, [visibleIncidents, isReviewed])
  const reviewIncident = useMemo(
    () => incidents.find((incident) => incident.key === reviewIncidentKey) ?? null,
    [incidents, reviewIncidentKey],
  )

  const resolveSelectedListingIds = useMemo(() => {
    if (!reviewIncident) {
      return [] as number[]
    }

    return reviewIncident.listings
      .filter((listing) => resolveSelectionById[listing.id] ?? false)
      .map((listing) => listing.id)
  }, [reviewIncident, resolveSelectionById])

  useEffect(() => {
    if (!reviewIncident) {
      setResolveSelectionById({})
      setResolveTargetProductIdRaw("")
      return
    }

    const nextSelection: Record<number, boolean> = {}
    for (const listing of reviewIncident.listings.slice(1)) {
      nextSelection[listing.id] = true
    }

    setResolveSelectionById(nextSelection)
    setResolveTargetProductIdRaw(
      reviewIncident.suggestedTargetProductId !== null
        ? String(reviewIncident.suggestedTargetProductId)
        : String(reviewIncident.productId),
    )
  }, [reviewIncident])

  function setOpenState(incidentKey: string, isOpen: boolean) {
    setOpenByKey((current) => ({
      ...current,
      [incidentKey]: isOpen,
    }))
  }

  function openAllVisible() {
    const next: Record<string, boolean> = { ...openByKey }
    for (const incident of visibleIncidents) {
      next[incident.key] = true
    }
    setOpenByKey(next)
  }

  function closeAllVisible() {
    const next: Record<string, boolean> = { ...openByKey }
    for (const incident of visibleIncidents) {
      next[incident.key] = false
    }
    setOpenByKey(next)
  }

  function scrollToNextUnreviewed() {
    const nextIncident = visibleIncidents.find((incident) => !isReviewed(incident.key))
    if (!nextIncident) {
      return
    }

    setOpenState(nextIncident.key, true)

    const target = document.getElementById(toSafeAnchorId(nextIncident.key))
    target?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  function openResolveIncident(incidentKey: string) {
    setReviewIncidentKey(incidentKey)
  }

  function closeResolveIncident() {
    setReviewIncidentKey(null)
  }

  function setAllResolveSelections(isSelected: boolean) {
    if (!reviewIncident) {
      return
    }

    const next: Record<number, boolean> = {}
    for (const listing of reviewIncident.listings) {
      next[listing.id] = isSelected
    }

    setResolveSelectionById(next)
  }

  async function applyCollisionFix(action: "move" | "deactivate" | "delete") {
    if (!reviewIncident) {
      return
    }

    const selectedListings = reviewIncident.listings.filter((listing) => resolveSelectionById[listing.id] ?? false)
    if (selectedListings.length === 0) {
      toast.error("Select at least one listing to fix.")
      return
    }

    setResolveSubmitting(true)
    try {
      if (action === "move") {
        const targetProductId = Number(resolveTargetProductIdRaw)
        if (!Number.isInteger(targetProductId) || targetProductId <= 0) {
          toast.error("Target product ID must be a positive number.")
          return
        }

        if (targetProductId === reviewIncident.productId) {
          toast.error("Choose a different target product to resolve the collision.")
          return
        }

        await Promise.all(
          selectedListings.map((listing) =>
            updateProductListing(listing.id, {
              productId: targetProductId,
            }),
          ),
        )

        toast.success(`Moved ${selectedListings.length} listing(s) to product #${targetProductId}.`)
      } else if (action === "deactivate") {
        await Promise.all(selectedListings.map((listing) => setProductListingActive(listing.id, false)))
        toast.success(`Deactivated ${selectedListings.length} listing(s).`)
      } else {
        await Promise.all(selectedListings.map((listing) => deleteProductListing(listing.id)))
        toast.success(`Deleted ${selectedListings.length} listing(s).`)
      }

      closeResolveIncident()
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to apply collision fix.")
    } finally {
      setResolveSubmitting(false)
    }
  }

  function applyBulkClassification(mode: "keep" | "manual" | "split" | "suggested") {
    const next: Record<string, string> = { ...classificationByKey }

    for (const incident of visibleIncidents) {
      if (mode === "keep") {
        next[incident.key] = "keep-one-drop-extras"
      } else if (mode === "manual") {
        next[incident.key] = "manual-review"
      } else if (mode === "split") {
        next[incident.key] = "split-to-new-product"
      } else if (incident.suggestedTargetProductId !== null) {
        next[incident.key] = `move-to-${incident.suggestedTargetProductId}`
      }
    }

    setClassificationByKey(next)
    persistLocalStorageRecord(CLASSIFICATION_STORAGE_KEY, next)
  }

  function getFamilyBadgeClass(value: string): string {
    const family = getClassificationFamily(value)
    if (family === "move") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
    if (family === "split") return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300"
    if (family === "manual") return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300"
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
  }

  function setClassification(incidentKey: string, value: string) {
    const next = {
      ...classificationByKey,
      [incidentKey]: value,
    }
    setClassificationByKey(next)
    persistLocalStorageRecord(CLASSIFICATION_STORAGE_KEY, next)
  }

  function setIncidentNote(incidentKey: string, value: string) {
    const next = {
      ...noteByKey,
      [incidentKey]: value,
    }

    if (value.trim() === "") {
      delete next[incidentKey]
    }

    setNoteByKey(next)
    persistLocalStorageRecord(NOTE_STORAGE_KEY, next)
  }

  function clearSavedClassifications() {
    setClassificationByKey({})
    setNoteByKey({})
    setOpenByKey({})
    persistLocalStorageRecord(CLASSIFICATION_STORAGE_KEY, {})
    persistLocalStorageRecord(NOTE_STORAGE_KEY, {})
  }

  if (incidents.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        No seller collision incidents found. Every product currently has at most one listing per seller.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">Classification Summary</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={openAllVisible}>
              Expand Visible
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={closeAllVisible}>
              Collapse Visible
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={scrollToNextUnreviewed}>
              Jump To Next Unreviewed
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={clearSavedClassifications}>
              Clear Saved Classifications
            </Button>
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-6">
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Move To Other Product</p>
            <p className="mt-1 text-xl font-semibold">{classificationCounts.move}</p>
          </div>
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Keep One In Product</p>
            <p className="mt-1 text-xl font-semibold">{classificationCounts.keep}</p>
          </div>
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Split To New Product</p>
            <p className="mt-1 text-xl font-semibold">{classificationCounts.split}</p>
          </div>
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Manual Review</p>
            <p className="mt-1 text-xl font-semibold">{classificationCounts.manual}</p>
          </div>
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reviewed</p>
            <p className="mt-1 text-xl font-semibold">{reviewedCount}</p>
          </div>
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Visible Unreviewed</p>
            <p className="mt-1 text-xl font-semibold">{unreviewedVisibleCount}</p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Search</label>
            <input
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              placeholder="product, seller, ref, listing id"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Min Listings</label>
            <input
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              inputMode="numeric"
              value={minListingCountRaw}
              onChange={(event) => setMinListingCountRaw(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Suggestion</label>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={suggestionFilter}
              onChange={(event) => setSuggestionFilter(event.target.value as SuggestionFilter)}
            >
              <option value="all">All</option>
              <option value="with-suggestion">With suggestion</option>
              <option value="without-suggestion">Without suggestion</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Classification</label>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={classificationFilter}
              onChange={(event) => setClassificationFilter(event.target.value as "all" | ClassificationFamily)}
            >
              <option value="all">All</option>
              <option value="move">Move</option>
              <option value="keep">Keep</option>
              <option value="split">Split</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Reviewed</label>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={reviewFilter}
              onChange={(event) => setReviewFilter(event.target.value as ReviewFilter)}
            >
              <option value="all">All</option>
              <option value="reviewed">Reviewed only</option>
              <option value="unreviewed">Unreviewed only</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Sort</label>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
            >
              <option value="listings-desc">Most listings first</option>
              <option value="listings-asc">Fewest listings first</option>
              <option value="refs-desc">Most unique refs first</option>
              <option value="product-asc">Product A-Z</option>
              <option value="seller-asc">Seller A-Z</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => applyBulkClassification("suggested")}>
            Apply Suggested To Visible
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => applyBulkClassification("keep")}>
            Mark Visible As Keep
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => applyBulkClassification("split")}>
            Mark Visible As Split
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => applyBulkClassification("manual")}>
            Mark Visible As Manual
          </Button>
          <span className="text-xs text-muted-foreground">Visible incidents: {visibleIncidents.length}</span>
        </div>
      </div>

      <div className="space-y-3">
        {visibleIncidents.map((incident) => {
          const selectedClassification = resolvedClassifications[incident.key]
          const reviewed = isReviewed(incident.key)

          const options: ClassificationOption[] = [
            { value: "keep-one-drop-extras", label: "Keep one listing in current product, remove extra listings" },
            { value: "split-to-new-product", label: "Split duplicate listing to a new product" },
            { value: "manual-review", label: "Needs manual investigation" },
          ]

          if (incident.suggestedTargetProductId !== null && incident.suggestedTargetProductName) {
            options.unshift({
              value: `move-to-${incident.suggestedTargetProductId}`,
              label: `Move extra listing(s) to #${incident.suggestedTargetProductId} - ${incident.suggestedTargetProductName}`,
            })
          }

          return (
            <details
              id={toSafeAnchorId(incident.key)}
              key={incident.key}
              className="rounded-lg border bg-card p-4"
              open={openByKey[incident.key] ?? false}
              onToggle={(event) => setOpenState(incident.key, (event.currentTarget as HTMLDetailsElement).open)}
            >
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      Product #{incident.productId} - {incident.productName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Seller #{incident.sellerId} - {incident.sellerName}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-muted px-2 py-1">Listings: {incident.listingCount}</span>
                      <span className="rounded-full bg-muted px-2 py-1">Unique refs: {incident.uniqueRefCount}</span>
                      <span className={`rounded-full px-2 py-1 ${getFamilyBadgeClass(selectedClassification)}`}>
                        {getClassificationFamily(selectedClassification)}
                      </span>
                      <span className={`rounded-full px-2 py-1 ${reviewed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                        {reviewed ? "Reviewed" : "Unreviewed"}
                      </span>
                      {incident.suggestedTargetProductId !== null ? (
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          Suggested target: #{incident.suggestedTargetProductId}
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-1">No target suggestion</span>
                      )}
                    </div>
                  </div>
                </div>
              </summary>

              <div className="mt-4 space-y-3">
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Classification</label>
                    <select
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                      value={selectedClassification}
                      onChange={(event) => setClassification(incident.key, event.target.value)}
                    >
                      {options.map((option) => (
                        <option key={`${incident.key}-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {incident.suggestedTargetProductId !== null ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setClassification(incident.key, `move-to-${incident.suggestedTargetProductId}`)}
                      >
                        Apply Suggested
                      </Button>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => openResolveIncident(incident.key)}>
                      Resolve Collision
                    </Button>
                    <Button asChild type="button" variant="outline" size="sm">
                      <Link href={`/admin/product-listings?productId=${incident.productId}&sellerId=${incident.sellerId}`}>
                        Open Product + Seller Listings
                      </Link>
                    </Button>
                    <Button asChild type="button" variant="outline" size="sm">
                      <Link href={`/admin/product-listings?sellerId=${incident.sellerId}`}>
                        Open All Seller Listings
                      </Link>
                    </Button>
                    {incident.suggestedTargetProductId !== null ? (
                      <Button asChild type="button" variant="outline" size="sm">
                        <Link href={`/admin/duplicates?primary=${incident.suggestedTargetProductId}&duplicates=${incident.productId}#merge-panel`}>
                          Review In Duplicates Tool
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Operator Note</label>
                  <textarea
                    className="min-h-[72px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder="Write why this collision should be moved, kept, split, or manually reviewed."
                    value={noteByKey[incident.key] ?? ""}
                    onChange={(event) => setIncidentNote(incident.key, event.target.value)}
                  />
                </div>

                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Listing</TableHead>
                        <TableHead className="w-56">Ref</TableHead>
                        <TableHead className="w-36">Price</TableHead>
                        <TableHead className="w-32">Status</TableHead>
                        <TableHead className="w-36 text-right">Link</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incident.listings.map((listing) => (
                        <TableRow key={`${incident.key}-listing-${listing.id}`}>
                          <TableCell>#{listing.id}</TableCell>
                          <TableCell>{listing.ref ?? "-"}</TableCell>
                          <TableCell>{toMoney(listing.price)}</TableCell>
                          <TableCell>{listing.isActive === false ? "Inactive" : "Active"}</TableCell>
                          <TableCell className="text-right">
                            {listing.productUrl ? (
                              <a
                                href={listing.productUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-medium text-blue-600 hover:underline"
                              >
                                Open URL
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </details>
          )
        })}

        {visibleIncidents.length === 0 ? (
          <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
            No incidents match current filters.
          </div>
        ) : null}
      </div>

      <Dialog open={reviewIncident !== null} onOpenChange={(open) => (open ? null : closeResolveIncident())}>
        <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-4xl">
          {reviewIncident ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  Resolve Collision: Product #{reviewIncident.productId} - {reviewIncident.productName}
                </DialogTitle>
                <DialogDescription>
                  Seller #{reviewIncident.sellerId} - {reviewIncident.sellerName}. Select the listings to move, deactivate, or delete so the collision is fixed in the backend.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-muted px-2 py-1">Listings: {reviewIncident.listingCount}</span>
                  <span className="rounded-full bg-muted px-2 py-1">Unique refs: {reviewIncident.uniqueRefCount}</span>
                  {reviewIncident.suggestedTargetProductId !== null ? (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                      Suggested target: #{reviewIncident.suggestedTargetProductId}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-muted px-2 py-1">
                    Selected listings: {resolveSelectedListingIds.length}
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Target Product ID</label>
                    <input
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                      inputMode="numeric"
                      value={resolveTargetProductIdRaw}
                      onChange={(event) => setResolveTargetProductIdRaw(event.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap items-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setAllResolveSelections(true)}>
                      Select All
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setAllResolveSelections(false)}>
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => applyCollisionFix("move")}
                    disabled={resolveSubmitting}
                  >
                    Move Selected
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyCollisionFix("deactivate")}
                    disabled={resolveSubmitting}
                  >
                    Deactivate Selected
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => applyCollisionFix("delete")}
                    disabled={resolveSubmitting}
                  >
                    Delete Selected
                  </Button>
                </div>

                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Fix</TableHead>
                        <TableHead className="w-24">Listing</TableHead>
                        <TableHead className="w-48">Ref</TableHead>
                        <TableHead className="w-36">Price</TableHead>
                        <TableHead className="w-32">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reviewIncident.listings.map((listing) => (
                        <TableRow key={`popup-${reviewIncident.key}-${listing.id}`}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={resolveSelectionById[listing.id] ?? false}
                              onChange={(event) =>
                                setResolveSelectionById((current) => ({
                                  ...current,
                                  [listing.id]: event.target.checked,
                                }))
                              }
                            />
                          </TableCell>
                          <TableCell>#{listing.id}</TableCell>
                          <TableCell>{listing.ref ?? "-"}</TableCell>
                          <TableCell>{toMoney(listing.price)}</TableCell>
                          <TableCell>{listing.isActive === false ? "Inactive" : "Active"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {listing.productUrl ? (
                                <Button asChild type="button" variant="outline" size="sm">
                                  <a href={listing.productUrl} target="_blank" rel="noreferrer">
                                    Open Listing URL
                                  </a>
                                </Button>
                              ) : null}
                              <Button asChild type="button" variant="outline" size="sm">
                                <Link href={`/admin/product-listings?productId=${reviewIncident.productId}&sellerId=${reviewIncident.sellerId}`}>
                                  Open In Admin List
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <p className="text-xs text-muted-foreground">
                  Tip: keep the correct listing selected, then move the wrong ones to the target product or deactivate/delete them.
                </p>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
