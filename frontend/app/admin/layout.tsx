"use client"

import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

import { AdminProvider } from "@/components/admin/admin-context"
import AdminNavbar from "@/components/admin/adminNavbar"
import { SidebarProvider } from "@/components/ui/sidebar"

const AdminSidebar = dynamic(() => import("@/components/admin/adminSidebar"), {
  ssr: false,
  loading: () => <div className="w-64 shrink-0" />,
})

type AdminLayoutProps = {
  children: ReactNode
}

function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()

  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  return (
    <AdminProvider>
      <SidebarProvider>
        <div className="flex min-h-svh w-full">
          <AdminSidebar />
          <div className="min-w-0 flex-1">
            <AdminNavbar />
            <main className="w-full px-4 py-4 sm:px-6 sm:py-5 lg:px-8">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </AdminProvider>
  )
}

export default AdminLayout
