import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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


function DuplicateGroupCard({ group }: { group: DuplicateGroup }) {
  return (
    <div className="rounded-lg border bg-card p-4">
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

      <div className="mt-4 overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-32">Action</TableHead>
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
                <TableCell>
                  {item.productId !== null ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/product-listings?productId=${item.productId}`}>Review</Link>
                    </Button>
                  ) : (
                    "-"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default async function DuplicatesPage() {
  let level1Groups: DuplicateGroup[] = []
  let level2Groups: DuplicateGroup[] = []
  let fetchError: string | null = null

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
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Duplicate Groups</p>
            <p className="mt-1 text-3xl font-bold">{totalGroups}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Level 1</p>
              <p className="mt-1 text-xl font-semibold">Same Reference</p>
              <p className="mt-1 text-sm text-muted-foreground">Products sharing the same listing reference.</p>
              <p className="mt-3 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {level1Groups.length} groups
              </p>
            </div>

            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Level 2</p>
              <p className="mt-1 text-xl font-semibold">Same Name + Description + Brand</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Normalized content matches excluding Level 1 products.
              </p>
              <p className="mt-3 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                {level2Groups.length} groups
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {totalGroups === 0 ? (
              <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">No duplicate groups detected.</div>
            ) : (
              [...level1Groups, ...level2Groups].slice(0, 25).map((group) => (
                <DuplicateGroupCard key={group.key} group={group} />
              ))
            )}
          </div>
        </>
      )}
    </section>
  )
}
