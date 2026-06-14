"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Trash2, Shield, UserCog, Ban, Pause, Play } from "lucide-react"

import { toast } from "sonner"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  createAdmin,
  deleteAdmin,
  suspendAdmin,
  unsuspendAdmin,
  banAdmin,
  unbanAdmin,
  type AdminUser,
} from "@/services/admins"

const ROLE_LABELS: Record<string, string> = {
  ROLE_SUPER_ADMIN: "Super Admin",
  ROLE_SUB_ADMIN: "Sub Admin",
}

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  suspended: "Suspended",
  banned: "Banned",
}

type AdminsDataTableProps = {
  admins: AdminUser[]
  currentAdminId: number
  currentAdminRole: string
  fetchError: string | null
  openCreateByDefault?: boolean
}

export default function AdminsDataTable({
  admins: initialAdmins,
  currentAdminId,
  currentAdminRole,
  fetchError,
  openCreateByDefault = false,
}: AdminsDataTableProps) {
  const router = useRouter()
  const isSuperAdmin = currentAdminRole === "ROLE_SUPER_ADMIN"

  const [admins, setAdmins] = useState<AdminUser[]>(initialAdmins)
  const [search, setSearch] = useState("")
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [createOpen, setCreateOpen] = useState(openCreateByDefault)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createEmail, setCreateEmail] = useState("")
  const [createPassword, setCreatePassword] = useState("")
  const createRole = "ROLE_SUB_ADMIN"
  const [createErrors, setCreateErrors] = useState<{
    email?: string
    password?: string
  }>({})
  const [actionTarget, setActionTarget] = useState<{ admin: AdminUser; action: "suspend" | "unsuspend" | "ban" | "unban" } | null>(null)

  // Sync if parent re-fetches
  useEffect(() => {
    setAdmins(initialAdmins)
  }, [initialAdmins])

  useEffect(() => {
    if (openCreateByDefault) {
      setCreateOpen(true)
    }
  }, [openCreateByDefault])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return admins.filter(
      (a) =>
        a.email.toLowerCase().includes(q) ||
        (ROLE_LABELS[a.role] ?? a.role).toLowerCase().includes(q) ||
        (STATUS_LABELS[a.status] ?? a.status).toLowerCase().includes(q),
    )
  }, [admins, search])

  async function handleDelete() {
    if (deletingId === null) return
    setSubmitting(true)
    try {
      await deleteAdmin(deletingId)
      setAdmins((prev) => prev.filter((a) => a.id !== deletingId))
      toast.success("Admin deleted.")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete admin.")
    } finally {
      setSubmitting(false)
      setDeletingId(null)
    }
  }

  async function handleStatusAction() {
    if (!actionTarget) return
    setSubmitting(true)
    try {
      let updated: AdminUser
      switch (actionTarget.action) {
        case "suspend":
          updated = await suspendAdmin(actionTarget.admin.id)
          toast.success(`${actionTarget.admin.email} has been suspended.`)
          break
        case "unsuspend":
          updated = await unsuspendAdmin(actionTarget.admin.id)
          toast.success(`${actionTarget.admin.email} has been unsuspended.`)
          break
        case "ban":
          updated = await banAdmin(actionTarget.admin.id)
          toast.success(`${actionTarget.admin.email} has been banned.`)
          break
        case "unban":
          updated = await unbanAdmin(actionTarget.admin.id)
          toast.success(`${actionTarget.admin.email} has been unbanned.`)
          break
        default:
          return
      }
      setAdmins((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed.")
    } finally {
      setSubmitting(false)
      setActionTarget(null)
    }
  }

  function validateCreate(): boolean {
    const next: { email?: string; password?: string } = {}

    if (!createEmail.trim()) {
      next.email = "Email is required."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createEmail)) {
      next.email = "Enter a valid email address."
    }

    if (!createPassword) {
      next.password = "Password is required."
    } else if (createPassword.length < 8) {
      next.password = "Password must be at least 8 characters."
    }

    setCreateErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleCreateAdmin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!validateCreate()) {
      return
    }

    setCreateSubmitting(true)

    try {
      const created = await createAdmin({
        email: createEmail.trim(),
        password: createPassword,
        role: createRole,
      })

      setAdmins((prev) => [created, ...prev])
      setCreateOpen(false)
      setCreateEmail("")
      setCreatePassword("")

      setCreateErrors({})
      toast.success("Admin created successfully.")

      if (openCreateByDefault) {
        router.replace("/admin/admins")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create admin.")
    } finally {
      setCreateSubmitting(false)
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "suspended":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
            <Pause className="size-2.5" />
            Suspended
          </span>
        )
      case "banned":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
            <Ban className="size-2.5" />
            Banned
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            <Play className="size-2.5" />
            Active
          </span>
        )
    }
  }

  if (fetchError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {fetchError}
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by email, role, or status…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        {isSuperAdmin && (
          <Button size="sm" variant="outline" asChild>
            <Link href="/admin/admins/roles">Manage Roles</Link>
          </Button>
        )}
        {isSuperAdmin && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            Add Admin
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "admin" : "admins"}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">ID</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              {isSuperAdmin && <TableHead className="w-32">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isSuperAdmin ? 6 : 5} className="py-10 text-center text-sm text-muted-foreground">
                  No admins found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((admin) => {
                const isSelf = admin.id === currentAdminId
                const isSuperAdminRole = admin.role === "ROLE_SUPER_ADMIN"
                const isSuspended = admin.status === "suspended"
                const isBanned = admin.status === "banned"

                return (
                  <TableRow key={admin.id} className={isSuspended || isBanned ? "opacity-60" : ""}>
                    <TableCell className="text-xs text-muted-foreground">{admin.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{admin.email}</span>
                        {isSelf && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            you
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          isSuperAdminRole
                            ? "border border-zinc-900 bg-zinc-900 text-white"
                            : "border border-zinc-300 bg-zinc-100 text-zinc-800"
                        }`}
                      >
                        {isSuperAdminRole ? <Shield className="size-3" /> : <UserCog className="size-3" />}
                        {ROLE_LABELS[admin.role] ?? admin.role}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(admin.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(admin.created_at).toLocaleDateString()}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        {!isSelf && (
                          <div className="flex items-center gap-1">
                            {isSuspended ? (
                              <button
                                type="button"
                                onClick={() => setActionTarget({ admin, action: "unsuspend" })}
                                className="rounded p-1 text-emerald-600 transition-colors hover:bg-emerald-50"
                                title="Unsuspend"
                              >
                                <Play className="size-3.5" />
                              </button>
                            ) : isBanned ? (
                              <button
                                type="button"
                                onClick={() => setActionTarget({ admin, action: "unban" })}
                                className="rounded p-1 text-emerald-600 transition-colors hover:bg-emerald-50"
                                title="Unban"
                              >
                                <Play className="size-3.5" />
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setActionTarget({ admin, action: "suspend" })}
                                  className="rounded p-1 text-amber-600 transition-colors hover:bg-amber-50"
                                  title="Suspend"
                                >
                                  <Pause className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActionTarget({ admin, action: "ban" })}
                                  className="rounded p-1 text-red-600 transition-colors hover:bg-red-50"
                                  title="Ban"
                                >
                                  <Ban className="size-3.5" />
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => setDeletingId(admin.id)}
                              className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Admin</DialogTitle>
            <DialogDescription>
              This will permanently remove the admin account. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={submitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button variant="destructive" disabled={submitting} onClick={handleDelete}>
              {submitting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status action confirmation dialog */}
      <Dialog open={actionTarget !== null} onOpenChange={(open) => !open && setActionTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionTarget?.action === "suspend" && <><Pause className="size-5 text-amber-500" /> Suspend Admin</>}
              {actionTarget?.action === "unsuspend" && <><Play className="size-5 text-emerald-500" /> Unsuspend Admin</>}
              {actionTarget?.action === "ban" && <><Ban className="size-5 text-red-500" /> Ban Admin</>}
              {actionTarget?.action === "unban" && <><Play className="size-5 text-emerald-500" /> Unban Admin</>}
            </DialogTitle>
            <DialogDescription>
              {actionTarget?.action === "suspend" && (
                <>This will suspend <strong>{actionTarget?.admin.email}</strong>. They will not be able to access the admin panel until unsuspended.</>
              )}
              {actionTarget?.action === "unsuspend" && (
                <>This will restore access for <strong>{actionTarget?.admin.email}</strong>.</>
              )}
              {actionTarget?.action === "ban" && (
                <>This will ban <strong>{actionTarget?.admin.email}</strong>. They will be immediately logged out and unable to access the admin panel.</>
              )}
              {actionTarget?.action === "unban" && (
                <>This will unban <strong>{actionTarget?.admin.email}</strong> and restore their access.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={submitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant={actionTarget?.action === "ban" ? "destructive" : "default"}
              disabled={submitting}
              onClick={handleStatusAction}
            >
              {submitting ? "Processing…" : (
                <>
                  {actionTarget?.action === "suspend" && "Suspend"}
                  {actionTarget?.action === "unsuspend" && "Unsuspend"}
                  {actionTarget?.action === "ban" && "Ban"}
                  {actionTarget?.action === "unban" && "Unban"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create admin dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open && openCreateByDefault) {
            router.replace("/admin/admins")
          }
        }}
      >
        <DialogContent className="sm:max-w-130">
          <DialogHeader>
            <DialogTitle>Add Admin</DialogTitle>
            <DialogDescription>
              Create a new admin account and assign its role.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="create-admin-email">Email</Label>
              <Input
                id="create-admin-email"
                type="email"
                autoComplete="email"
                placeholder="admin@example.com"
                value={createEmail}
                onChange={(e) => {
                  setCreateEmail(e.target.value)
                  setCreateErrors((prev) => ({ ...prev, email: undefined }))
                }}
                aria-invalid={!!createErrors.email}
              />
              {createErrors.email && (
                <p className="text-xs text-destructive">{createErrors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-admin-password">Password</Label>
              <Input
                id="create-admin-password"
                type="password"
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                value={createPassword}
                onChange={(e) => {
                  setCreatePassword(e.target.value)
                  setCreateErrors((prev) => ({ ...prev, password: undefined }))
                }}
                aria-invalid={!!createErrors.password}
              />
              {createErrors.password && (
                <p className="text-xs text-destructive">{createErrors.password}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Role</Label>
              <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-medium">
                Sub Admin
              </p>
            </div>

            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={createSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={createSubmitting}>
                {createSubmitting ? "Creating..." : "Create Admin"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
