import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-session"
import { BACKEND_URL } from "@/utils/admin/constants"

type Params = { params: Promise<{ id: string }> }
const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "dev-admin-api-key-change-me"

async function getSuperAdminSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  const session = await verifySessionToken(token)
  if (!session || session.role !== "ROLE_SUPER_ADMIN") return null
  return session
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await getSuperAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const { id } = await params

  try {
    const response = await fetch(`${BACKEND_URL}/admin/api/admins/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        "X-Admin-Api-Key": ADMIN_API_KEY,
        "X-Admin-Role": session.role,
        "X-Admin-Id": String(session.id),
      },
    })
    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json(
        { error: (data as { error?: string }).error || "Failed to delete admin." },
        { status: response.status },
      )
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Unable to connect to the backend." }, { status: 502 })
  }
}
