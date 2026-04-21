import Link from "next/link"
import { cookies } from "next/headers"

import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-session"
import { BACKEND_URL } from "@/utils/admin/constants"
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

type ActivityLogItem = {
  id: number
  action: string
  entity_type: string
  entity_id: number | null
  ip_address: string | null
  created_at: string
  admin: {
    id: number | null
    email: string | null
    role: string | null
  } | null
}

const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "dev-admin-api-key-change-me"

type ActivityLogPageProps = {
  searchParams?: Promise<{
    limit?: string
    offset?: string
    search?: string
    entity_type?: string
    action?: string
  }>
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback
  }

  return parsed
}

function parseNonNegativeInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback
  }

  return parsed
}

export default async function ActivityLogPage({ searchParams }: ActivityLogPageProps) {
  let rows: ActivityLogItem[] = []
  let fetchError: string | null = null
  let total = 0

  const resolvedSearchParams = (await searchParams) ?? {}
  const limit = Math.min(100, parsePositiveInt(resolvedSearchParams.limit, 25))
  const offset = parseNonNegativeInt(resolvedSearchParams.offset, 0)
  const search = (resolvedSearchParams.search ?? "").trim()
  const entityType = (resolvedSearchParams.entity_type ?? "").trim().toUpperCase()
  const action = (resolvedSearchParams.action ?? "").trim().toUpperCase()

  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })

  if (search !== "") query.set("search", search)
  if (entityType !== "") query.set("entity_type", entityType)
  if (action !== "") query.set("action", action)

  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session || !["ROLE_SUPER_ADMIN", "ROLE_SUB_ADMIN"].includes(session.role)) {
    fetchError = "You are not authorized to view activity logs."
  }

  try {
    if (!session) {
      throw new Error("No session")
    }

    const response = await fetch(`${BACKEND_URL}/admin/api/activity-log?${query.toString()}`, {
      cache: "no-store",
      headers: {
        "X-Admin-Api-Key": ADMIN_API_KEY,
        "X-Admin-Role": session.role,
        "X-Admin-Id": String(session.id),
      },
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      fetchError = (data as { error?: string }).error ?? "Failed to load activity log entries."
    } else {
      const payload = (await response.json()) as {
        items?: ActivityLogItem[]
        pagination?: { total?: number }
      }
      rows = payload.items ?? []
      total = payload.pagination?.total ?? 0
    }
  } catch {
    if (!fetchError) {
      fetchError = "Unable to connect to the backend."
    }
  }

  const previousOffset = Math.max(0, offset - limit)
  const hasPrevious = offset > 0
  const hasNext = offset + limit < total

  const previousParams = new URLSearchParams(query)
  previousParams.set("offset", String(previousOffset))

  const nextParams = new URLSearchParams(query)
  nextParams.set("offset", String(offset + limit))

  return (
    <section className="w-full max-w-none space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Activity Log</h1>
        <p className="text-sm text-muted-foreground">
          Search and audit admin actions with filters and pagination.
        </p>
      </div>

      <form method="GET" className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-4">
        <Input name="search" defaultValue={search} placeholder="Search email, action, entity" />
        <Input name="entity_type" defaultValue={entityType} placeholder="Entity type (ex: ADMIN)" />
        <Input name="action" defaultValue={action} placeholder="Action (ex: ADMIN_DELETE)" />
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={100}
            name="limit"
            defaultValue={String(limit)}
            placeholder="Limit"
          />
          <input type="hidden" name="offset" value="0" />
          <Button type="submit" className="shrink-0">Apply</Button>
        </div>
      </form>

      <div className="w-full rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fetchError ? (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-destructive">
                  {fetchError}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                  No activity entries found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.id}</TableCell>
                  <TableCell className="font-medium">{row.admin?.email ?? "System"}</TableCell>
                  <TableCell>{row.action}</TableCell>
                  <TableCell>
                    {row.entity_type}
                    {row.entity_id ? ` #${row.entity_id}` : ""}
                  </TableCell>
                  <TableCell>{row.ip_address ?? "-"}</TableCell>
                  <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!fetchError && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Showing {rows.length === 0 ? 0 : offset + 1}-{Math.min(offset + rows.length, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild disabled={!hasPrevious}>
              <Link href={`/admin/activity-log?${previousParams.toString()}`}>Previous</Link>
            </Button>
            <Button variant="outline" size="sm" asChild disabled={!hasNext}>
              <Link href={`/admin/activity-log?${nextParams.toString()}`}>Next</Link>
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
