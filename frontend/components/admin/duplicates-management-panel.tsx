"use client"

import { useMemo, useState } from "react"

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

type DuplicateItem = {
  productId: number | null
  name: string
  brand: string | null
  description: string
}

type CompareItem = {
  productId: number
  name: string
  brand: string | null
  description: string
}

type DuplicateGroup = {
  key: string
  label: string
  signal: string
  confidenceLabel: string
  count: number
  items: DuplicateItem[]
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
}

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
        })
      }
    }
  }

  return ids.map((id) => lookup.get(id) ?? {
    productId: id,
    name: `Product #${id}`,
    brand: null,
    description: "",
  })
}

function GroupSection({
  title,
  subtitle,
  groups,
  badgeClass,
  onMergeGroup,
}: {
  title: string
  subtitle: string
  groups: DuplicateGroup[]
  badgeClass: string
  onMergeGroup: (group: DuplicateGroup, context: ActiveGroupContext) => void
}) {
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
          groups.slice(0, 10).map((group) => (
            <details key={group.key} className="rounded-lg border bg-card p-4">
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{group.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Match signal: {group.signal}</p>
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
                  onClick={() =>
                    onMergeGroup(group, {
                      levelTitle: title,
                      subtitle,
                      groupLabel: group.label,
                      signal: group.signal,
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
                      <TableHead>Product</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((item) => (
                      <TableRow key={`${group.key}-${item.productId ?? item.name}`}>
                        <TableCell className="font-medium">
                          {item.productId !== null ? `#${item.productId} - ` : ""}
                          {item.name}
                        </TableCell>
                        <TableCell>{item.brand ?? "-"}</TableCell>
                        <TableCell className="max-w-md truncate text-muted-foreground" title={item.description}>
                          {item.description || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </details>
          ))
        )}
      </div>
    </details>
  )
}

export default function DuplicatesManagementPanel({
  level1Groups,
  level2Groups,
  initialPrimaryId,
  initialDuplicateIds,
}: DuplicatesManagementPanelProps) {
  const [modalOpen, setModalOpen] = useState(initialPrimaryId !== null && initialDuplicateIds.length > 0)
  const [showCompare, setShowCompare] = useState(false)
  const [primaryId, setPrimaryId] = useState<number | null>(initialPrimaryId)
  const [duplicateIds, setDuplicateIds] = useState<number[]>(initialDuplicateIds)
  const [activeContext, setActiveContext] = useState<ActiveGroupContext | null>(null)

  const compareItems = useMemo(
    () => toCompareItems(primaryId, duplicateIds, [...level1Groups, ...level2Groups]),
    [primaryId, duplicateIds, level1Groups, level2Groups],
  )

  function openMergePopupFromGroup(group: DuplicateGroup, context: ActiveGroupContext) {
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
    setModalOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <GroupSection
          title="Level 1"
          subtitle="Same Reference"
          groups={level1Groups}
          badgeClass="bg-primary/10 text-primary"
          onMergeGroup={openMergePopupFromGroup}
        />
        <GroupSection
          title="Level 2"
          subtitle="Same Name + Description + Brand"
          groups={level2Groups}
          badgeClass="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
          onMergeGroup={openMergePopupFromGroup}
        />
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-4xl">
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
              </div>
            ) : null}

            <MergeProductsPanel
              initialPrimaryId={primaryId}
              initialDuplicateIds={duplicateIds}
            />

            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCompare((value) => !value)}>
                {showCompare ? "Close Compare" : "Open Compare"}
              </Button>
            </div>

            {showCompare ? <DuplicateCompareMergePanel items={compareItems} /> : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
