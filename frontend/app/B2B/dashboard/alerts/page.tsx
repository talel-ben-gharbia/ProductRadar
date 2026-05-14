"use client"

import { useCallback, useEffect, useState } from "react"
import { Bell, Check, Filter } from "lucide-react"
import B2BErrorState from "@/components/B2B/b2b-error-state"

import { useB2B } from "@/components/B2B/b2b-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import type { B2BNotification as Notification } from "@/types/b2b"

export default function AlertsPage() {
  const { firebaseUid } = useB2B()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const [offset, setOffset] = useState(0)
  const [pagination, setPagination] = useState<{ limit: number; offset: number; total: number }>({ limit: 25, offset: 0, total: 0 })
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [markError, setMarkError] = useState<string | null>(null)

  const limit = 25

  const fetchNotifications = useCallback(async (newOffset = 0) => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=notifications&limit=${limit}&offset=${newOffset}`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.items ?? [])
        setPagination(data.pagination ?? { limit, offset: newOffset, total: 0 })
        setOffset(newOffset)
      }
    } catch {
      setFetchError("Failed to load notifications")
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const markAsRead = async (id: number) => {
    try {
      await fetch(`/api/b2b/workspace?endpoint=notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
    } catch {
      setMarkError("Failed to mark notification as read")
    }
  }

  const filtered = filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications
  const unreadCount = notifications.filter((n) => !n.is_read).length

  const severityColor = (s?: string): string => {
    switch (s?.toUpperCase()) {
      case "CRITICAL": return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
      case "WARNING": return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
      case "SUCCESS": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
      default: return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alerts & Notifications</h1>
          <p className="text-sm text-muted-foreground">{unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => { setFilter("all"); fetchNotifications(0) }}>All</Button>
          <Button variant={filter === "unread" ? "default" : "outline"} size="sm" onClick={() => { setFilter("unread"); fetchNotifications(0) }}>
            Unread ({unreadCount})
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {fetchError && (
          <B2BErrorState message={fetchError} onRetry={() => { setFetchError(null); fetchNotifications(offset) }} />
        )}
        {markError && (
          <B2BErrorState message={markError} onRetry={() => setMarkError(null)} />
        )}
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4"><div className="h-16 animate-pulse rounded-lg bg-muted" /></CardContent>
            </Card>
          ))
        ) : filtered.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center gap-3 py-16">
              <Bell className="size-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{filter === "unread" ? "No unread notifications" : "No notifications yet"}</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((n) => (
            <Card key={n.id} className={`border-border/50 shadow-sm transition-all ${!n.is_read ? "border-l-4 border-l-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/10" : ""}`}>
              <CardContent className="flex items-start gap-4 p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{n.type ?? "Notification"}</p>
                    <Badge className={`text-[10px] ${severityColor(n.severity)}`}>{n.severity ?? "info"}</Badge>
                    {!n.is_read && <span className="size-2 rounded-full bg-indigo-500" />}
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{n.message ?? "-"}</p>
                  <p className="mt-2 text-[10px] text-muted-foreground/70">
                    {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                  </p>
                </div>
                {!n.is_read && n.id && (
                  <Button variant="ghost" size="sm" onClick={() => markAsRead(n.id!)} className="shrink-0 gap-1 text-xs">
                    <Check className="size-3" /> Mark read
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}

        {pagination.total > pagination.limit && (
          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-xs text-muted-foreground">
              Showing {pagination.offset + 1}–{Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" disabled={offset <= 0} onClick={() => fetchNotifications(offset - limit)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={offset + limit >= pagination.total} onClick={() => fetchNotifications(offset + limit)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
