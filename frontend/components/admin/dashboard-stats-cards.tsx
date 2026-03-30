import {
  Boxes,
  FolderTree,
  GitBranch,
  Layers,
  Store,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCategoriesWithParents } from "@/services/admin/categories"
import { getProductListings } from "@/services/admin/product-listings"

type DashboardStats = {
  totalListedProducts: number
  totalListings: number
  totalSellers: number
  totalCategories: number
  totalSubCategories: number
  totalChildCategories: number
  errors: string[]
}

async function loadDashboardStats(): Promise<DashboardStats> {
  const [listingsResult, categoriesResult] = await Promise.allSettled([
    getProductListings(),
    getCategoriesWithParents(),
  ])

  const errors: string[] = []

  const productListings =
    listingsResult.status === "fulfilled" ? listingsResult.value : []
  if (listingsResult.status === "rejected") {
    errors.push(
      listingsResult.reason instanceof Error
        ? listingsResult.reason.message
        : "Unable to load product listings from backend"
    )
  }

  const categories =
    categoriesResult.status === "fulfilled" ? categoriesResult.value : []
  if (categoriesResult.status === "rejected") {
    errors.push(
      categoriesResult.reason instanceof Error
        ? categoriesResult.reason.message
        : "Unable to load categories from backend"
    )
  }

  const sellerSet = new Set<string>()
  const listedProductSet = new Set<number>()
  productListings.forEach((listing) => {
    if (listing.productId !== null) {
      listedProductSet.add(listing.productId)
    }

    if (listing.sellerId !== null) {
      sellerSet.add(`id-${listing.sellerId}`)
      return
    }

    if (listing.sellerName) {
      sellerSet.add(`name-${listing.sellerName}`)
    }
  })

  const categorySet = new Set<string>()
  const subCategorySet = new Set<string>()
  const childCategorySet = new Set<string>()

  categories.forEach((item) => {
    if (item.category) {
      categorySet.add(item.category)
    }

    if (item.subCategory) {
      subCategorySet.add(item.subCategory)
    }

    if (item.childCategory) {
      childCategorySet.add(item.childCategory)
    }
  })

  return {
    totalListedProducts: listedProductSet.size,
    totalListings: productListings.length,
    totalSellers: sellerSet.size,
    totalCategories: categorySet.size,
    totalSubCategories: subCategorySet.size,
    totalChildCategories: childCategorySet.size,
    errors,
  }
}

export default async function DashboardStatsCards() {
  const stats = await loadDashboardStats()

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Boxes className="size-4" />
              Listed Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalListedProducts}</p>
            <p className="text-xs text-muted-foreground">
              {stats.totalListings} total listing rows
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Store className="size-4" />
              Total Sellers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalSellers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FolderTree className="size-4" />
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalCategories}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Layers className="size-4" />
              Sub Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalSubCategories}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <GitBranch className="size-4" />
              Child Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalChildCategories}</p>
          </CardContent>
        </Card>
      </div>

      {stats.errors.length > 0 ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {stats.errors[0]}
        </div>
      ) : null}
    </>
  )
}
