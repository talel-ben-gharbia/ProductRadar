"use client"

import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { useEffect } from "react"
import type { ReactNode } from "react"

import { AdminProvider } from "@/components/admin/admin-context"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ErrorBoundary } from "@/components/error-boundary"

const AdminNavbar = dynamic(() => import("@/components/admin/adminNavbar"), { ssr: false })

const AdminSidebar = dynamic(() => import("@/components/admin/adminSidebar"), {
  ssr: false,
  loading: () => <div className="w-64 shrink-0" />,
})

type AdminLayoutClientProps = {
  children: ReactNode
  initialAdmin: { id: number; email: string; role: string } | null
}

function AdminLayoutClient({ children, initialAdmin }: AdminLayoutClientProps) {
  const pathname = usePathname()

  useEffect(() => {
    const original = Node.prototype.removeChild
    Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
      if (child.parentNode !== this) return child
      return original.call(this, child) as T
    }
    return () => {
      Node.prototype.removeChild = original
    }
  }, [])

  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  return (
    <AdminProvider initialAdmin={initialAdmin}>
      <SidebarProvider>
          <div className="flex min-h-svh w-full">
            <AdminSidebar />
            <div className="min-w-0 flex-1">
              <AdminNavbar />
              <main className="w-full px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
                <ErrorBoundary>{children}</ErrorBoundary>
              </main>
            </div>
          </div>
      </SidebarProvider>
    </AdminProvider>
  )
}

export default AdminLayoutClient
