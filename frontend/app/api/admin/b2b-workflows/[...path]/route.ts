import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"
import { BACKEND_URL } from "@/utils/admin/constants"

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

async function proxy(method: string, request: NextRequest): Promise<NextResponse> {
  const adminSession = await getAdminCookie()
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const endpoint = request.nextUrl.pathname.replace("/api/admin/b2b-workflows/", "")
  const params = request.nextUrl.searchParams.toString()
  const backendUrl = `${BACKEND_URL}/api/b2b/admin/${endpoint}${params ? "?" + params : ""}`

  try {
    const options: RequestInit & { headers: Record<string, string> } = {
      method,
      headers: getAdminHeaders(adminSession),
      cache: "no-store",
    }
    if (method !== "GET") {
      options.headers["Content-Type"] = "application/json"
      options.body = await request.text()
    }
    const res = await fetch(backendUrl, options)
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 })
  }
}

export async function GET(request: NextRequest) {
  return proxy("GET", request)
}

export async function POST(request: NextRequest) {
  return proxy("POST", request)
}

export async function PATCH(request: NextRequest) {
  return proxy("PATCH", request)
}
