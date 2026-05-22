import Link from "next/link"

import { Button } from "@/components/ui/button"
import DuplicatesManagementPanel from "@/components/admin/duplicates-management-panel"
import { getProductListings } from "@/services/admin/product-listings"
import { getProducts } from "@/services/admin/products"
import { normalizeSpecs } from "@/utils/specs"
import type { CanonicalSpecs, Product, ProductListing } from "@/utils/types"

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

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .trim().toLowerCase()
    .replace(/[\/\\()\[\]{},;:!?@#$%^&*+=<>~`'"]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function buildGroupStats(productIds: number[], listingsByProductId: Map<number, ProductListing[]>): {
  listingCount: number
  sellerCollisionCount: number
} {
  const sellerToProducts = new Map<number, Set<number>>()
  let listingCount = 0

  for (const productId of productIds) {
    const listings = listingsByProductId.get(productId) ?? []
    listingCount += listings.length

    for (const listing of listings) {
      if (listing.sellerId === null) {
        continue
      }

      const products = sellerToProducts.get(listing.sellerId) ?? new Set<number>()
      products.add(productId)
      sellerToProducts.set(listing.sellerId, products)
    }
  }

  let sellerCollisionCount = 0
  for (const products of sellerToProducts.values()) {
    if (products.size > 1) {
      sellerCollisionCount += 1
    }
  }

  return { listingCount, sellerCollisionCount }
}

function deriveRiskLevel(confidenceScore: number, sellerCollisionCount: number): "low" | "medium" | "high" {
  if (confidenceScore >= 90 && sellerCollisionCount <= 1) {
    return "low"
  }

  if (confidenceScore >= 80 && sellerCollisionCount <= 3) {
    return "medium"
  }

  return "high"
}


function buildReferenceDuplicateGroups(
  listings: ProductListing[],
  productsById: Map<number, Product>,
  listingsByProductId: Map<number, ProductListing[]>,
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
    .map(([ref, refProductIds]) => {
      const items = Array.from(refProductIds)
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

      const groupProductIds = items
        .map((item) => item.productId)
        .filter((id): id is number => id !== null)
      const stats = buildGroupStats(groupProductIds, listingsByProductId)
      const confidenceScore = Math.min(100, 95 + Math.min(5, Math.max(0, stats.sellerCollisionCount - 1)))
      const riskLevel = deriveRiskLevel(confidenceScore, stats.sellerCollisionCount)

      return {
        key: `ref:${ref}`,
        label: `Ref: ${ref}`,
        signal: "same ref",
        confidenceScore,
        riskLevel,
        confidenceLabel: `${confidenceScore}% confidence`,
        sellerCollisionCount: stats.sellerCollisionCount,
        listingCount: stats.listingCount,
        count: items.length,
        items,
      }
    })
    .sort((a, b) => b.count - a.count)
}

function buildNameDescBrandGroups(
  products: Product[],
  productsById: Map<number, Product>,
  listingsByProductId: Map<number, ProductListing[]>,
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

    const rawSpecs = product.specs_json as Record<string, string> | null | undefined
    const canonicalSpecs = normalizeSpecs(rawSpecs ?? null)
    const specKeys = Object.keys(canonicalSpecs).sort()
    const specStr = specKeys.map((k) => `${k}:${canonicalSpecs[k as keyof typeof canonicalSpecs]}`).join('|')

    const key = `${name}|${description}|${brand}|${specStr}`
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

      const productIds = value.map((product) => product.id)
      const stats = buildGroupStats(productIds, listingsByProductId)

      const categoryIds = new Set(
        productIds
          .map((id) => productsById.get(id)?.categoryId ?? null)
          .filter((categoryId): categoryId is number => categoryId !== null),
      )
      const sameCategoryBonus = categoryIds.size === 1 && categoryIds.values().next().value !== undefined ? 8 : 0

      const refs = new Set<string>()
      for (const productId of productIds) {
        for (const listing of listingsByProductId.get(productId) ?? []) {
          const ref = normalize(listing.ref)
          if (ref) {
            refs.add(ref)
          }
        }
      }

      const groupSpecs = new Map<number, CanonicalSpecs>()
      for (const product of value) {
        const raw = product.specs_json as Record<string, string> | null | undefined
        groupSpecs.set(product.id, normalizeSpecs(raw ?? null))
      }

      const allSpecKeys = new Set<string>()
      for (const specs of groupSpecs.values()) {
        for (const k of Object.keys(specs)) {
          allSpecKeys.add(k)
        }
      }

      const matchingSpecKeys: string[] = []
      const differingSpecKeys: string[] = []
      for (const k of allSpecKeys) {
        const values = new Set<string>()
        for (const specs of groupSpecs.values()) {
          const v = (specs as Record<string, string>)[k]
          if (v) values.add(v)
        }
        if (values.size === 1) {
          matchingSpecKeys.push(k)
        } else if (values.size > 1) {
          differingSpecKeys.push(k)
        }
      }

      const hasSpecs = allSpecKeys.size > 0
      const specBonus = hasSpecs ? 5 : 0
      const referenceOverlapBonus = refs.size > 0 && refs.size < Math.max(2, productIds.length * 2) ? 6 : 0
      const collisionPenalty = Math.min(10, stats.sellerCollisionCount * 2)
      const confidenceScore = Math.max(55, Math.min(98, 78 + sameCategoryBonus + referenceOverlapBonus + specBonus - collisionPenalty))
      const riskLevel = deriveRiskLevel(confidenceScore, stats.sellerCollisionCount)

      return {
        key: `ndb:${key}`,
        label: sample.name,
        signal: "same normalized name + description + brand" + (hasSpecs ? " + specs" : ""),
        confidenceScore,
        riskLevel,
        confidenceLabel: `${confidenceScore}% confidence`,
        sellerCollisionCount: stats.sellerCollisionCount,
        listingCount: stats.listingCount,
        count: value.length,
        items: value
          .map((product) => ({
            productId: product.id,
            name: product.name,
            brand: product.brand,
            description: product.description,
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        matchingSpecKeys: matchingSpecKeys.length > 0 ? matchingSpecKeys : undefined,
        differingSpecKeys: differingSpecKeys.length > 0 ? differingSpecKeys : undefined,
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
    const listingsByProductId = new Map<number, ProductListing[]>()

    for (const listing of listings) {
      if (listing.productId === null) {
        continue
      }

      const current = listingsByProductId.get(listing.productId) ?? []
      current.push(listing)
      listingsByProductId.set(listing.productId, current)
    }

    level1Groups = buildReferenceDuplicateGroups(listings, productsById, listingsByProductId)

    const level1ProductIds = new Set<number>()
    for (const group of level1Groups) {
      for (const item of group.items) {
        if (item.productId !== null) {
          level1ProductIds.add(item.productId)
        }
      }
    }

    level2Groups = buildNameDescBrandGroups(products, productsById, listingsByProductId, level1ProductIds)
  } catch (error) {
    fetchError = error instanceof Error ? error.message : "Unable to load duplicate monitoring data"
  }

  const totalGroups = level1Groups.length + level2Groups.length
  return (
    <section className="w-full max-w-none space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Duplicate Finder</h1>
          <p className="text-sm text-muted-foreground">
            Cascading duplicate detection: reference first, then name + description + brand + specifications.
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
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recommended Order</p>
            <p className="mt-1 text-lg font-semibold">Level 1, then Level 2</p>
            <p className="mt-1 text-xs text-muted-foreground">Resolve exact reference matches first for safest cleanup, then name+description+brand+specs groups.</p>
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
