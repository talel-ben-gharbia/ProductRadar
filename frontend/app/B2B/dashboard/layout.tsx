import { cookies } from "next/headers"
import type { ReactNode } from "react"

import { COOKIE_NAME, verifyB2CSessionToken } from "@/lib/b2c-session"
import { BACKEND_URL } from "@/utils/admin/constants"
import B2BDashboardLayoutClient from "./layout-client"

async function getSession() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null
    return verifyB2CSessionToken(token)
  } catch {
    return null
  }
}

export default async function B2BDashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession()

  // If no session, render the layout with null firebase uid — the client
  // component will show a login prompt instead of redirecting.
  const firebaseUid = session?.firebase_uid ?? null

  let summary = null
  if (firebaseUid) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(
        `${BACKEND_URL}/api/b2b/workspace/${encodeURIComponent(firebaseUid)}/summary`,
        { cache: "no-store", signal: controller.signal },
      )
      clearTimeout(timeoutId)

      if (response.ok) {
        summary = await response.json()
      }
    } catch {
      // Backend unreachable — summary stays null, dashboard shows gracefully
    }
  }

  return (
    <B2BDashboardLayoutClient summary={summary} firebaseUid={firebaseUid}>
      {children}
    </B2BDashboardLayoutClient>
  )
}
