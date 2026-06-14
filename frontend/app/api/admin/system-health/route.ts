import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-session"
import { BACKEND_URL } from "@/utils/admin/constants"

const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "dev-admin-api-key-change-me"

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session || session.role !== "ROLE_SUPER_ADMIN") {
    return NextResponse.json({ error: "Only super admins can view system health." }, { status: 403 })
  }

  try {
    const response = await fetch(`${BACKEND_URL}/admin/api/system-health`, {
      cache: "no-store",
      headers: {
        "X-Admin-Api-Key": ADMIN_API_KEY,
        "X-Admin-Role": session.role,
        "X-Admin-Id": String(session.id),
      },
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      return NextResponse.json(data, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Unable to connect to the backend." }, { status: 502 })
  }
}
