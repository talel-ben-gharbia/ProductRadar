"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { toast } from "sonner"

import { useAdmin } from "@/components/admin/admin-context"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createSeller, deleteSeller, updateSeller, type Seller } from "@/services/sellers"

type SellerRow = Seller & {
  listingsCount: number
  productsCount: number
  activeListingsCount: number
}

type SellersManagementTableProps = {
  initialSellers: SellerRow[]
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ""
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export default function SellersManagementTable({ initialSellers }: SellersManagementTableProps) {
  const { admin } = useAdmin()
  const canManage = admin?.role === "ROLE_SUPER_ADMIN"
  const [sellers, setSellers] = useState<SellerRow[]>(initialSellers)
  const [query, setQuery] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [activeSeller, setActiveSeller] = useState<SellerRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")

  const filteredSellers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return sellers
    }

    return sellers.filter((seller) => {
      return [seller.id, seller.name, seller.url, seller.listingsCount, seller.productsCount, seller.activeListingsCount]
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ")
        .includes(normalizedQuery)
    })
  }, [query, sellers])

  const summary = useMemo(() => {
    return {
      totalSellers: sellers.length,
      sellersWithListings: sellers.filter((seller) => seller.listingsCount > 0).length,
      totalListings: sellers.reduce((sum, seller) => sum + seller.listingsCount, 0),
      activeListings: sellers.reduce((sum, seller) => sum + seller.activeListingsCount, 0),
    }
  }, [sellers])

  function openCreateDialog() {
    setActiveSeller(null)
    setName("")
    setUrl("")
    setCreateOpen(true)
  }

  function openEditDialog(seller: SellerRow) {
    setActiveSeller(seller)
    setName(seller.name)
    setUrl(seller.url ?? "")
    setEditOpen(true)
  }

  async function handleCreate() {
    if (!canManage) return

    const nextName = name.trim()
    const nextUrl = normalizeUrl(url)
    if (!nextName || !nextUrl) {
      toast.error("Seller name and url are required.")
      return
    }

    setSaving(true)
    try {
      const created = await createSeller({ name: nextName, url: nextUrl })
      setSellers((current) => [
        { ...created, listingsCount: 0, productsCount: 0, activeListingsCount: 0 },
        ...current,
      ])
      setCreateOpen(false)
      toast.success("Seller created.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create seller.")
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate() {
    if (!canManage || !activeSeller) return

    const nextName = name.trim()
    const nextUrl = normalizeUrl(url)
    if (!nextName || !nextUrl) {
      toast.error("Seller name and url are required.")
      return
    }

    setSaving(true)
    try {
      const updated = await updateSeller(activeSeller.id, { name: nextName, url: nextUrl })
      setSellers((current) =>
        current.map((seller) =>
          seller.id === activeSeller.id
            ? { ...seller, name: updated.name, url: updated.url }
            : seller,
        ),
      )
      setEditOpen(false)
      setActiveSeller(null)
      toast.success("Seller updated.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update seller.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!canManage || !activeSeller) return

    setDeleting(true)
    try {
      await deleteSeller(activeSeller.id)
      setSellers((current) => current.filter((seller) => seller.id !== activeSeller.id))
      setDeleteOpen(false)
      setActiveSeller(null)
      toast.success("Seller deleted.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete seller.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Sellers</p>
          <p className="mt-2 text-3xl font-bold">{summary.totalSellers}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">With Listings</p>
          <p className="mt-2 text-3xl font-bold">{summary.sellersWithListings}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Listings</p>
          <p className="mt-2 text-3xl font-bold">{summary.totalListings}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active Listings</p>
          <p className="mt-2 text-3xl font-bold">{summary.activeListings}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search sellers by name, url or counts"
          className="max-w-xl"
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={openCreateDialog} disabled={!canManage}>
            Add Seller
          </Button>
        </div>
      </div>

      {!canManage ? (
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          You can view sellers, but only super admins can create, edit, or delete them.
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Listings</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSellers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                  No sellers found.
                </TableCell>
              </TableRow>
            ) : (
              filteredSellers.map((seller) => (
                <TableRow key={seller.id}>
                  <TableCell>{seller.id}</TableCell>
                  <TableCell className="font-medium">{seller.name}</TableCell>
                  <TableCell className="max-w-[280px] truncate" title={seller.url ?? ""}>
                    {seller.url ? (
                      <a href={seller.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        {seller.url}
                      </a>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{seller.listingsCount}</TableCell>
                  <TableCell>{seller.productsCount}</TableCell>
                  <TableCell>{seller.activeListingsCount}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(seller)}
                        disabled={!canManage}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveSeller(seller)
                          setDeleteOpen(true)
                        }}
                        disabled={!canManage}
                      >
                        Delete
                      </Button>
                      <Button asChild type="button" variant="outline" size="sm">
                        <Link href={`/admin/product-listings?sellerId=${seller.id}`}>Open Listings</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Seller</DialogTitle>
            <DialogDescription>Create a new seller record used by product listings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="seller-name">Name</Label>
              <Input id="seller-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seller-url">URL</Label>
              <Input id="seller-url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} disabled={saving}>
              {saving ? "Saving..." : "Create Seller"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Seller</DialogTitle>
            <DialogDescription>Update seller name and url.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-seller-name">Name</Label>
              <Input id="edit-seller-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-seller-url">URL</Label>
              <Input id="edit-seller-url" value={url} onChange={(event) => setUrl(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleUpdate()} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Seller</DialogTitle>
            <DialogDescription>
              {activeSeller
                ? `This will remove ${activeSeller.name}. It cannot be undone if no listings are attached.`
                : "This will remove the selected seller."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Seller"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}