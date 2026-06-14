import React, { Suspense } from "react"

import TrustScoreAdmin from "./trust-score-admin"
import ProductListingsDataTable from "@/components/admin/product-listings-data-table"
import {
  getProductListings,
} from "@/services/product-listings"
import { getRawCategories, type CategoryRaw } from "@/services/categories"
import { getProducts } from "@/services/products"
import { getSellers } from "@/services/sellers"
import { Skeleton } from "@/components/ui/skeleton"
import type { Product, ProductListing } from "@/utils/types"
import type { Seller } from "@/services/sellers"

type ProductListingsPageProps = {
  searchParams?: Promise<{
    productId?: string
    sellerId?: string
  }>
}

type ProductListingsPageData = {
  productListings: ProductListing[]
  fetchError: string | null
}

type ProductListingsMetaData = {
  products: Product[]
  sellers: Seller[]
  categories: CategoryRaw[]
  fetchError: string | null
}

async function loadProductListingsPageData(
  productId?: number,
  sellerId?: number
): Promise<ProductListingsPageData> {
  let productListings: ProductListing[] = []
  let fetchError: string | null = null

  try {
    productListings = await getProductListings(productId, sellerId)
  } catch (error) {
    fetchError =
      error instanceof Error
        ? error.message
        : "Unable to load product listings from backend"
  }

  return { productListings, fetchError }
}

async function loadProductListingsMetaData(): Promise<ProductListingsMetaData> {
  let products: Product[] = []
  let sellers: Seller[] = []
  let categories: CategoryRaw[] = []
  let fetchError: string | null = null

  try {
    const [allProducts, allSellers, allCategories] = await Promise.all([
      getProducts(),
      getSellers(),
      getRawCategories(),
    ])
    products = allProducts
    sellers = allSellers
    categories = allCategories
  } catch (error) {
    fetchError =
      error instanceof Error
        ? error.message
        : "Unable to load products and sellers from backend"
  }

  return { products, sellers, categories, fetchError }
}

async function ProductListingsPageContent({
  productId,
  sellerId,
}: {
  productId?: number
  sellerId?: number
}) {
  const { productListings, fetchError } =
    await loadProductListingsPageData(productId, sellerId)
  const {
    products,
    sellers,
    categories,
    fetchError: metaFetchError,
  } = await loadProductListingsMetaData()
  const combinedError = fetchError ?? metaFetchError

  return (
    <>
      <h1 className="text-2xl font-bold">Product Listings</h1>

      <TrustScoreAdmin />

      <ProductListingsDataTable
        productListings={productListings}
        products={products}
        sellers={sellers}
        categories={categories}
        fetchError={combinedError}
        currentProductId={productId}
        currentSellerId={sellerId}
      />
    </>
  )
}

function ProductListingsFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-16 w-full rounded-lg" />
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

export default async function ProductListingsPage({
  searchParams,
}: ProductListingsPageProps) {
  const resolvedParams = await searchParams
  const rawProductId = resolvedParams?.productId
  const rawSellerId = resolvedParams?.sellerId
  const parsedProductId = rawProductId ? Number(rawProductId) : undefined
  const parsedSellerId = rawSellerId ? Number(rawSellerId) : undefined
  const productId =
    parsedProductId !== undefined && Number.isFinite(parsedProductId)
      ? parsedProductId
      : undefined
  const sellerId =
    parsedSellerId !== undefined && Number.isFinite(parsedSellerId)
      ? parsedSellerId
      : undefined

  return (
    <section className="w-full max-w-none space-y-4">
      <Suspense fallback={<ProductListingsFallback />}>
        <ProductListingsPageContent productId={productId} sellerId={sellerId} />
      </Suspense>
    </section>
  )
}
