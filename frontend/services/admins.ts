export type AdminUser = {
  id: number
  email: string
  role: string
  status: string
  suspended_at?: string | null
  banned_at?: string | null
  created_at: string
  updated_at: string
}

import { cachedFetch } from "@/lib/fetch-with-cache"
import { withCache } from "@/lib/server-cache"

export const getAdmins = withCache(async (): Promise<AdminUser[]> => {
  return cachedFetch<AdminUser[]>("/api/admin/admins", {
    cacheKey: "admins:list",
    cacheTtl: 300,
  })
})

export async function createAdmin(payload: {
  email: string
  password: string
  role: string
}): Promise<AdminUser> {
  const response = await fetch("/api/admin/admins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || "Failed to create admin.")
  }
  return data
}

export async function updateAdminRole(id: number, role: string): Promise<AdminUser> {
  const response = await fetch(`/api/admin/admins/${id}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || "Failed to update role.")
  }
  return data
}

export async function deleteAdmin(id: number): Promise<void> {
  const response = await fetch(`/api/admin/admins/${id}`, { method: "DELETE" })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error || "Failed to delete admin.")
  }
}

export async function suspendAdmin(id: number): Promise<AdminUser> {
  const response = await fetch(`/api/admin/admins/${id}/suspend`, { method: "POST" })
  const data = await response.json()
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || "Failed to suspend admin.")
  }
  return data
}

export async function unsuspendAdmin(id: number): Promise<AdminUser> {
  const response = await fetch(`/api/admin/admins/${id}/unsuspend`, { method: "POST" })
  const data = await response.json()
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || "Failed to unsuspend admin.")
  }
  return data
}

export async function banAdmin(id: number): Promise<AdminUser> {
  const response = await fetch(`/api/admin/admins/${id}/ban`, { method: "POST" })
  const data = await response.json()
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || "Failed to ban admin.")
  }
  return data
}

export async function unbanAdmin(id: number): Promise<AdminUser> {
  const response = await fetch(`/api/admin/admins/${id}/unban`, { method: "POST" })
  const data = await response.json()
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || "Failed to unban admin.")
  }
  return data
}
