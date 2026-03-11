import ProductListingsDataTable from "@/components/admin/product-listings-data-table"
import {
  getProductListings,
  type ProductListing,
} from "@/services/admin/product-listings"

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

  const { productListings, fetchError } =
    await loadProductListingsPageData(productId, sellerId)

  return (
    <section className="w-full max-w-none space-y-4">
      <h1 className="text-2xl font-bold">Product Listings</h1>

      <ProductListingsDataTable
        productListings={productListings}
        fetchError={fetchError}
        currentProductId={productId}
        currentSellerId={sellerId}
      />
    </section>
  )
}
