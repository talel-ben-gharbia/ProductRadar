export type AdminUser = {
  id: number
  email: string
  role: string
  created_at: string
  updated_at: string
}

export async function getAdmins(): Promise<AdminUser[]> {
  const response = await fetch("/api/admin/admins", { cache: "no-store" })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error || "Failed to fetch admins.")
  }
  return response.json()
}

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
