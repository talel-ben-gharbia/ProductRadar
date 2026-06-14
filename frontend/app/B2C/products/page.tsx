import Link from "next/link"

import { B2CNavbar } from "@/components/B2C/b2c-navbar"
import B2CProductListing from "@/components/B2C/b2c-product-listing"
import { CategoryNavDropdown } from "@/components/B2C/category-nav-dropdown"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { getRawCategories } from "@/services/categories"
import type { CategoryRaw } from "@/services/categories"
import { getServerLocale } from "@/lib/get-server-locale"
import { serverT } from "@/lib/translations"
import { translateCategoryName } from "@/lib/category-translations"

type ProductsPageProps = {
  searchParams?: Promise<{
    search?: string | string[]
    categoryId?: string | string[]
    categoryIds?: string | string[]
    categoryName?: string | string[]
  }>
}

type RootCategoryMenu = {
  id: number
  name: string
  under: Array<{
    id: number
    name: string
    allCategoryIds: number[]
    children: Array<{
      id: number
      name: string
      allCategoryIds: number[]
    }>
  }>
}

function getSingleParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] ?? ""
  return value ?? ""
}

function parseCategoryIds(params?: { categoryId?: string | string[]; categoryIds?: string | string[] }) {
  const ids = new Set<number>()
  if (params?.categoryIds) {
    const categoryIdsValue = Array.isArray(params.categoryIds) ? params.categoryIds[0] ?? "" : params.categoryIds
    for (const rawId of categoryIdsValue.split(",")) {
      const parsed = Number(rawId)
      if (Number.isInteger(parsed) && parsed > 0) ids.add(parsed)
    }
  }
  if (params?.categoryId) {
    const categoryIdValue = Array.isArray(params.categoryId) ? params.categoryId[0] ?? "" : params.categoryId
    const parsed = Number(categoryIdValue)
    if (Number.isInteger(parsed) && parsed > 0) ids.add(parsed)
  }
  return [...ids]
}

type BreadcrumbItem = {
  id: number
  name: string
  allCategoryIds: number[]
}

function buildBreadcrumbTrail(categories: CategoryRaw[], categoryId?: number) {
  if (!categoryId) return [] as BreadcrumbItem[]
  const byId = new Map<number, CategoryRaw>()
  const byParent = new Map<number | null, CategoryRaw[]>()
  for (const c of categories) {
    byId.set(c.id, c)
    const arr = byParent.get(c.parentId) ?? []
    arr.push(c)
    byParent.set(c.parentId, arr)
  }
  const trail: CategoryRaw[] = []
  const visited = new Set<number>()
  let current = byId.get(categoryId) ?? null
  while (current && !visited.has(current.id)) {
    trail.push(current)
    visited.add(current.id)
    current = current.parentId ? byId.get(current.parentId) ?? null : null
  }
  trail.reverse()

  function descendants(id: number): number[] {
    const direct = byParent.get(id) ?? []
    const ids: number[] = []
    for (const child of direct) {
      ids.push(child.id)
      ids.push(...descendants(child.id))
    }
    return ids
  }

  return trail.map((c) => ({
    id: c.id,
    name: c.name,
    allCategoryIds: [c.id, ...descendants(c.id)],
  }))
}

function buildRootCategoriesForMenu(rows: CategoryRaw[]): RootCategoryMenu[] {
  const byParent = new Map<number | null, CategoryRaw[]>()
  for (const row of rows) {
    const parentRows = byParent.get(row.parentId) ?? []
    parentRows.push(row)
    byParent.set(row.parentId, parentRows)
  }
  function getDescendantIds(categoryId: number): number[] {
    const directChildren = byParent.get(categoryId) ?? []
    const descendants: number[] = []
    for (const child of directChildren) {
      descendants.push(child.id)
      descendants.push(...getDescendantIds(child.id))
    }
    return descendants
  }
  const roots = byParent.get(null) ?? []
  return roots.map((root) => ({
    id: root.id,
    name: root.name,
    under: (byParent.get(root.id) ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      allCategoryIds: [item.id, ...getDescendantIds(item.id)],
      children: (byParent.get(item.id) ?? []).map((child) => ({
        id: child.id,
        name: child.name,
        allCategoryIds: [child.id, ...getDescendantIds(child.id)],
      })).sort((a, b) => a.name.localeCompare(b.name)),
    })).sort((a, b) => b.children.length - a.children.length),
  })).sort((a, b) => a.name.localeCompare(b.name))
}

export default async function B2CProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedSearchParams = await searchParams
  const searchTerm = getSingleParam(resolvedSearchParams?.search).trim()
  const categoryIds = parseCategoryIds(resolvedSearchParams)
  const locale = await getServerLocale()
  const t = (key: string, params?: Record<string, string | number>) => serverT(locale, key, params)
  const categoryName = getSingleParam(resolvedSearchParams?.categoryName) || t("general.products")

  const categoryRows = await getRawCategories().catch(() => [] as CategoryRaw[])

  const excludedNav = [
    "composants informatique", "périphériques & accessoires",
    "accessoires téléphonie", "smartphone et mobile",
    "son", "console et jeux",
  ].map((n) => n.toLowerCase())

  const primaryCategoryId = categoryIds[0]
  const breadcrumbTrail = buildBreadcrumbTrail(categoryRows, primaryCategoryId)
  const rootCategories = buildRootCategoriesForMenu(categoryRows)
    .filter((r) => !excludedNav.includes(r.name.toLowerCase()))

  return (
    <div className="min-h-svh bg-muted/30">
      <B2CNavbar title="Products radar" />

      <section className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-8xl items-center px-4 py-2 sm:px-10">
          <CategoryNavDropdown categories={rootCategories} />
        </div>
      </section>

      <main className="mx-auto w-full max-w-8xl px-4 py-6 sm:px-10">
        <Card className="mb-5 rounded-xl border-border/70">
          <CardContent className="flex flex-wrap items-center gap-2 py-3 text-sm">
            <Link href="/" className="font-medium text-muted-foreground hover:text-foreground">
              {t("detail.home")}
            </Link>
            <span className="text-muted-foreground">/</span>
            <Link href="/B2C/products" className="font-medium text-muted-foreground hover:text-foreground">
              {t("detail.products")}
            </Link>

            {breadcrumbTrail.length > 0
              ? breadcrumbTrail.map((crumb) => (
                  <span key={crumb.id} className="flex items-center gap-2 text-muted-foreground">
                    <span>/</span>
                    <Link
                      href={`/B2C/products?categoryIds=${encodeURIComponent(crumb.allCategoryIds.join(","))}&categoryName=${encodeURIComponent(crumb.name)}`}
                      className="font-medium hover:text-foreground"
                    >
                      {translateCategoryName(locale, crumb.name)}
                    </Link>
                  </span>
                ))
              : (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span>/</span>
                    <span className="font-medium">{translateCategoryName(locale, categoryName)}</span>
                  </span>
                )}

            {categoryIds.length > 0 ? (
              <Badge variant="outline" className="ml-2">
                {t("category.categories_selected", { count: categoryIds.length })}
              </Badge>
            ) : null}
          </CardContent>
        </Card>

        <B2CProductListing
          categoryIds={categoryIds}
          searchTerm={searchTerm}
        />
      </main>
    </div>
  )
}
