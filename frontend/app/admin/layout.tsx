import AdminNavbar from '@/components/admin/adminNavbar'
import AdminSidebar from '@/components/admin/adminSidebar'
import { SidebarProvider } from '@/components/ui/sidebar'
import React from 'react'

function AdminLayout({children}:any) {
  return (
    <div className='w-full'>
    <SidebarProvider>
    <div className='flex min-h-svh w-full'>
            <AdminSidebar />
      <div className='min-w-0 w-full flex-1 p-6'>
                <AdminNavbar />
                {children}
            </div>
        </div>
        </SidebarProvider>
    </div>
  )
}

export default AdminLayout
