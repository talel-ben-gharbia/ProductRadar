import Link from "next/link"

import { B2CNavbar } from "@/components/B2C/b2c-navbar"
import B2CProductListing from "@/components/B2C/b2c-product-listing"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { Separator } from "@/components/ui/separator"
import { getRawCategories } from "@/services/admin/categories"
import type { CategoryRaw } from "@/services/admin/categories"

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

function buildBreadcrumbTrail(categories: CategoryRaw[], categoryId?: number) {
  if (!categoryId) return []
  const byId = new Map<number, CategoryRaw>()
  for (const category of categories) byId.set(category.id, category)
  const trail: CategoryRaw[] = []
  const visited = new Set<number>()
  let current = byId.get(categoryId) ?? null
  while (current && !visited.has(current.id)) {
    trail.push(current)
    visited.add(current.id)
    current = current.parentId ? byId.get(current.parentId) ?? null : null
  }
  return trail.reverse()
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
  const categoryName = getSingleParam(resolvedSearchParams?.categoryName) || "Products"
  const categoryIds = parseCategoryIds(resolvedSearchParams)

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

      <section className="border-b bg-background">
        <div className="w-full px-4 py-2 sm:px-10">
          {rootCategories.length > 0 ? (
            <NavigationMenu viewport={false} className="w-full max-w-none justify-start">
              <NavigationMenuList className="w-full justify-start gap-2">
                {rootCategories.map((category) => (
                  <NavigationMenuItem key={category.id} className="static">
                    <NavigationMenuTrigger className="h-10 rounded-xl px-4 text-sm font-medium">
                      {category.name}
                    </NavigationMenuTrigger>

                    <NavigationMenuContent className="absolute left-0 top-full z-50 mt-2 w-screen max-w-300 rounded-xl border p-6 shadow-lg">
                      {category.under.length > 0 ? (
                        <div className="grid w-full grid-cols-1 gap-x-8 gap-y-6 pr-1 md:grid-cols-2 lg:grid-cols-4">
                          {category.under.map((item) => (
                            <div key={`${category.id}-${item.id}`} className="space-y-2">
                              <Link
                                href={`/B2C/products?categoryIds=${encodeURIComponent(item.allCategoryIds.join(","))}&categoryName=${encodeURIComponent(item.name)}`}
                                className="block text-sm font-semibold text-foreground hover:text-primary"
                              >
                                {item.name}
                              </Link>

                              {item.children.length > 0 ? (
                                <>
                                  <Separator />
                                  <ul className="mt-2 space-y-1">
                                    {item.children.map((child) => (
                                      <li key={`${category.id}-${item.id}-${child.id}`} className="text-sm leading-6">
                                        <Link
                                          href={`/B2C/products?categoryIds=${encodeURIComponent(child.allCategoryIds.join(","))}&categoryName=${encodeURIComponent(child.name)}`}
                                          className="text-muted-foreground hover:text-primary"
                                        >
                                          {child.name}
                                        </Link>
                                      </li>
                                    ))}
                                  </ul>
                                </>
                              ) : (
                                <p className="mt-2 text-sm text-muted-foreground">No child categories</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No under categories</p>
                      )}
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          ) : (
            <p className="px-2 py-1 text-sm text-muted-foreground">No categories available</p>
          )}
        </div>
      </section>

      <main className="mx-auto w-full max-w-8xl px-4 py-6 sm:px-10">
        <Card className="mb-5 rounded-xl border-border/70">
          <CardContent className="flex flex-wrap items-center gap-2 py-3 text-sm">
            <Link href="/" className="font-medium text-muted-foreground hover:text-foreground">
              Accueil
            </Link>

            {breadcrumbTrail.length > 0
              ? breadcrumbTrail.map((crumb) => (
                  <span key={crumb.id} className="flex items-center gap-2 text-muted-foreground">
                    <span>|</span>
                    <span className="font-medium">{crumb.name}</span>
                  </span>
                ))
              : (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span>|</span>
                    <span className="font-medium">{categoryName}</span>
                  </span>
                )}

            {categoryIds.length > 0 ? (
              <Badge variant="outline" className="ml-2">
                {categoryIds.length} categories selected
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
