"use client"

import { useEffect, useRef, useState } from "react"
import { useAdmin } from "@/components/admin/admin-context"
import Link from "next/link"
import { ArrowLeft, Shield, UserCog } from "lucide-react"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getAdmins, updateAdminRole, type AdminUser } from "@/services/admins"

const ROLE_LABELS: Record<string, string> = {
  ROLE_SUPER_ADMIN: "Super Admin",
  ROLE_SUB_ADMIN: "Sub Admin",
}

const ROLE_OPTIONS = [
  { value: "ROLE_SUPER_ADMIN", label: "Super Admin", icon: Shield },
  { value: "ROLE_SUB_ADMIN", label: "Sub Admin", icon: UserCog },
]

export default function ManageRolesPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [openDropdown, setOpenDropdown] = useState<number | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const { admin: currentAdmin } = useAdmin()

  useEffect(() => {
    getAdmins()
      .then(setAdmins)
      .catch((err) => setFetchError(err instanceof Error ? err.message : "Failed to load admins."))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  const filtered = admins.filter(
    (a) =>
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      (ROLE_LABELS[a.role] ?? a.role).toLowerCase().includes(search.toLowerCase()),
  )

  async function handleRoleChange(admin: AdminUser, newRole: string) {
    if (newRole === admin.role) {
      setOpenDropdown(null)
      return
    }
    setUpdatingId(admin.id)
    setOpenDropdown(null)
    try {
      const updated = await updateAdminRole(admin.id, newRole)
      setAdmins((prev) =>
        prev.map((a) => (a.id === updated.id ? { ...a, role: updated.role } : a)),
      )
      toast.success(`${admin.email} is now ${ROLE_LABELS[newRole] ?? newRole}.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role.")
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <section className="w-full max-w-none space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/admins">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Manage Roles</h1>
          <p className="text-sm text-muted-foreground">
            Assign or change roles for admin accounts.
          </p>
        </div>
      </div>

      {fetchError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {fetchError}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Input
          placeholder="Search admins…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
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
              <TableHead>Current Role</TableHead>
              <TableHead>Change Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  No admins found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((admin) => {
                const isSuperAdmin = admin.role === "ROLE_SUPER_ADMIN"
                const isSelf = currentAdmin?.id === admin.id

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
                    <TableCell>
                      {isSelf ? (
                        <span className="text-xs text-muted-foreground italic">Cannot change your own role</span>
                      ) : (
                        <div className="flex gap-2">
                          {ROLE_OPTIONS.filter((opt) => opt.value !== admin.role).map((opt) => {
                            const Icon = opt.icon
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                disabled={updatingId === admin.id}
                                onClick={() => handleRoleChange(admin, opt.value)}
                                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Icon className="size-3" />
                                {updatingId === admin.id ? "Updating…" : `Set ${opt.label}`}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
