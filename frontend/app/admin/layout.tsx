"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

import { AdminProvider } from "@/components/admin/admin-context"
import AdminNavbar from "@/components/admin/adminNavbar"
import AdminSidebar from "@/components/admin/adminSidebar"
import { SidebarProvider } from "@/components/ui/sidebar"

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
