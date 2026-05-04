import B2BAdminMonitoringHub from "@/components/admin/b2b-admin-monitoring-hub"

export default function B2BManagementPage() {
  return (
    <section className="w-full max-w-none space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">B2B Intelligence Hub</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor company growth, market performance, and professional operational workflows.
        </p>
      </div>
      
      <B2BAdminMonitoringHub />
    </section>
  )
}
