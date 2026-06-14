"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"

type AdminData = {
  id: number
  email: string
  role: string
}

type AdminContextValue = {
  admin: AdminData | null
  loading: boolean
  logout: () => Promise<void>
  displayRole: string
}

const AdminContext = createContext<AdminContextValue | null>(null)

export function AdminProvider({ children, initialAdmin }: { children: ReactNode; initialAdmin?: AdminData | null }) {
  const router = useRouter()
  const [admin, setAdmin] = useState<AdminData | null>(initialAdmin ?? null)
  const [loading, setLoading] = useState(!initialAdmin)

  useEffect(() => {
    if (initialAdmin) return

    let cancelled = false

    fetch("/api/admin/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.admin) setAdmin(data.admin)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [initialAdmin])

  const logout = useCallback(async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" })
    setAdmin(null)
    router.push("/admin/login")
    router.refresh()
  }, [router])

  const displayRole = useMemo(() => {
    if (!admin) return ""
    if (admin.role === "ROLE_SUPER_ADMIN") return "Super Admin"
    if (admin.role === "ROLE_SUB_ADMIN") return "Sub Admin"
    return admin.role.replace("ROLE_", "")
  }, [admin])

  const value = useMemo<AdminContextValue>(
    () => ({ admin, loading, logout, displayRole }),
    [admin, loading, logout, displayRole],
  )

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  )
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error("useAdmin must be used within <AdminProvider>")
  return ctx
}
