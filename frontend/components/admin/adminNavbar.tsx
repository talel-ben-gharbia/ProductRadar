import React from 'react'
import { SidebarTrigger } from '../ui/sidebar'

function AdminNavbar() {
  return (
    <header className="flex items-center justify-between border-b px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <h1 className="font-semibold">Admin</h1>
      </div>
    </header>
  )
}

export default AdminNavbar
