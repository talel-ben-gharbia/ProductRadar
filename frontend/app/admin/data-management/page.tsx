import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DataManagementPage() {
  return (
    <section className="w-full max-w-none space-y-4">
      <h1 className="text-2xl font-bold">Data Management</h1>
      <p className="text-sm text-muted-foreground">
        <strong className="text-foreground">Scraping Logs</strong> shows execution history/failures,
        and <strong className="text-foreground">Manual Scraping</strong> lets you trigger immediate collection.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>How Data Enters ProductRadar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Mode 1 - Seller API:</strong> if a seller provides an API, register it as an API source.
            The system should test health continuously and confirm fresh records are saved into the database.
          </p>
          <p>
            <strong className="text-foreground">Mode 2 - Scraped Site:</strong> if no API exists, register the seller as a scraping source.
            Scheduled scraping and manual triggers then collect listing and pricing data.
          </p>
          <p>
            <strong className="text-foreground">Data Sources</strong> stores source type and endpoint details (API vs scraping),
            <strong className="text-foreground"> Scraping Logs</strong> shows execution history/failures,
            and <strong className="text-foreground">Manual Scraping</strong> lets you trigger immediate collection.
          </p>
          <p>
            <strong className="text-foreground">Operational rule:</strong> every source must be tagged with exactly one ingestion mode,
            tested regularly, and validated by checking that new rows are arriving in ProductRadar tables.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Scraping Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Monitor scheduled scraping runs, status, duration, and failures.
            </p>
            <Link href="/admin/data-management/scraping-logs" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              Open Scraping Logs
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manual Scraping</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Trigger scraping instantly for a specific seller/category when you need immediate refresh.
            </p>
            <Link href="/admin/data-management/webhook" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              Open Manual Scraping
            </Link>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
