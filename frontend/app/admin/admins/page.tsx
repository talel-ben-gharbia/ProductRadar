import { cookies } from "next/headers"

import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-session"
import AdminsDataTable from "@/components/admin/admins-data-table"
import { BACKEND_URL } from "@/utils/admin/constants"
import type { AdminUser } from "@/services/admin/admins"

async function loadAdmins(): Promise<{ admins: AdminUser[]; fetchError: string | null }> {
  try {
    const response = await fetch(`${BACKEND_URL}/admin/api/admins`, {
      cache: "no-store",
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

export default async function AdminsPage({ searchParams }: AdminsPageProps) {
  const resolvedSearchParams = await searchParams
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  const session = token ? await verifySessionToken(token) : null
  const openCreateByDefault = resolvedSearchParams?.add === "1"

  const { admins, fetchError } = await loadAdmins()

  return (
    <section className="w-full max-w-none space-y-4">
      <h1 className="text-2xl font-bold">Admin Management</h1>

      <AdminsDataTable
        admins={admins}
        currentAdminId={session?.id ?? -1}
        fetchError={fetchError}
        openCreateByDefault={openCreateByDefault}
      />
    </section>
  )
}
