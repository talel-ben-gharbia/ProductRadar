import React, { Suspense } from "react"
import { cookies } from "next/headers"

import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-session"
import AdminsDataTable from "@/components/admin/admins-data-table"
import { Skeleton } from "@/components/ui/skeleton"
import { BACKEND_URL } from "@/utils/admin/constants"
import type { AdminUser } from "@/services/admins"

const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "dev-admin-api-key-change-me"

async function loadAdmins(session: { id: number; role: string } | null): Promise<{ admins: AdminUser[]; fetchError: string | null }> {
  try {
    if (!session || !["ROLE_SUPER_ADMIN", "ROLE_SUB_ADMIN"].includes(session.role)) {
      return {
        admins: [],
        fetchError: "You are not authorized to view admins.",
      }
    }

    const response = await fetch(`${BACKEND_URL}/admin/api/admins`, {
      cache: "no-store",
      headers: {
        "X-Admin-Api-Key": ADMIN_API_KEY,
        "X-Admin-Role": session.role,
        "X-Admin-Id": String(session.id),
      },
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      return {
        admins: [],
        fetchError: (data as { error?: string }).error ?? "Failed to fetch admins.",
      }
    }
    const admins = (await response.json()) as AdminUser[]
    return { admins, fetchError: null }
  } catch {
    return { admins: [], fetchError: "Unable to connect to the backend." }
  }
}

type AdminsPageProps = {
  searchParams?: Promise<{ add?: string }>
}

async function AdminsPageContent({
  session,
  openCreateByDefault,
}: {
  session: { id: number; role: string } | null
  openCreateByDefault: boolean
}) {
  const { admins, fetchError } = await loadAdmins(session)

  return (
    <>
      <h1 className="text-2xl font-bold">Admin Management</h1>

      <AdminsDataTable
        admins={admins}
        currentAdminId={session?.id ?? -1}
        currentAdminRole={session?.role ?? ""}
        fetchError={fetchError}
        openCreateByDefault={openCreateByDefault}
      />
    </>
  )
}

function AdminsFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="rounded-lg border bg-card p-4">
        <Skeleton className="h-10 w-full" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </div>
  )
}

export default async function AdminsPage({ searchParams }: AdminsPageProps) {
  const resolvedSearchParams = await searchParams
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  const session = token ? await verifySessionToken(token) : null
  const openCreateByDefault = resolvedSearchParams?.add === "1"

  return (
    <section className="w-full max-w-none space-y-4">
      <Suspense fallback={<AdminsFallback />}>
        <AdminsPageContent session={session} openCreateByDefault={openCreateByDefault} />
      </Suspense>
    </section>
  )
}
