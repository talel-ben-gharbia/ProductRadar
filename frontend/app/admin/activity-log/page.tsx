import { BACKEND_URL } from "@/utils/admin/constants"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AdminUser } from "@/services/admin/admins"

export default async function ActivityLogPage() {
  let rows: AdminUser[] = []
  let fetchError: string | null = null

  try {
    const response = await fetch(`${BACKEND_URL}/admin/api/admins`, { cache: "no-store" })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      fetchError = (data as { error?: string }).error ?? "Failed to load activity log."
    } else {
      const admins = (await response.json()) as AdminUser[]
      rows = admins.slice(0, 20)
    }
  } catch {
    fetchError = "Unable to connect to the backend."
  }

  return (
    <section className="w-full max-w-none space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Activity Log</h1>
        <p className="text-sm text-muted-foreground">
          Recent admin account events snapshot.
        </p>
      </div>

      <div className="w-full rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fetchError ? (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-destructive">
                  {fetchError}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                  No activity entries found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.id}</TableCell>
                  <TableCell className="font-medium">{row.email}</TableCell>
                  <TableCell>Admin account visible</TableCell>
                  <TableCell>{row.role}</TableCell>
                  <TableCell>{new Date(row.updated_at ?? row.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
