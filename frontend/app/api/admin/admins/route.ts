import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-session"
import { BACKEND_URL } from "@/utils/admin/constants"

const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "dev-admin-api-key-change-me"

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
    const response = await fetch(`${BACKEND_URL}/admin/api/admins`, {
      headers: {
        "X-Admin-Api-Key": ADMIN_API_KEY,
        "X-Admin-Role": session.role,
        "X-Admin-Id": String(session.id),
      },
      cache: "no-store",
    })
    const data = await parseBackendResponse(response)
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to fetch admins." },
        { status: response.status },
      )
    }
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
        "X-Admin-Api-Key": ADMIN_API_KEY,
        "X-Admin-Role": session.role,
        "X-Admin-Id": String(session.id),
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
