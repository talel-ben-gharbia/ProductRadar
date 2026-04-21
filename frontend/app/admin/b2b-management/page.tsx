import UsersDataTable from "@/components/admin/users-data-table"

export default function B2BManagementPage() {
  return (
    <section className="w-full max-w-none space-y-4">
      <h1 className="text-2xl font-bold">B2B Management</h1>
      <p className="text-sm text-muted-foreground">
        Manage company and market professional accounts across the platform.
      </p>
      <UsersDataTable initialAccountType="B2B" lockAccountType />
    </section>
  )
}
