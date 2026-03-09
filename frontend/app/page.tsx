import AdminSidebar from "@/components/admin/adminSidebar"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function Page() {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset className="w-0 min-w-0 flex-1 p-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Welcome to the admin dashboard. Here you can manage your categories
          and products.
        </p>
        <div className="mt-4">
          <Button variant="outline">Go to Categories</Button>
          <Button variant="outline" className="ml-2">
            Go to Products
          </Button>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
