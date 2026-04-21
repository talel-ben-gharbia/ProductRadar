import Link from "next/link"

import ScrapingLogsPanel from "@/components/admin/scraping-logs-panel"

export default function ScrapingLogsPage() {
  return (
    <section className="w-full max-w-none space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Scraping Logs</h1>
          <p className="text-sm text-muted-foreground">
            Review recent workflow runs, status, and extraction outcomes.
          </p>
        </div>
        <Link
          href="/admin/data-management/webhook"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Manual Scraping
        </Link>
      </div>
      <ScrapingLogsPanel />
    </section>
  )
}
