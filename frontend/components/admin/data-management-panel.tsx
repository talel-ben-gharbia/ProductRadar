"use client"

import DataSourcesPanel from "@/components/admin/data-sources-panel"
import ScrapingLogsPanel from "@/components/admin/scraping-logs-panel"

export default function DataManagementPanel() {
  return (
    <div className="space-y-6">
      <DataSourcesPanel />
      <ScrapingLogsPanel limit={10} />
    </div>
  )
}
