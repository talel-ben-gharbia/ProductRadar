import React from 'react'
import { SidebarTrigger } from '../ui/sidebar'

function AdminNavbar() {
  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <h1 className="font-semibold">Admin</h1>
      </div>
    </header>
  )
}

export default AdminNavbar
