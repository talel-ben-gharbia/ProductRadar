import React from "react"

import DashboardCategoryPies from "@/components/admin/dashboard-category-pies"
import DashboardMonitorCharts from "@/components/admin/dashboard-monitor-charts"
import DashboardPopularBrands from "@/components/admin/dashboard-popular-brands"
import DashboardStatsCards from "@/components/admin/dashboard-stats-cards"

export default function AdminDashboard() {
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
