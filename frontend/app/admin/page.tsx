import React from 'react'

export default function AdminDashboard() {
  return (
    <div className='w-full'>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">Products</p>
          <p className="text-xl font-bold">120</p>
        </div>

        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">Sellers</p>
          <p className="text-xl font-bold">15</p>
        </div>

        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">Listings</p>
          <p className="text-xl font-bold">540</p>
        </div>

        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">Users</p>
          <p className="text-xl font-bold">300</p>
        </div>
      </div>
    </div>
  )
}
