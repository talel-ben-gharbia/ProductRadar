import ProductsDataTable from "@/components/admin/products-data-table"
import {
  getCategoriesWithParents,
  type CategoryWithParent,
} from "@/services/admin/categories"
import { getProducts, type Product } from "@/services/admin/products"

type ProductsPageProps = {
  searchParams?: Promise<{
    categoryId?: string
  }>
}

type ProductsPageData = {
  products: Product[]
  fetchError: string | null
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
    products = await getProducts(categoryId)
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

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedParams = await searchParams
  const rawCategoryId = resolvedParams?.categoryId
  const parsedCategoryId = rawCategoryId ? Number(rawCategoryId) : undefined
  const categoryId =
    parsedCategoryId !== undefined && Number.isFinite(parsedCategoryId)
      ? parsedCategoryId
      : undefined

  const { products, fetchError } = await loadProductsPageData(categoryId)
  const { categories, fetchError: categoriesFetchError } =
    await loadProductsCategoriesData()

  return (
    <section className="w-full max-w-none space-y-4">
      <h1 className="text-2xl font-bold">Products</h1>

      <ProductsDataTable
        products={products}
        categories={categories}
        productsError={fetchError}
        categoriesError={categoriesFetchError}
        initialCategoryId={categoryId}
      />
    </section>
  )
}
