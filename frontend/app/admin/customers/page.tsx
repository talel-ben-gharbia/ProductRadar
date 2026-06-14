import CustomersMonitoringHub from "@/components/admin/customers-monitoring-hub"

export default function CustomersPage() {
  return (
    <section className="w-full max-w-none space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customer Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor B2C customer accounts, track subscriptions, and manage account statuses.
        </p>
      </div>
      <CustomersMonitoringHub />
    </section>
  )
}
