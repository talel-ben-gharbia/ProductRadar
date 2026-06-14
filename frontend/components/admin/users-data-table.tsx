"use client"

import { useEffect, useMemo, useState } from "react"

import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  getUsers,
  type AdminUser,
  type UserAccountStatus,
  updateUserStatus,
} from "@/services/users"

const PAGE_SIZE = 20

function formatDate(value: string | null): string {
  if (!value) return "-"
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleString()
}

type UsersDataTableProps = {
  initialSearch?: string
  initialAccountType?: string
  initialStatus?: string
  initialB2bStatus?: string
  lockAccountType?: boolean
}

export default function UsersDataTable({
  initialSearch = "",
  initialAccountType = "",
  initialStatus = "",
  initialB2bStatus = "",
  lockAccountType = false,
}: UsersDataTableProps) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState(initialSearch)
  const [accountType, setAccountType] = useState(initialAccountType)
  const [status, setStatus] = useState(initialStatus)
  const [b2bStatus, setB2bStatus] = useState(initialB2bStatus)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const isB2BScope = initialAccountType === "B2B" || initialAccountType === "B2B_COMPANY" || initialAccountType === "B2B_MARKET"

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await getUsers(PAGE_SIZE, offset, {
          search,
          accountType: lockAccountType ? initialAccountType : accountType,
          status,
          b2bStatus,
        })

        if (cancelled) return

        setUsers(response.items)
        setTotal(response.pagination.total)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to fetch users.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [offset, search, accountType, status, b2bStatus])

  const currentPage = useMemo(() => Math.floor(offset / PAGE_SIZE) + 1, [offset])
  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])

  async function handleStatusUpdate(id: number, nextStatus: UserAccountStatus) {
    setUpdatingId(id)
    try {
      const updated = await updateUserStatus(id, nextStatus)
      setUsers((prev) => prev.map((item) => (item.id === id ? updated : item)))
      toast.success(`User status updated to ${nextStatus}.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user status.")
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-card p-5 shadow-sm">
        <div className={`grid gap-3 ${lockAccountType && !isB2BScope ? "lg:grid-cols-[1.8fr_1fr]" : lockAccountType ? "lg:grid-cols-[1.6fr_1fr_1fr]" : "lg:grid-cols-[1.4fr_0.9fr_0.9fr]"}`}>
          <Input
            placeholder="Search email, name, company..."
            value={search}
            onChange={(event) => {
              setOffset(0)
              setSearch(event.target.value)
            }}
          />

          {!lockAccountType ? (
            <select
              value={accountType}
              onChange={(event) => {
                setOffset(0)
                setAccountType(event.target.value)
              }}
              className="h-11 rounded-xl border bg-background px-3 text-sm"
            >
              <option value="">All account types</option>
              <option value="B2C">B2C</option>
              <option value="B2B_COMPANY">B2B Company</option>
              <option value="B2B_MARKET">B2B Market</option>
            </select>
          ) : null}

          <select
            value={status}
            onChange={(event) => {
              setOffset(0)
              setStatus(event.target.value)
            }}
            className="h-11 rounded-xl border bg-background px-3 text-sm"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="BANNED">Banned</option>
          </select>

          {!lockAccountType || isB2BScope ? (
            <select
              value={b2bStatus}
              onChange={(event) => {
                setOffset(0)
                setB2bStatus(event.target.value)
              }}
              className="h-11 rounded-xl border bg-background px-3 text-sm"
            >
              <option value="">All B2B verification</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          ) : null}
        </div>
      </div>

      {error ? <div className="rounded-3xl border bg-card p-4 text-sm text-destructive shadow-sm">{error}</div> : null}

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                  Loading users...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="font-medium">{user.email}</div>
                      <div className="text-xs text-muted-foreground">{user.full_name || "-"}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{user.account_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.account_status === "ACTIVE"
                          ? "default"
                          : user.account_status === "SUSPENDED"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {user.account_status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(user.joined_at)}</TableCell>
                  <TableCell>{formatDate(user.last_login)}</TableCell>
                  <TableCell>
                    {user.subscription ? (
                      <div className="text-xs">
                        <div className="font-medium">{user.subscription.plan_type}</div>
                        <div className="text-muted-foreground">{user.subscription.active ? "Active" : "Inactive"}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Free tier</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground">
                      <div>
                        Alerts: <span className="font-medium text-foreground">{user.usage?.alerts_used ?? 0}</span>
                        {` / ${user.subscription?.alerts_limit ?? 3}`}
                      </div>
                      <div>
                        Favorites: <span className="font-medium text-foreground">{user.usage?.favorites_used ?? 0}</span>
                        {` / ${user.subscription?.favorites_limit ?? 5}`}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button size="sm" variant="outline" disabled={updatingId === user.id} onClick={() => handleStatusUpdate(user.id, "ACTIVE")}>
                      Activate
                    </Button>
                    <Button size="sm" variant="secondary" disabled={updatingId === user.id} onClick={() => handleStatusUpdate(user.id, "SUSPENDED")}>
                      Suspend
                    </Button>
                    <Button size="sm" variant="destructive" disabled={updatingId === user.id} onClick={() => handleStatusUpdate(user.id, "BANNED")}>
                      Ban
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Showing {users.length === 0 ? 0 : offset + 1}-{Math.min(offset + users.length, total)} of {total}
        </span>
        <div className="space-x-2">
          <Button size="sm" variant="outline" disabled={offset === 0 || loading} onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}>
            Previous
          </Button>
          <Button size="sm" variant="outline" disabled={offset + PAGE_SIZE >= total || loading} onClick={() => setOffset((prev) => prev + PAGE_SIZE)}>
            Next
          </Button>
        </div>
        <span className="text-muted-foreground">
          Page {currentPage} / {pageCount}
        </span>
      </div>
    </div>
  )
}
