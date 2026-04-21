import UsersDataTable from "@/components/admin/users-data-table"

export default function CustomersPage() {
  return (
    <section className="w-full max-w-none space-y-4">
      <h1 className="text-2xl font-bold">Customer Management</h1>
      <p className="text-sm text-muted-foreground">
        Browse and moderate B2C customer accounts and their subscriptions.
      </p>
      <UsersDataTable initialAccountType="B2C" lockAccountType />
    </section>
  )
}
