"use client"

import ScrapingLogsPanel from "@/components/admin/scraping-logs-panel"

export default function DataManagementPanel() {
  return (
    <div className="space-y-6">
      <ScrapingLogsPanel limit={10} />
    </div>
  )
}
