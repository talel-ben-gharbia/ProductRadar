import dynamic from "next/dynamic"
import React, { Suspense } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import DashboardMonitorCharts from "@/components/admin/dashboard-monitor-charts"
import DashboardStatsCards from "@/components/admin/dashboard-stats-cards"
import { Spinner } from "@/components/ui/spinner"
import { COOKIE_NAME, verifySessionToken } from "@/lib/admin-session"

const DashboardCategoryPies = dynamic(() => import("@/components/admin/dashboard-category-pies"))
const DashboardPopularBrands = dynamic(() => import("@/components/admin/dashboard-popular-brands"))

function DashboardSkeleton() {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      <Spinner className="mr-2 size-4" />
      Loading dashboard data...
    </div>
  )
}

export default async function AdminDashboard() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) {
    redirect("/admin/login")
  }

  const session = await verifySessionToken(token)

  if (!session) {
    redirect("/admin/login")
  }

  return (
    <div className="w-full space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardStatsCards />
      </Suspense>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardMonitorCharts />
      </Suspense>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardPopularBrands />
      </Suspense>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardCategoryPies />
      </Suspense>
    </div>
  )
}
