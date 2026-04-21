import ScrapingWebhookPanel from "@/components/admin/scraping-webhook-panel"

export default function ScrapingWebhookPage() {
  return (
    <section className="w-full max-w-none space-y-4">
      <h1 className="text-2xl font-bold">Manual Scraping</h1>
      <p className="text-sm text-muted-foreground">
        Trigger n8n scraping jobs manually from admin controls.
      </p>
      <ScrapingWebhookPanel />
    </section>
  )
}
