"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"

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
import DuplicateCompareMergePanel from "@/components/admin/duplicate-compare-merge-panel"
import MergeProductsPanel from "@/components/admin/merge-products-panel"
import SplitListingsPanel from "@/components/admin/split-listings-panel"

type DuplicateItem = {
  productId: number | null
  name: string
  brand: string | null
  description: string
  specs_json?: Record<string, string> | null
}

type CompareItem = {
  productId: number
  name: string
  brand: string | null
  description: string
  specs_json?: Record<string, string> | null
}

type ActionTab = "merge" | "split" | "compare"

type DuplicateGroup = {
  key: string
  label: string
  signal: string
  confidenceScore: number
  riskLevel: "low" | "medium" | "high"
  confidenceLabel: string
  sellerCollisionCount: number
  listingCount: number
  count: number
  items: DuplicateItem[]
  matchingSpecKeys?: string[]
  differingSpecKeys?: string[]
}

type DuplicatesManagementPanelProps = {
  level1Groups: DuplicateGroup[]
  level2Groups: DuplicateGroup[]
  initialPrimaryId: number | null
  initialDuplicateIds: number[]
}

type ActiveGroupContext = {
  levelTitle: string
  subtitle: string
  groupLabel: string
  signal: string
  groupKey: string
}

type ExcludedProductsByGroup = Record<string, number[]>
type GroupNotesByKey = Record<string, string>

function toCompareItems(primaryId: number | null, duplicateIds: number[], allGroups: DuplicateGroup[]): CompareItem[] {
  const ids = [primaryId, ...duplicateIds].filter((value): value is number => value !== null)

  if (ids.length === 0) {
    return []
  }

  const lookup = new Map<number, CompareItem>()
  for (const group of allGroups) {
    for (const item of group.items) {
      if (item.productId !== null && ids.includes(item.productId) && !lookup.has(item.productId)) {
        lookup.set(item.productId, {
          productId: item.productId,
          name: item.name,
          brand: item.brand,
          description: item.description,
          specs_json: item.specs_json,
        })
      }
    }
  }

  return ids.map((id) => lookup.get(id) ?? {
    productId: id,
    name: `Product #${id}`,
    brand: null,
    description: "",
    specs_json: null,
  })
}

function GroupSection({
  title,
  subtitle,
  groups,
  badgeClass,
  onMergeGroup,
  onMarkGroupAsDifferent,
  excludedProductsByGroup,
  onToggleProductDifferent,
  groupNotesByKey,
}: {
  title: string
  subtitle: string
  groups: DuplicateGroup[]
  badgeClass: string
  onMergeGroup: (group: DuplicateGroup, context: ActiveGroupContext) => void
  onMarkGroupAsDifferent: (group: DuplicateGroup) => void
  excludedProductsByGroup: ExcludedProductsByGroup
  onToggleProductDifferent: (groupKey: string, productId: number) => void
  groupNotesByKey: GroupNotesByKey
}) {
  const [showAll, setShowAll] = useState(false)
  const visibleGroups = showAll ? groups : groups.slice(0, 10)

  function riskBadgeClass(riskLevel: "low" | "medium" | "high"): string {
    if (riskLevel === "low") {
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
    }

    if (riskLevel === "medium") {
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
    }

    return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300"
  }

  function hasVariation(items: DuplicateItem[], selector: (item: DuplicateItem) => string): boolean {
    const values = new Set(items.map((item) => normalize(selector(item))).filter((value) => value !== ""))
    return values.size > 1
  }

  return (
    <details className="rounded-lg border bg-card p-4">
      <summary className="cursor-pointer list-none">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className="mt-1 text-xl font-semibold">{subtitle}</p>
        <p className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>
          {groups.length} groups
        </p>
      </summary>

      <div className="mt-4 space-y-3">
        {groups.length === 0 ? (
          <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">No groups detected.</div>
        ) : (
          visibleGroups.map((group) => {
            const nameDiffers = hasVariation(group.items, (item) => item.name)
            const brandDiffers = hasVariation(group.items, (item) => item.brand ?? "")
            const descriptionDiffers = hasVariation(group.items, (item) => item.description)
            const specsDiffers = hasVariation(group.items, (item) => {
              const s = item.specs_json
              return s ? JSON.stringify(s) : ""
            })

            return (
              <details key={group.key} className="rounded-lg border bg-card p-4">
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{group.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Match signal: {group.signal}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-muted px-2 py-1">Listings: {group.listingCount}</span>
                        <span className="rounded-full bg-muted px-2 py-1">Seller collisions: {group.sellerCollisionCount}</span>
                        {groupNotesByKey[group.key]?.trim() ? (
                          <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Has note</span>
                        ) : null}
                        <span className={`rounded-full px-2 py-1 font-medium ${riskBadgeClass(group.riskLevel)}`}>
                          Risk: {group.riskLevel}
                        </span>
                        {group.matchingSpecKeys && group.matchingSpecKeys.length > 0 ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" title={group.matchingSpecKeys.join(', ')}>
                            Matching: {group.matchingSpecKeys.length}
                          </span>
                        ) : null}
                        {group.differingSpecKeys && group.differingSpecKeys.length > 0 ? (
                          <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" title={group.differingSpecKeys.join(', ')}>
                            Conflicts: {group.differingSpecKeys.length}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
                        {group.count} duplicates
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{group.confidenceLabel}</p>
                    </div>
                  </div>
                </summary>

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onMarkGroupAsDifferent(group)}
                  >
                    These Are Different Products
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      onMergeGroup(group, {
                        levelTitle: title,
                        subtitle,
                        groupLabel: group.label,
                        signal: group.signal,
                        groupKey: group.key,
                      })
                    }
                  >
                    Merge in Popup
                  </Button>
                </div>

                <div className="mt-3 overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={nameDiffers ? "bg-amber-50 dark:bg-amber-950/20" : undefined}>Product</TableHead>
                        <TableHead className={brandDiffers ? "bg-amber-50 dark:bg-amber-950/20" : undefined}>Brand</TableHead>
                        <TableHead className={descriptionDiffers ? "bg-amber-50 dark:bg-amber-950/20" : undefined}>Description</TableHead>
                        <TableHead className={specsDiffers ? "bg-amber-50 dark:bg-amber-950/20" : undefined}>Specifications</TableHead>
                        <TableHead className="w-44 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.items.map((item) => (
                        <TableRow key={`${group.key}-${item.productId ?? item.name}`}>
                          <TableCell className={`font-medium ${nameDiffers ? "bg-amber-50 dark:bg-amber-950/20" : ""}`}>
                            {item.productId !== null ? `#${item.productId} - ` : ""}
                            {item.name}
                            {item.productId !== null ? (
                              <span className="ml-2 inline-flex items-center gap-1">
                                <Link
                                  href={`/admin/products/${item.productId}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-medium text-blue-600 hover:underline"
                                >
                                  Open
                                </Link>
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell className={brandDiffers ? "bg-amber-50 dark:bg-amber-950/20" : undefined}>{item.brand ?? "-"}</TableCell>
                          <TableCell className={`max-w-md truncate text-muted-foreground ${descriptionDiffers ? "bg-amber-50 dark:bg-amber-950/20" : ""}`} title={item.description}>
                            {item.description || "-"}
                          </TableCell>
                          <TableCell className={`max-w-[180px] truncate text-muted-foreground ${specsDiffers ? "bg-amber-50 dark:bg-amber-950/20" : ""}`} title={item.specs_json ? Object.entries(item.specs_json).map(([k, v]) => `${k}: ${v}`).join("\n") : undefined}>
                            {item.specs_json && Object.keys(item.specs_json).length > 0
                              ? Object.entries(item.specs_json).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(", ") + (Object.keys(item.specs_json).length > 3 ? "..." : "")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.productId !== null ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onToggleProductDifferent(group.key, item.productId!)}
                              >
                                {excludedProductsByGroup[group.key]?.includes(item.productId)
                                  ? "Keep In Group"
                                  : "Mark Different"}
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </details>
            )
          })
        )}

        {groups.length > 10 ? (
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowAll((value) => !value)}>
              {showAll ? "Show Top 10" : `Show All (${groups.length})`}
            </Button>
          </div>
        ) : null}
      </div>
    </details>
  )
}

function applyProductExclusionsToGroups(
  groups: DuplicateGroup[],
  excludedProductsByGroup: ExcludedProductsByGroup,
): DuplicateGroup[] {
  return groups
    .map((group) => {
      const excludedIds = excludedProductsByGroup[group.key] ?? []
      const items = group.items.filter((item) => item.productId === null || !excludedIds.includes(item.productId))
      const mergeableCount = items.filter((item) => item.productId !== null).length

      return {
        ...group,
        items,
        count: mergeableCount,
      }
    })
    .filter((group) => group.count >= 2)
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase()
}

function filterAndSortGroups(
  groups: DuplicateGroup[],
  query: string,
  minGroupSize: number,
  minConfidence: number,
  riskFilter: "all" | "low" | "medium" | "high",
  collisionFilter: "all" | "with-collision" | "without-collision",
  sortMode: "size-desc" | "size-asc" | "alpha" | "confidence-desc" | "confidence-asc" | "collisions-desc",
): DuplicateGroup[] {
  const normalizedQuery = normalize(query)

  const filtered = groups.filter((group) => {
    if (group.count < minGroupSize) {
      return false
    }

    if (group.confidenceScore < minConfidence) {
      return false
    }

    if (riskFilter !== "all" && group.riskLevel !== riskFilter) {
      return false
    }

    if (collisionFilter === "with-collision" && group.sellerCollisionCount === 0) {
      return false
    }

    if (collisionFilter === "without-collision" && group.sellerCollisionCount > 0) {
      return false
    }

    if (!normalizedQuery) {
      return true
    }

    const inGroupMeta =
      normalize(group.label).includes(normalizedQuery) ||
      normalize(group.signal).includes(normalizedQuery)

    if (inGroupMeta) {
      return true
    }

    return group.items.some((item) => {
      const productIdText = item.productId !== null ? String(item.productId) : ""
      const specsText = item.specs_json
        ? Object.entries(item.specs_json).map(([k, v]) => `${k} ${v}`).join(" ")
        : ""
      return (
        normalize(item.name).includes(normalizedQuery) ||
        normalize(item.brand).includes(normalizedQuery) ||
        normalize(item.description).includes(normalizedQuery) ||
        normalize(specsText).includes(normalizedQuery) ||
        productIdText.includes(normalizedQuery)
      )
    })
  })

  const sorted = [...filtered]
  if (sortMode === "size-desc") {
    sorted.sort((a, b) => b.count - a.count)
  } else if (sortMode === "size-asc") {
    sorted.sort((a, b) => a.count - b.count)
  } else if (sortMode === "confidence-desc") {
    sorted.sort((a, b) => b.confidenceScore - a.confidenceScore)
  } else if (sortMode === "confidence-asc") {
    sorted.sort((a, b) => a.confidenceScore - b.confidenceScore)
  } else if (sortMode === "collisions-desc") {
    sorted.sort((a, b) => b.sellerCollisionCount - a.sellerCollisionCount)
  } else {
    sorted.sort((a, b) => a.label.localeCompare(b.label))
  }

  return sorted
}

export default function DuplicatesManagementPanel({
  level1Groups,
  level2Groups,
  initialPrimaryId,
  initialDuplicateIds,
}: DuplicatesManagementPanelProps) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(initialPrimaryId !== null && initialDuplicateIds.length > 0)
  const [showCompare, setShowCompare] = useState(false)
  const [activeTab, setActiveTab] = useState<ActionTab>("merge")
  const [primaryId, setPrimaryId] = useState<number | null>(initialPrimaryId)
  const [duplicateIds, setDuplicateIds] = useState<number[]>(initialDuplicateIds)
  const [activeContext, setActiveContext] = useState<ActiveGroupContext | null>(null)
  const [query, setQuery] = useState("")
  const [minGroupSizeRaw, setMinGroupSizeRaw] = useState("2")
  const [minConfidenceRaw, setMinConfidenceRaw] = useState("0")
  const [sortMode, setSortMode] = useState<"size-desc" | "size-asc" | "alpha" | "confidence-desc" | "confidence-asc" | "collisions-desc">("size-desc")
  const [riskFilter, setRiskFilter] = useState<"all" | "low" | "medium" | "high">("all")
  const [collisionFilter, setCollisionFilter] = useState<"all" | "with-collision" | "without-collision">("all")
  const [levelFilter, setLevelFilter] = useState<"all" | "level1" | "level2">("all")

  const [excludedProductsByGroup, setExcludedProductsByGroup] = useState<ExcludedProductsByGroup>({})
  const [groupNotesByKey, setGroupNotesByKey] = useState<GroupNotesByKey>({})

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("duplicates:excluded-products-by-group")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === "object") {
          const next: ExcludedProductsByGroup = {}
          for (const [groupKey, value] of Object.entries(parsed)) {
            if (!Array.isArray(value)) continue
            const ids = (value as unknown[])
              .map((entry) => Number(entry))
              .filter((id) => Number.isInteger(id) && id > 0)
            if (ids.length > 0) {
              next[groupKey] = Array.from(new Set(ids))
            }
          }
          setExcludedProductsByGroup(next)
        }
      }
    } catch {}

    try {
      const raw = window.localStorage.getItem("duplicates:group-notes-by-key")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === "object") {
          const next: GroupNotesByKey = {}
          for (const [groupKey, value] of Object.entries(parsed)) {
            if (typeof value === "string") {
              next[groupKey] = value
            }
          }
          setGroupNotesByKey(next)
        }
      }
    } catch {}
  }, [])

  function persistExcludedProductsByGroup(next: ExcludedProductsByGroup) {
    setExcludedProductsByGroup(next)
    try {
      window.localStorage.setItem("duplicates:excluded-products-by-group", JSON.stringify(next))
    } catch {
      // ignore local storage failures
    }
  }

  function markGroupAsDifferent(group: DuplicateGroup) {
    const allProductIds = group.items
      .map((item) => item.productId)
      .filter((id): id is number => id !== null)

    if (allProductIds.length === 0) {
      return
    }

    const next: ExcludedProductsByGroup = { ...excludedProductsByGroup }
    next[group.key] = Array.from(new Set(allProductIds)).sort((a, b) => a - b)
    persistExcludedProductsByGroup(next)

    if (activeContext?.groupKey === group.key) {
      setModalOpen(false)
    }
  }

  function clearExcludedProducts() {
    persistExcludedProductsByGroup({})
  }

  function toggleProductDifferent(groupKey: string, productId: number) {
    const current = excludedProductsByGroup[groupKey] ?? []
    const nextForGroup = current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId]

    const next: ExcludedProductsByGroup = { ...excludedProductsByGroup }
    if (nextForGroup.length === 0) {
      delete next[groupKey]
    } else {
      next[groupKey] = Array.from(new Set(nextForGroup)).sort((a, b) => a - b)
    }

    persistExcludedProductsByGroup(next)
  }

  function setGroupNote(groupKey: string, note: string) {
    const next: GroupNotesByKey = {
      ...groupNotesByKey,
      [groupKey]: note,
    }

    if (note.trim() === "") {
      delete next[groupKey]
    }

    setGroupNotesByKey(next)
    try {
      window.localStorage.setItem("duplicates:group-notes-by-key", JSON.stringify(next))
    } catch {
      // ignore local storage failures
    }
  }

  function refreshPageImmediately() {
    setShowCompare(false)
    router.refresh()
  }

  const adjustedLevel1Groups = useMemo(
    () => applyProductExclusionsToGroups(level1Groups, excludedProductsByGroup),
    [level1Groups, excludedProductsByGroup],
  )

  const adjustedLevel2Groups = useMemo(
    () => applyProductExclusionsToGroups(level2Groups, excludedProductsByGroup),
    [level2Groups, excludedProductsByGroup],
  )

  const visibleLevel1Groups = useMemo(
    () => adjustedLevel1Groups,
    [adjustedLevel1Groups],
  )

  const visibleLevel2Groups = useMemo(
    () => adjustedLevel2Groups,
    [adjustedLevel2Groups],
  )

  const minGroupSize = Number.isInteger(Number(minGroupSizeRaw)) && Number(minGroupSizeRaw) > 0
    ? Number(minGroupSizeRaw)
    : 2

  const minConfidence = Number.isInteger(Number(minConfidenceRaw))
    ? Math.min(100, Math.max(0, Number(minConfidenceRaw)))
    : 0

  const filteredLevel1Groups = useMemo(
    () => filterAndSortGroups(visibleLevel1Groups, query, minGroupSize, minConfidence, riskFilter, collisionFilter, sortMode),
    [visibleLevel1Groups, query, minGroupSize, minConfidence, riskFilter, collisionFilter, sortMode],
  )

  const filteredLevel2Groups = useMemo(
    () => filterAndSortGroups(visibleLevel2Groups, query, minGroupSize, minConfidence, riskFilter, collisionFilter, sortMode),
    [visibleLevel2Groups, query, minGroupSize, minConfidence, riskFilter, collisionFilter, sortMode],
  )

  const orderedVisibleGroups = useMemo(() => {
    if (levelFilter === "level1") {
      return filteredLevel1Groups
    }

    if (levelFilter === "level2") {
      return filteredLevel2Groups
    }

    return [...filteredLevel1Groups, ...filteredLevel2Groups]
  }, [filteredLevel1Groups, filteredLevel2Groups, levelFilter])

  const detectedTotalGroups = level1Groups.length + level2Groups.length
  const activeGroupsAfterClassification = visibleLevel1Groups.length + visibleLevel2Groups.length
  const filteredVisibleGroupsCount = orderedVisibleGroups.length
  const confirmedDifferentGroups = Math.max(0, detectedTotalGroups - activeGroupsAfterClassification)

  const compareItems = useMemo(
    () => toCompareItems(primaryId, duplicateIds, [...visibleLevel1Groups, ...visibleLevel2Groups]),
    [primaryId, duplicateIds, visibleLevel1Groups, visibleLevel2Groups],
  )

  const openMergePopupFromGroup = useCallback((group: DuplicateGroup, context: ActiveGroupContext) => {
    const mergeableIds = group.items
      .map((item) => item.productId)
      .filter((id): id is number => id !== null)
      .sort((a, b) => a - b)

    if (mergeableIds.length < 2) {
      return
    }

    setPrimaryId(mergeableIds[0])
    setDuplicateIds(mergeableIds.slice(1))
    setActiveContext(context)
    setShowCompare(false)
    setActiveTab("merge")
    setModalOpen(true)
  }, [])

  function getLevelInfo(key: string): { levelTitle: string; subtitle: string } {
    if (key.startsWith("ref:")) return { levelTitle: "Level 1", subtitle: "Same Reference" }
    return { levelTitle: "Level 2", subtitle: "Same Name + Description + Brand + Specs" }
  }

  const openNextMergeGroup = useCallback(() => {
    if (orderedVisibleGroups.length === 0) {
      return
    }

    if (!activeContext) {
      const next = orderedVisibleGroups[0]
      openMergePopupFromGroup(next, {
        ...getLevelInfo(next.key),
        groupLabel: next.label,
        signal: next.signal,
        groupKey: next.key,
      })
      return
    }

    const currentIndex = orderedVisibleGroups.findIndex((group) => group.key === activeContext.groupKey)
    const nextGroup = currentIndex >= 0 ? orderedVisibleGroups[currentIndex + 1] : orderedVisibleGroups[0]
    if (!nextGroup) {
      return
    }

    openMergePopupFromGroup(nextGroup, {
      ...getLevelInfo(nextGroup.key),
      groupLabel: nextGroup.label,
      signal: nextGroup.signal,
      groupKey: nextGroup.key,
    })
  }, [activeContext, openMergePopupFromGroup, orderedVisibleGroups])

  function skipCurrentGroupAndOpenNext() {
    if (!activeContext) {
      return
    }

    const activeGroup = orderedVisibleGroups.find((group) => group.key === activeContext.groupKey)
    if (!activeGroup) {
      return
    }

    markGroupAsDifferent(activeGroup)
    setTimeout(() => {
      openNextMergeGroup()
    }, 0)
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!modalOpen) {
        return
      }

      if (event.key.toLowerCase() === "m") {
        setActiveTab("merge")
      }

      if (event.key.toLowerCase() === "s") {
        setActiveTab("split")
      }

      if (event.key.toLowerCase() === "c") {
        setShowCompare(true)
        setActiveTab("compare")
      }

      if (event.key.toLowerCase() === "n") {
        event.preventDefault()
        openNextMergeGroup()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [modalOpen, openNextMergeGroup])

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">Duplicate Group Controls</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={openNextMergeGroup} disabled={orderedVisibleGroups.length === 0}>
              Merge Next Group
            </Button>
            {Object.keys(excludedProductsByGroup).length > 0 ? (
              <Button type="button" variant="outline" size="sm" onClick={clearExcludedProducts}>
                Clear Product Classifications
              </Button>
            ) : null}
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Confirmed Different (Classified)</p>
            <p className="mt-1 text-xl font-semibold">{confirmedDifferentGroups}</p>
            <p className="mt-1 text-xs text-muted-foreground">Saved from your previous different-product confirmations. Use the Clear Product Classifications button to reset.</p>
          </div>
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active After Classification</p>
            <p className="mt-1 text-xl font-semibold">{activeGroupsAfterClassification}</p>
          </div>
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Visible With Current Filters</p>
            <p className="mt-1 text-xl font-semibold">{filteredVisibleGroupsCount}</p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-6">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Search</label>
            <input
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              placeholder="name, brand, ref, product id"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Minimum Group Size</label>
            <input
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={minGroupSizeRaw}
              onChange={(event) => setMinGroupSizeRaw(event.target.value)}
              inputMode="numeric"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Sort</label>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as "size-desc" | "size-asc" | "alpha" | "confidence-desc" | "confidence-asc" | "collisions-desc")}
            >
              <option value="size-desc">Largest groups first</option>
              <option value="size-asc">Smallest groups first</option>
              <option value="confidence-desc">Highest confidence first</option>
              <option value="confidence-asc">Lowest confidence first</option>
              <option value="collisions-desc">Most seller collisions first</option>
              <option value="alpha">A-Z label</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Minimum Confidence</label>
            <input
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={minConfidenceRaw}
              onChange={(event) => setMinConfidenceRaw(event.target.value)}
              inputMode="numeric"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Risk</label>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={riskFilter}
              onChange={(event) => setRiskFilter(event.target.value as "all" | "low" | "medium" | "high")}
            >
              <option value="all">All risks</option>
              <option value="low">Low risk</option>
              <option value="medium">Medium risk</option>
              <option value="high">High risk</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Seller Collisions</label>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={collisionFilter}
              onChange={(event) => setCollisionFilter(event.target.value as "all" | "with-collision" | "without-collision")}
            >
              <option value="all">All groups</option>
              <option value="with-collision">With collisions</option>
              <option value="without-collision">Without collisions</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Level</label>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={levelFilter}
              onChange={(event) => setLevelFilter(event.target.value as "all" | "level1" | "level2")}
            >
              <option value="all">All Levels</option>
              <option value="level1">Level 1 only</option>
              <option value="level2">Level 2 only</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {levelFilter === "all" || levelFilter === "level1" ? (
          <GroupSection
            title="Level 1"
            subtitle="Same Reference"
            groups={filteredLevel1Groups}
            badgeClass="bg-primary/10 text-primary"
            onMergeGroup={openMergePopupFromGroup}
            onMarkGroupAsDifferent={markGroupAsDifferent}
            excludedProductsByGroup={excludedProductsByGroup}
            onToggleProductDifferent={toggleProductDifferent}
            groupNotesByKey={groupNotesByKey}
          />
        ) : null}
        {levelFilter === "all" || levelFilter === "level2" ? (
          <GroupSection
            title="Level 2"
            subtitle="Same Name + Description + Brand + Specs"
            groups={filteredLevel2Groups}
            badgeClass="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
            onMergeGroup={openMergePopupFromGroup}
            onMarkGroupAsDifferent={markGroupAsDifferent}
            excludedProductsByGroup={excludedProductsByGroup}
            onToggleProductDifferent={toggleProductDifferent}
            groupNotesByKey={groupNotesByKey}
          />
        ) : null}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-6xl xl:max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Duplicate Merge Popup</DialogTitle>
            <DialogDescription>
              Select canonical product and compare all candidates before merging.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {activeContext ? (
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p className="font-semibold">{activeContext.levelTitle}: {activeContext.subtitle}</p>
                <p className="mt-1 text-muted-foreground">Group: {activeContext.groupLabel}</p>
                <p className="mt-1 text-muted-foreground">Signal: {activeContext.signal}</p>
                <p className="mt-1 text-xs text-muted-foreground">Shortcuts: M merge, S split, C compare, N next group</p>
                <div className="mt-2 flex justify-end">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={skipCurrentGroupAndOpenNext}>
                      Skip Group + Next
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={openNextMergeGroup}>
                      Next Group
                    </Button>
                    {compareItems.map((item) => (
                      <Button
                        key={`classify-${activeContext.groupKey}-${item.productId}`}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toggleProductDifferent(activeContext.groupKey, item.productId)}
                      >
                        {excludedProductsByGroup[activeContext.groupKey]?.includes(item.productId)
                          ? `Keep #${item.productId}`
                          : `#${item.productId} Different`}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Merge note for this group</label>
                  <textarea
                    className="min-h-[72px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder="Example: Keep #12843 as canonical because it has cleaner name/category and active listings."
                    value={groupNotesByKey[activeContext.groupKey] ?? ""}
                    onChange={(event) => setGroupNote(activeContext.groupKey, event.target.value)}
                  />
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={activeTab === "merge" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("merge")}
              >
                Merge
              </Button>
              <Button
                type="button"
                variant={activeTab === "split" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("split")}
              >
                Split
              </Button>
              <Button
                type="button"
                variant={activeTab === "compare" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setShowCompare(true)
                  setActiveTab("compare")
                }}
              >
                Compare
              </Button>
            </div>

            {activeTab === "merge" ? (
              <MergeProductsPanel
                initialPrimaryId={primaryId}
                initialDuplicateIds={duplicateIds}
                candidateItems={compareItems}
                onActionComplete={refreshPageImmediately}
              />
            ) : null}

            {activeTab === "split" ? <SplitListingsPanel items={compareItems} onActionComplete={refreshPageImmediately} /> : null}

            {activeTab === "compare" ? (
              <>
                <div className="flex justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowCompare((value) => !value)}>
                    {showCompare ? "Hide Compare Table" : "Show Compare Table"}
                  </Button>
                </div>
                {showCompare ? <DuplicateCompareMergePanel items={compareItems} onActionComplete={refreshPageImmediately} /> : null}
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
