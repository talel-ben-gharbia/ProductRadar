import { getProductListings } from "@/services/product-listings"
import type { ProductListing } from "@/utils/types"

import DashboardMonitorChartsClient from "@/components/admin/dashboard-monitor-charts-client"

export default async function DashboardMonitorCharts() {
  let listings: ProductListing[] = []
  let fetchError: string | null = null

  try {
    listings = await getProductListings()
  } catch (error) {
    fetchError =
      error instanceof Error
        ? error.message
        : "Unable to load product listings from backend"
  }

  return <DashboardMonitorChartsClient listings={listings} fetchError={fetchError} />
}
