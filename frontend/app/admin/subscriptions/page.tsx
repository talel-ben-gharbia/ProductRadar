import SubscriptionsPanel from "@/components/admin/subscriptions-panel"

type SubscriptionsPageProps = {
  searchParams?: Promise<{
    scope?: string
  }>
}

export default async function SubscriptionsPage({ searchParams }: SubscriptionsPageProps) {
  const resolved = await searchParams
  const scope = resolved?.scope === "b2b" ? "B2B" : resolved?.scope === "customer" ? "B2C" : undefined

  return (
    <section className="w-full max-w-none space-y-4">
      <h1 className="text-2xl font-bold">Subscription Tracking</h1>
      <p className="text-sm text-muted-foreground">
        Monitor free vs premium plans and all active subscriptions with pagination.
      </p>
      <SubscriptionsPanel accountType={scope} />
    </section>
  )
}
