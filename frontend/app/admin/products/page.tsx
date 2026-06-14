import React, { Suspense } from "react"

import ProductsDataTable from "@/components/admin/products-data-table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getCategoriesWithParents,
} from "@/services/categories"
import { getProductListings } from "@/services/product-listings"
import { getProducts } from "@/services/products"
import type { CategoryWithParent, Product } from "@/utils/types"

type ProductsPageProps = {
  searchParams?: Promise<{
    categoryId?: string
  }>
}

type ProductsPageData = {
  products: Product[]
  fetchError: string | null
}

function deduplicateProducts(products: Product[]): Product[] {
  const uniqueProducts = new Map<string, Product>()

  products.forEach((product) => {
    const normalizedName = product.name.trim().toLowerCase()
    const normalizedDescription = product.description.trim().toLowerCase()

    const dedupeKey = `name-desc:${normalizedName}|${normalizedDescription}`

    if (!uniqueProducts.has(dedupeKey)) {
      uniqueProducts.set(dedupeKey, product)
    }
  })

  return Array.from(uniqueProducts.values())
}

type ProductsCategoriesData = {
  categories: CategoryWithParent[]
  fetchError: string | null
}

async function loadProductsPageData(
  categoryId?: number
): Promise<ProductsPageData> {
  let products: Product[] = []
  let fetchError: string | null = null

  try {
    const [allProducts, allListings] = await Promise.all([
      getProducts(categoryId),
      getProductListings(),
    ])

    const listingCounts = new Map<number, number>()
    for (const listing of allListings) {
      if (listing.productId === null) {
        continue
      }

      listingCounts.set(
        listing.productId,
        (listingCounts.get(listing.productId) ?? 0) + 1,
      )
    }

    products = deduplicateProducts(allProducts).map((product) => ({
      ...product,
      listingCount: listingCounts.get(product.id) ?? 0,
    }))
  } catch (error) {
    fetchError =
      error instanceof Error
        ? error.message
        : "Unable to load products from backend"
  }

  return { products, fetchError }
}

async function loadProductsCategoriesData(): Promise<ProductsCategoriesData> {
  let categories: CategoryWithParent[] = []
  let fetchError: string | null = null

  try {
    categories = await getCategoriesWithParents()
  } catch (error) {
    fetchError =
      error instanceof Error
        ? error.message
        : "Unable to load categories from backend"
  }

  return { categories, fetchError }
}

async function ProductsPageContent({ categoryId }: { categoryId?: number }) {
  const { products, fetchError } = await loadProductsPageData(categoryId)
  const { categories, fetchError: categoriesFetchError } =
    await loadProductsCategoriesData()

  return (
    <>
      <h1 className="text-2xl font-bold">Products</h1>

      <ProductsDataTable
        products={products}
        categories={categories}
        productsError={fetchError}
        categoriesError={categoriesFetchError}
        initialCategoryId={categoryId}
      />
    </>
  )
}

function ProductsFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <div className="rounded-lg border bg-card p-4">
        <Skeleton className="h-10 w-full" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </div>
  )
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedParams = await searchParams
  const rawCategoryId = resolvedParams?.categoryId
  const parsedCategoryId = rawCategoryId ? Number(rawCategoryId) : undefined
  const categoryId =
    parsedCategoryId !== undefined && Number.isFinite(parsedCategoryId)
      ? parsedCategoryId
      : undefined

  return (
    <section className="w-full max-w-none space-y-4">
      <Suspense fallback={<ProductsFallback />}>
        <ProductsPageContent categoryId={categoryId} />
      </Suspense>
    </section>
  )
}
