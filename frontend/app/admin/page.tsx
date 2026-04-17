import React from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import DashboardCategoryPies from "@/components/admin/dashboard-category-pies"
import DashboardMonitorCharts from "@/components/admin/dashboard-monitor-charts"
import DashboardPopularBrands from "@/components/admin/dashboard-popular-brands"
import DashboardStatsCards from "@/components/admin/dashboard-stats-cards"
import { COOKIE_NAME, verifySessionToken } from "@/lib/admin-session"

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

      <DashboardStatsCards />

      <DashboardMonitorCharts />

      <DashboardPopularBrands />

      <DashboardCategoryPies />
    </div>
  )
}
