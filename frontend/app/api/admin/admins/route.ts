import { NextRequest, NextResponse } from "next/server"
import { adminHeaders } from "@/lib/admin-api-helper"
import { cookies } from "next/headers"
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-session"
import { cachedFetch } from "@/lib/fetch-with-cache"
import { BACKEND_URL } from "@/utils/admin/constants"

async function getSuperAdminSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  const session = await verifySessionToken(token)
  if (!session || session.role !== "ROLE_SUPER_ADMIN") return null
  return session
}

async function parseBackendResponse(response: Response): Promise<{ error?: string }> {
  const contentType = response.headers.get("content-type") ?? ""

  if (contentType.includes("application/json")) {
    return (await response.json().catch(() => ({}))) as { error?: string }
  }

  const text = await response.text().catch(() => "")
  return { error: text.trim() || undefined }
}

export async function GET() {
  const session = await getSuperAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  try {
    const data = await cachedFetch<unknown>(`${BACKEND_URL}/admin/api/admins`, {
      cacheKey: "admin:api:admins",
      cacheTtl: 30,
      headers: adminHeaders(session),
    })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Unable to connect to the backend." }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSuperAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  let body: { email?: string; password?: string; role?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  try {
    const response = await fetch(`${BACKEND_URL}/admin/api/admins`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...adminHeaders(session),
      },
      body: JSON.stringify(body),
    })
    const data = await parseBackendResponse(response)
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to create admin." },
        { status: response.status },
      )
    }
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Unable to connect to the backend." }, { status: 502 })
  }
}
