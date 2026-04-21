"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Trash2, Shield, UserCog } from "lucide-react"

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
  type AdminUser,
} from "@/services/admin/admins"

const ROLE_LABELS: Record<string, string> = {
  ROLE_SUPER_ADMIN: "Super Admin",
  ROLE_SUB_ADMIN: "Sub Admin",
}

const ROLE_OPTIONS = [
  { value: "ROLE_SUPER_ADMIN", label: "Super Admin" },
  { value: "ROLE_SUB_ADMIN", label: "Sub Admin" },
]

type AdminsDataTableProps = {
  admins: AdminUser[]
  currentAdminId: number
  fetchError: string | null
  openCreateByDefault?: boolean
}

export default function AdminsDataTable({
  admins: initialAdmins,
  currentAdminId,
  fetchError,
  openCreateByDefault = false,
}: AdminsDataTableProps) {
  const router = useRouter()

  const [admins, setAdmins] = useState<AdminUser[]>(initialAdmins)
  const [search, setSearch] = useState("")
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [createOpen, setCreateOpen] = useState(openCreateByDefault)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createEmail, setCreateEmail] = useState("")
  const [createPassword, setCreatePassword] = useState("")
  const [createRole, setCreateRole] = useState("ROLE_SUB_ADMIN")
  const [createErrors, setCreateErrors] = useState<{
    email?: string
    password?: string
  }>({})

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
        (ROLE_LABELS[a.role] ?? a.role).toLowerCase().includes(q),
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
      setCreateRole("ROLE_SUB_ADMIN")
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
          placeholder="Search by email or role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button size="sm" variant="outline" asChild>
          <Link href="/admin/admins/roles">Manage Roles</Link>
        </Button>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          Add Admin
        </Button>
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
              <TableHead>Created</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No admins found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((admin) => {
                const isSelf = admin.id === currentAdminId
                const isSuperAdmin = admin.role === "ROLE_SUPER_ADMIN"

                return (
                  <TableRow key={admin.id}>
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
                          isSuperAdmin
                            ? "border border-zinc-900 bg-zinc-900 text-white"
                            : "border border-zinc-300 bg-zinc-100 text-zinc-800"
                        }`}
                      >
                        {isSuperAdmin ? <Shield className="size-3" /> : <UserCog className="size-3" />}
                        {ROLE_LABELS[admin.role] ?? admin.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(admin.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => setDeletingId(admin.id)}
                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </TableCell>
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

            <div className="space-y-2">
              <Label>Role</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map((opt) => {
                  const selected = createRole === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCreateRole(opt.value)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        selected
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
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
