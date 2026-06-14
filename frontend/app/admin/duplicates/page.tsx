import React, { Suspense } from "react"
import Link from "next/link"
import { createHash } from "crypto"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import DuplicatesManagementPanel from "@/components/admin/duplicates-management-panel"
import { getProductListings } from "@/services/product-listings"
import { getProducts } from "@/services/products"
import { normalizeSpecs } from "@/utils/specs"
import type { CanonicalSpecs, Product, ProductListing } from "@/utils/types"

type DuplicateItem = {
  productId: number | null
  name: string
  brand: string | null
  description: string
  image_url: string | null
  categoryId: number | null
  specs_json?: Record<string, string> | null
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

/* Normalize REF: uppercase + remove spaces only — preserve - _ / etc. */
function normalizeRef(ref: string | null | undefined): string {
  return (ref ?? "").trim().toUpperCase().replace(/\s+/g, "")
}

/* Normalize composite field: lowercase → remove accents → punctuation→space → collapse spaces */
function normalizeCompositeField(text: string | null | undefined): string {
  return (text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex")
}

function getCompositeFingerprint(product: Product): string {
  const name = normalizeCompositeField(product.name)
  const brand = normalizeCompositeField(product.brand)
  const description = normalizeCompositeField(product.description)

  const rawSpecs = product.specs_json as Record<string, string> | null | undefined
  const specEntries: string[] = []
  if (rawSpecs) {
    for (const key of Object.keys(rawSpecs).sort()) {
      const k = normalizeCompositeField(key)
      const v = normalizeCompositeField(rawSpecs[key])
      if (k && v) specEntries.push(`${k}:${v}`)
    }
  }
  const specStr = specEntries.join(" ")

  const combined = [name, brand, description, specStr].filter(Boolean).join(" ")
  return sha256(combined)
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
      if (listing.sellerId === null) continue
      const products = sellerToProducts.get(listing.sellerId) ?? new Set<number>()
      products.add(productId)
      sellerToProducts.set(listing.sellerId, products)
    }
  }

  let sellerCollisionCount = 0
  for (const products of sellerToProducts.values()) {
    if (products.size > 1) sellerCollisionCount += 1
  }

  return { listingCount, sellerCollisionCount }
}

function deriveRiskLevel(confidenceScore: number, sellerCollisionCount: number): "low" | "medium" | "high" {
  if (confidenceScore >= 90 && sellerCollisionCount <= 1) return "low"
  if (confidenceScore >= 80 && sellerCollisionCount <= 3) return "medium"
  return "high"
}

/* ------------------------------------------------------------------ */
/*  Level 1 — REF matching                                            */
/* ------------------------------------------------------------------ */

function buildReferenceDuplicateGroups(
  listings: ProductListing[],
  productsById: Map<number, Product>,
  listingsByProductId: Map<number, ProductListing[]>,
): DuplicateGroup[] {
  const groups = new Map<string, Set<number>>()
  const productFingerprints = new Map<number, string>()

  for (const listing of listings) {
    const ref = normalizeRef(listing.ref)
    if (!ref || listing.productId === null) continue
    const existing = groups.get(ref)
    if (existing) {
      existing.add(listing.productId)
    } else {
      groups.set(ref, new Set([listing.productId]))
    }
  }

  const rawGroups = Array.from(groups.entries())
    .filter(([, productIds]) => productIds.size > 1)

  const result: DuplicateGroup[] = []
  for (const [ref, refProductIds] of rawGroups) {
    const items = Array.from(refProductIds)
      .map((id) => {
        const product = productsById.get(id)
        if (product && !productFingerprints.has(id)) {
          productFingerprints.set(id, getCompositeFingerprint(product))
        }
        return {
          productId: id,
          name: product?.name ?? `Product #${id}`,
          brand: product?.brand ?? null,
          description: product?.description ?? "",
          image_url: product?.image_url ?? null,
          categoryId: product?.categoryId ?? null,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))

    const groupProductIds = items
      .map((item) => item.productId)
      .filter((id): id is number => id !== null)

    /* Composite similarity check: discard false positives where
       completely different products share an accidental numeric ref */
    const fpCounts = new Map<string, number>()
    for (const id of groupProductIds) {
      const fp = productFingerprints.get(id)
      if (fp) fpCounts.set(fp, (fpCounts.get(fp) ?? 0) + 1)
    }
    const hasSameFingerprint = [...fpCounts.values()].some((c) => c > 1)

    let isValid = hasSameFingerprint
    if (!isValid && groupProductIds.length >= 2) {
      for (let i = 0; i < groupProductIds.length && !isValid; i++) {
        for (let j = i + 1; j < groupProductIds.length && !isValid; j++) {
          const a = productsById.get(groupProductIds[i])
          const b = productsById.get(groupProductIds[j])
          if (!a || !b) continue
          const wordsA = new Set(
            normalizeCompositeField(a.name + " " + (a.brand ?? ""))
              .split(/\s+/).filter((w) => w.length >= 3),
          )
          const wordsB = new Set(
            normalizeCompositeField(b.name + " " + (b.brand ?? ""))
              .split(/\s+/).filter((w) => w.length >= 3),
          )
          for (const w of wordsA) {
            if (wordsB.has(w)) { isValid = true; break }
          }
        }
      }
    }
    if (!isValid) continue

    const stats = buildGroupStats(groupProductIds, listingsByProductId)
    const confidenceScore = Math.min(100, 95 + Math.min(5, Math.max(0, stats.sellerCollisionCount - 1)))
    const riskLevel = deriveRiskLevel(confidenceScore, stats.sellerCollisionCount)

    result.push({
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
    })
  }

  return result.sort((a, b) => b.count - a.count)
}

/* ------------------------------------------------------------------ */
/*  Level 2 — Composite fingerprint                                    */
/*  Only runs on products NOT matched in Level 1.                      */
/*  Products must have BYTE-FOR-BYTE identical SHA-256 fingerprint     */
/*  of normalized name + brand + description + specs.                  */
/* ------------------------------------------------------------------ */

function buildNameDescBrandGroups(
  products: Product[],
  productsById: Map<number, Product>,
  listingsByProductId: Map<number, ProductListing[]>,
  excludedProductIds: Set<number>,
): DuplicateGroup[] {
  const groups = new Map<string, Product[]>()

  for (const product of products) {
    if (excludedProductIds.has(product.id)) continue
    const fp = getCompositeFingerprint(product)
    if (!fp) continue
    const existing = groups.get(fp)
    if (existing) {
      existing.push(product)
    } else {
      groups.set(fp, [product])
    }
  }

  return Array.from(groups.entries())
    .filter(([, value]) => value.length > 1)
    .map(([fp, value]) => {
      const sample = value[0]
      const productIds = value.map((p) => p.id)
      const stats = buildGroupStats(productIds, listingsByProductId)

      const categoryIds = new Set(
        productIds.map((id) => productsById.get(id)?.categoryId ?? null).filter((cid): cid is number => cid !== null),
      )
      const sameCategoryBonus = categoryIds.size === 1 ? 8 : 0

      const refs = new Set<string>()
      for (const pid of productIds) {
        for (const listing of listingsByProductId.get(pid) ?? []) {
          const ref = normalizeRef(listing.ref)
          if (ref) refs.add(ref)
        }
      }

      const groupSpecs = new Map<number, CanonicalSpecs>()
      for (const p of value) {
        groupSpecs.set(p.id, normalizeSpecs(p.specs_json ?? null))
      }
      const allSpecKeys = new Set<string>()
      for (const specs of groupSpecs.values()) {
        for (const k of Object.keys(specs)) allSpecKeys.add(k)
      }
      const matchingSpecKeys: string[] = []
      const differingSpecKeys: string[] = []
      for (const k of allSpecKeys) {
        const vals = new Set<string>()
        for (const specs of groupSpecs.values()) {
          const v = (specs as Record<string, string>)[k]
          if (v) vals.add(v)
        }
        if (vals.size === 1) matchingSpecKeys.push(k)
        else if (vals.size > 1) differingSpecKeys.push(k)
      }

      const hasSpecs = allSpecKeys.size > 0
      const specBonus = hasSpecs ? 5 : 0
      const refOverlapBonus = refs.size > 0 && refs.size < Math.max(2, productIds.length * 2) ? 6 : 0
      const collisionPenalty = Math.min(10, stats.sellerCollisionCount * 2)
      const confidenceScore = Math.max(55, Math.min(98, 78 + sameCategoryBonus + refOverlapBonus + specBonus - collisionPenalty))
      const riskLevel = deriveRiskLevel(confidenceScore, stats.sellerCollisionCount)

      return {
        key: `fp:${fp.slice(0, 12)}`,
        label: sample.name,
        signal: "same SHA-256 fingerprint (name + brand + description + specs)",
        confidenceScore,
        riskLevel,
        confidenceLabel: `${confidenceScore}% confidence`,
        sellerCollisionCount: stats.sellerCollisionCount,
        listingCount: stats.listingCount,
        count: value.length,
        items: value.map((p) => ({
          productId: p.id,
          name: p.name,
          brand: p.brand,
          description: p.description,
          image_url: p.image_url,
          categoryId: p.categoryId,
          specs_json: p.specs_json as Record<string, string> | null | undefined,
        })).sort((a, b) => a.name.localeCompare(b.name)),
        matchingSpecKeys: matchingSpecKeys.length > 0 ? matchingSpecKeys : undefined,
        differingSpecKeys: differingSpecKeys.length > 0 ? differingSpecKeys : undefined,
      }
    })
    .sort((a, b) => b.count - a.count)
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

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

async function DuplicatesPageContent({
  initialPrimaryId,
  initialDuplicateIds,
}: {
  initialPrimaryId: number | null
  initialDuplicateIds: number[]
}) {
  let level1Groups: DuplicateGroup[] = []
  let level2Groups: DuplicateGroup[] = []
  let fetchError: string | null = null

  try {
    const [products, listings] = await Promise.all([getProducts(), getProductListings()])
    const productsById = new Map<number, Product>(products.map((product) => [product.id, product]))
    const listingsByProductId = new Map<number, ProductListing[]>()

    for (const listing of listings) {
      if (listing.productId === null) continue
      const current = listingsByProductId.get(listing.productId) ?? []
      current.push(listing)
      listingsByProductId.set(listing.productId, current)
    }

    level1Groups = buildReferenceDuplicateGroups(listings, productsById, listingsByProductId)

    const level1ProductIds = new Set<number>()
    for (const group of level1Groups) {
      for (const item of group.items) {
        if (item.productId !== null) level1ProductIds.add(item.productId)
      }
    }

    level2Groups = buildNameDescBrandGroups(products, productsById, listingsByProductId, level1ProductIds)
  } catch (error) {
    fetchError = error instanceof Error ? error.message : "Unable to load duplicate monitoring data"
  }

  const totalGroups = level1Groups.length + level2Groups.length

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Duplicate Finder</h1>
          <p className="text-sm text-muted-foreground">
            Cascading duplicate detection: exact REF match → SHA-256 composite fingerprint.
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
            <p className="mt-1 text-xs text-muted-foreground">
              Resolve exact reference matches first (uppercase, spaces removed, dashes/slashes preserved).
              Then SHA-256 composite fingerprint of name+brand+description+specs.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm font-semibold">Rules</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>REF: uppercase + remove spaces only. Dashes, slashes, underscores preserved. Exact match required.</li>
              <li>REF groups verified by composite similarity check (discards false positives).</li>
              <li>Level 2: all four fields normalized (lowercase, accents removed, punctuation stripped, spaces collapsed).</li>
              <li>Spec keys sorted alphabetically before hashing. Entire string SHA-256 hashed.</li>
              <li>Products match Level 2 only if their SHA-256 fingerprints are byte-for-byte identical.</li>
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
    </>
  )
}

function DuplicatesFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-20 rounded-lg" />
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  )
}

export default async function DuplicatesPage({ searchParams }: DuplicatesPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const initialPrimaryId = parseOptionalPositiveInt(resolvedSearchParams.primary)
  const initialDuplicateIds = parseIdList(resolvedSearchParams.duplicates)

  return (
    <section className="w-full max-w-none space-y-4">
      <Suspense fallback={<DuplicatesFallback />}>
        <DuplicatesPageContent
          initialPrimaryId={initialPrimaryId}
          initialDuplicateIds={initialDuplicateIds}
        />
      </Suspense>
    </section>
  )
}
