"use client"

import { getAuth, signOut } from "firebase/auth"
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"

export type B2BUserInfo = {
  id?: number | null
  email?: string | null
  full_name?: string | null
  company_name?: string | null
  company_market?: string | null
  company_country?: string | null
  company_website?: string | null
  b2b_status?: string | null
  is_verified?: boolean | null
  seller_id?: number | null
  owner_user_id?: number | null
  usage_json?: Record<string, unknown> | null
  type?: "B2B_COMPANY" | "B2B_MARKET" | string | null
}

export type B2BSubscriptionInfo = {
  source?: string | null
  owner_type?: string | null
  plan_type?: string | null
  active?: boolean | null
  duration_months?: number | null
  start_date?: string | null
  end_date?: string | null
  days_remaining?: number | null
  activated_at?: string | null
}

export type B2BSummary = {
  user?: B2BUserInfo
  subscription?: B2BSubscriptionInfo
  metrics?: Record<string, unknown>
  search_insights?: Record<string, unknown>
  notifications?: Array<Record<string, unknown>>
}

type B2BContextValue = {
  summary: B2BSummary | null
  loading: boolean
  error: string | null
  firebaseUid: string | null
  mode: "vendor" | "market"
  planType: string | null
  isGold: boolean
  isSilver: boolean
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const B2BContext = createContext<B2BContextValue>({
  summary: null,
  loading: true,
  error: null,
  firebaseUid: null,
  mode: "vendor",
  planType: null,
  isGold: false,
  isSilver: false,
  refresh: async () => {},
  logout: async () => {},
})

export function useB2B() {
  return useContext(B2BContext)
}

export function B2BProvider({ children, initialSummary, firebaseUid }: {
  children: ReactNode
  initialSummary: B2BSummary | null
  firebaseUid: string | null
}) {
  const [summary, setSummary] = useState<B2BSummary | null>(initialSummary)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mode: "vendor" | "market" =
    summary?.user?.type === "B2B_MARKET" ? "market" : "vendor"

  const planType = (summary?.subscription?.plan_type as string | null) ?? null
  // Handle both 'B2B_GOLD' and 'GOLD' plan type formats
  const isGold = planType != null && planType.toUpperCase().includes("GOLD")
  const isSilver = planType != null && planType.toUpperCase().includes("SILVER")

  const refresh = useCallback(async () => {
    if (!firebaseUid) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=summary`)
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? "Failed to load workspace data")
      }
      const data = await res.json()
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh")
    } finally {
      setLoading(false)
    }
  }, [firebaseUid])

  // Auto-retry on mount if server-side fetch failed (summary is null)
  useEffect(() => {
    if (firebaseUid && !initialSummary) {
      refresh()
    }
  }, [firebaseUid, initialSummary, refresh])

  const logout = useCallback(async () => {
    setSummary(null)
    try { await signOut(getAuth()) } catch { /* firebase signOut is best-effort */ }
    document.cookie = "b2c_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    window.location.href = "/B2B"
  }, [])

  return (
    <B2BContext.Provider value={{ summary, loading, error, firebaseUid, mode, planType, isGold, isSilver, refresh, logout }}>
      {children}
    </B2BContext.Provider>
  )
}
