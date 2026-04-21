import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-session"
import { BACKEND_URL } from "@/utils/admin/constants"

const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "dev-admin-api-key-change-me"

async function getAdminSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null;

  const session = await verifySessionToken(token)
  if (!session) return null;

  if (!["ROLE_SUPER_ADMIN", "ROLE_SUB_ADMIN"].includes(session.role)) {
    return null
  }

  return session
}

async function parseBackendResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    return response.json().catch(() => ({}))
  }

  const text = await response.text().catch(() => "")
  return { error: text.trim() || "Backend returned a non-JSON response." }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sourceName: string }> }
) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const { sourceName } = await params
  const backendUrl = `${BACKEND_URL}/admin/api/scraping-logs/source/${encodeURIComponent(sourceName)}/health`

  try {
    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "X-Admin-Api-Key": ADMIN_API_KEY,
        "X-Admin-Role": session.role,
        "X-Admin-Id": String(session.id),
      },
      cache: "no-store",
    })

    const data = await parseBackendResponse(response)
    if (!response.ok) {
      const error = (data as { error?: string }).error || "Failed to fetch source health."
      return NextResponse.json({ error }, { status: response.status })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Unable to connect to the backend." }, { status: 502 })
  }
}
