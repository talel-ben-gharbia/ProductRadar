"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Ban,
  CheckCircle,
  CreditCard,
  PauseCircle,
  Search,
  TrendingUp,
  UserCheck,
  Users,
  UsersRound,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleDateString()
}

export default function CustomersMonitoringHub() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState("")
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await getUsers(PAGE_SIZE, offset, {
          search,
          accountType: "B2C",
        })
        if (cancelled) return
        setUsers(response.items)
        setTotal(response.pagination.total)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to fetch customers.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [offset, search])

  async function handleStatusUpdate(id: number, status: UserAccountStatus) {
    setUpdatingId(id)
    try {
      await updateUserStatus(id, status)
      setUsers(prev => prev.map(u => u.id === id ? { ...u, account_status: status } : u))
      toast.success(`Customer ${status.toLowerCase()}`)
    } catch {
      toast.error("Failed to update status")
    } finally {
      setUpdatingId(null)
    }
  }

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const stats = useMemo(() => {
    const total_customers = total
    const premium = users.filter(u => u.subscription?.plan_type && u.subscription.plan_type !== "FREE").length
    const active = users.filter(u => u.account_status === "ACTIVE").length
    const pending_b2b = users.filter(u => u.account_type === "B2B_COMPANY" || u.account_type === "B2B_MARKET").length
    return [
      { label: "Total Customers", value: total_customers, icon: UsersRound, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
      { label: "Premium", value: premium, icon: CreditCard, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
      { label: "Active Accounts", value: active, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
      { label: "B2B Prospects", value: pending_b2b, icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
    ]
  }, [total, users])

  return (
    <div className="space-y-8">
      {/* KPI Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex size-12 items-center justify-center rounded-2xl ${stat.bg}`}>
                <stat.icon className={`size-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + Filter Bar */}
      <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => { setOffset(0); setSearch(e.target.value) }}
            className="h-10 rounded-xl border-border/50 bg-background pl-9 text-sm"
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive shadow-sm">
          {error}
        </div>
      ) : null}

      {/* Customers Table */}
      <Card className="border-border/50 shadow-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Customer</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Registered</TableHead>
              <TableHead className="font-semibold">Last Login</TableHead>
              <TableHead className="font-semibold">Subscription</TableHead>
              <TableHead className="font-semibold">Usage</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center text-sm text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Loading customers...
                  </div>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center text-sm text-muted-foreground">
                  <Users className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                  No customers found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className="transition-colors hover:bg-muted/10">
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="font-medium">{user.email}</div>
                      <div className="text-xs text-muted-foreground">{user.full_name || "-"}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.account_status === "ACTIVE" ? "default" : user.account_status === "SUSPENDED" ? "secondary" : "destructive"}
                      className={user.account_status === "ACTIVE" ? "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800" : user.account_status === "SUSPENDED" ? "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800" : ""}
                    >
                      {user.account_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(user.joined_at)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(user.last_login)}</TableCell>
                  <TableCell>
                    {user.subscription ? (
                      <div className="text-xs">
                        <div className="font-medium">{user.subscription.plan_type}</div>
                        <div className={user.subscription.active ? "text-emerald-600" : "text-muted-foreground"}>
                          {user.subscription.active ? "Active" : "Inactive"}
                        </div>
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
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {user.account_status !== "ACTIVE" && (
                        <Button variant="ghost" size="icon" className="size-7" title="Activate" disabled={updatingId === user.id} onClick={() => handleStatusUpdate(user.id, "ACTIVE")}>
                          <CheckCircle className="size-4 text-green-600" />
                        </Button>
                      )}
                      {user.account_status !== "SUSPENDED" && (
                        <Button variant="ghost" size="icon" className="size-7" title="Suspend" disabled={updatingId === user.id} onClick={() => handleStatusUpdate(user.id, "SUSPENDED")}>
                          <PauseCircle className="size-4 text-amber-600" />
                        </Button>
                      )}
                      {user.account_status !== "BANNED" && (
                        <Button variant="ghost" size="icon" className="size-7" title="Ban" disabled={updatingId === user.id} onClick={() => handleStatusUpdate(user.id, "BANNED")}>
                          <Ban className="size-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {users.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Showing {offset + 1}-{Math.min(offset + users.length, total)} of {total}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">
              Page {currentPage} / {pageCount}
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg"
                disabled={offset === 0 || loading}
                onClick={() => setOffset(prev => Math.max(0, prev - PAGE_SIZE))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg"
                disabled={offset + PAGE_SIZE >= total || loading}
                onClick={() => setOffset(prev => prev + PAGE_SIZE)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
