import Link from "next/link"

import { Button } from "@/components/ui/button"
import DuplicatesManagementPanel from "@/components/admin/duplicates-management-panel"
import { getProductListings } from "@/services/admin/product-listings"
import { getProducts } from "@/services/admin/products"
import type { Product, ProductListing } from "@/utils/types"

type DuplicateItem = {
  productId: number | null
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

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ")
}

function buildReferenceDuplicateGroups(
  listings: ProductListing[],
  productsById: Map<number, Product>,
): DuplicateGroup[] {
  const groups = new Map<string, Set<number>>()

  for (const listing of listings) {
    const ref = normalize(listing.ref)
    if (!ref || listing.productId === null) {
      continue
    }

    const existing = groups.get(ref)
    if (existing) {
      existing.add(listing.productId)
      continue
    }

    groups.set(ref, new Set([listing.productId]))
  }

  return Array.from(groups.entries())
    .filter(([, productIds]) => productIds.size > 1)
    .map(([ref, productIds]) => {
      const items = Array.from(productIds)
        .map((id) => {
          const product = productsById.get(id)
          return {
            productId: id,
            name: product?.name ?? `Product #${id}`,
            brand: product?.brand ?? null,
            description: product?.description ?? "",
          }
        })
        .sort((a, b) => a.name.localeCompare(b.name))

      return {
        key: `ref:${ref}`,
        label: `Ref: ${ref}`,
        signal: "same ref",
        confidenceLabel: "100% confidence",
        count: items.length,
        items,
      }
    })
    .sort((a, b) => b.count - a.count)
}

function buildNameDescBrandGroups(
  products: Product[],
  excludedProductIds: Set<number>,
): DuplicateGroup[] {
  const groups = new Map<string, Product[]>()

  for (const product of products) {
    if (excludedProductIds.has(product.id)) {
      continue
    }

    const name = normalize(product.name)
    const description = normalize(product.description)
    const brand = normalize(product.brand)
    if (!name || !description || !brand) {
      continue
    }

    const key = `${name}|${description}|${brand}`
    const existing = groups.get(key)
    if (existing) {
      existing.push(product)
      continue
    }

    groups.set(key, [product])
  }

  return Array.from(groups.entries())
    .filter(([, value]) => value.length > 1)
    .map(([key, value]) => {
      const sample = value[0]

      return {
        key: `ndb:${key}`,
        label: sample.name,
        signal: "same normalized name + description + brand",
        confidenceLabel: "85% confidence",
        count: value.length,
        items: value
          .map((product) => ({
            productId: product.id,
            name: product.name,
            brand: product.brand,
            description: product.description,
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }
    })
    .sort((a, b) => b.count - a.count)
}


type DuplicatesPageProps = {
  searchParams?: Promise<{
    primary?: string
    duplicates?: string
  }>
}

function parseOptionalPositiveInt(value: string | undefined): number | null {
  if (!value) return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

function parseIdList(raw: string | undefined): number[] {
  if (!raw) return []
  return Array.from(
    new Set(
      raw
        .split(/[\s,]+/)
        .map((part) => Number(part.trim()))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  )
}

export default async function DuplicatesPage({ searchParams }: DuplicatesPageProps) {
  let level1Groups: DuplicateGroup[] = []
  let level2Groups: DuplicateGroup[] = []
  let fetchError: string | null = null

  const resolvedSearchParams = (await searchParams) ?? {}
  const initialPrimaryId = parseOptionalPositiveInt(resolvedSearchParams.primary)
  const initialDuplicateIds = parseIdList(resolvedSearchParams.duplicates)

  try {
    const [products, listings] = await Promise.all([getProducts(), getProductListings()])
    const productsById = new Map<number, Product>(products.map((product) => [product.id, product]))

    level1Groups = buildReferenceDuplicateGroups(listings, productsById)

    const level1ProductIds = new Set<number>()
    for (const group of level1Groups) {
      for (const item of group.items) {
        if (item.productId !== null) {
          level1ProductIds.add(item.productId)
        }
      }
    }

    level2Groups = buildNameDescBrandGroups(products, level1ProductIds)
  } catch (error) {
    fetchError = error instanceof Error ? error.message : "Unable to load duplicate monitoring data"
  }

  const totalGroups = level1Groups.length + level2Groups.length
  const mergeReadyGroups = [...level1Groups, ...level2Groups].filter((group) =>
    group.items.filter((item) => item.productId !== null).length > 1,
  ).length
  const uniqueProductIds = new Set<number>()
  for (const group of [...level1Groups, ...level2Groups]) {
    for (const item of group.items) {
      if (item.productId !== null) {
        uniqueProductIds.add(item.productId)
      }
    }
  }

  return (
    <section className="w-full max-w-none space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Duplicate Finder</h1>
          <p className="text-sm text-muted-foreground">
            Cascading duplicate detection: reference first, then name + description + brand.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/admin/duplicates">Refresh</Link>
        </Button>
      </div>

      {fetchError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {fetchError}
        </div>
      ) : (
        <>
          <div id="merge-panel" className="space-y-3">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm font-semibold">What is a duplicate?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                A duplicate means the same real-world product was created multiple times in ProductRadar.
                This splits price history, reviews, and monitoring signals. Merge duplicates to keep one canonical product.
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Duplicate Groups</p>
            <p className="mt-1 text-3xl font-bold">{totalGroups}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Merge-Ready Groups</p>
              <p className="mt-1 text-3xl font-bold">{mergeReadyGroups}</p>
              <p className="mt-1 text-xs text-muted-foreground">Groups with at least 2 product IDs available for merge.</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Products Involved</p>
              <p className="mt-1 text-3xl font-bold">{uniqueProductIds.size}</p>
              <p className="mt-1 text-xs text-muted-foreground">Unique products participating in duplicate signals.</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recommended Order</p>
              <p className="mt-1 text-lg font-semibold">Level 1, then Level 2</p>
              <p className="mt-1 text-xs text-muted-foreground">Resolve exact reference matches first for safest cleanup.</p>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm font-semibold">Cleanup Workflow</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Open a group and review listing-level evidence.</li>
              <li>Select the canonical product (best name/brand/category completeness).</li>
              <li>Use Prepare Merge to prefill the merge panel.</li>
              <li>Merge duplicates, then verify listing and alert ownership.</li>
            </ul>
          </div>

          <DuplicatesManagementPanel
            level1Groups={level1Groups}
            level2Groups={level2Groups}
            initialPrimaryId={initialPrimaryId}
            initialDuplicateIds={initialDuplicateIds}
          />

          {totalGroups === 0 ? (
            <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">No duplicate groups detected.</div>
          ) : null}
        </>
      )}
    </section>
  )
}
