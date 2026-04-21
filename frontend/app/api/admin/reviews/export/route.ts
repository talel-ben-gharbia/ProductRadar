import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-session"
import { BACKEND_URL } from "@/utils/admin/constants"

const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "dev-admin-api-key-change-me"

async function getAdminSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null

  const session = await verifySessionToken(token)
  if (!session) return null

  if (!["ROLE_SUPER_ADMIN", "ROLE_SUB_ADMIN"].includes(session.role)) {
    return null
  }

  return session
}

export async function GET(request: NextRequest) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const targetUrl = `${BACKEND_URL}/admin/api/reviews/export${request.nextUrl.search}`
  const response = await fetch(targetUrl, {
    method: "GET",
    headers: {
      "X-Admin-Api-Key": ADMIN_API_KEY,
      "X-Admin-Role": session.role,
      "X-Admin-Id": String(session.id),
    },
    cache: "no-store",
  })

  const body = await response.arrayBuffer()
  return new NextResponse(body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "text/csv; charset=UTF-8",
      "Content-Disposition": response.headers.get("content-disposition") ?? "attachment; filename=reviews-export.csv",
    },
  })
}