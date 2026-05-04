import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000"

async function getAdminCookie() {
  const cookieStore = await cookies()
  return cookieStore.get("admin_session")?.value ?? null
}

const getAdminHeaders = (adminSession: string) => ({
  Cookie: `admin_session=${adminSession}`,
  "X-Admin-Token": adminSession,
  "X-Admin-Api-Key": process.env.ADMIN_API_KEY ?? "dev-admin-api-key-change-me",
  "X-Admin-Role": "ROLE_SUPER_ADMIN",
  "X-Admin-Id": "1",
})

export async function GET(request: NextRequest) {
  const adminSession = await getAdminCookie()
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const endpoint = request.nextUrl.pathname.replace("/api/admin/b2b-workflows/", "")
  const params = request.nextUrl.searchParams.toString()
  const backendUrl = `${BACKEND_URL}/api/b2b/admin/${endpoint}${params ? "?" + params : ""}`

  try {
    const res = await fetch(backendUrl, {
      headers: getAdminHeaders(adminSession),
      cache: "no-store",
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const adminSession = await getAdminCookie()
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const endpoint = request.nextUrl.pathname.replace("/api/admin/b2b-workflows/", "")
  const body = await request.text()
  const backendUrl = `${BACKEND_URL}/api/b2b/admin/${endpoint}`

  try {
    const res = await fetch(backendUrl, {
      method: "POST",
      headers: { ...getAdminHeaders(adminSession), "Content-Type": "application/json" },
      body,
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 })
  }
}

export async function PATCH(request: NextRequest) {
  const adminSession = await getAdminCookie()
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const endpoint = request.nextUrl.pathname.replace("/api/admin/b2b-workflows/", "")
  const body = await request.text()
  const backendUrl = `${BACKEND_URL}/api/b2b/admin/${endpoint}`

  try {
    const res = await fetch(backendUrl, {
      method: "PATCH",
      headers: { ...getAdminHeaders(adminSession), "Content-Type": "application/json" },
      body,
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 })
  }
}
