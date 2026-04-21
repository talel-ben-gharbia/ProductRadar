import DataSourcesPanel from "@/components/admin/data-sources-panel"

export default function DataSourcesPage() {
  return (
    <section className="w-full max-w-none space-y-4">
      <h1 className="text-2xl font-bold">Data Sources</h1>
      <p className="text-sm text-muted-foreground">
        Register each seller as API or SCRAPER, test source health regularly, and monitor success/error signals.
      </p>
      <DataSourcesPanel />
    </section>
  )
}
