import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-session"
import { BACKEND_URL } from "@/utils/admin/constants"

type Params = { params: Promise<{ path: string[] }> }

const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "dev-admin-api-key-change-me"

function buildBackendCandidates(baseUrl: string): string[] {
  const normalized = baseUrl.replace(/\/+$/, "")

  if (normalized.includes("127.0.0.1:8000") || normalized.includes("localhost:8000")) {
    return [normalized, normalized.replace(":8000", ":8001")]
  }

  if (normalized.includes("127.0.0.1:8001") || normalized.includes("localhost:8001")) {
    return [normalized, normalized.replace(":8001", ":8000")]
  }

  return [normalized]
}

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

async function parseBackendResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    return response.json().catch(() => ({}))
  }

  const text = await response.text().catch(() => "")
  return { error: text.trim() || "Backend returned a non-JSON response." }
}

async function proxyRequest(request: NextRequest, params: Params, method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE") {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const { path } = await params.params
  const suffix = path.length > 0 ? `/${path.map(encodeURIComponent).join("/")}` : ""
  const candidates = buildBackendCandidates(BACKEND_URL)

  const headers: HeadersInit = {
    "X-Admin-Api-Key": ADMIN_API_KEY,
    "X-Admin-Role": session.role,
    "X-Admin-Id": String(session.id),
  }

  let body: string | undefined
  if (method !== "GET") {
    const rawBody = await request.text()
    if (rawBody) {
      headers["Content-Type"] = "application/json"
      body = rawBody
    }
  }

  let lastErrorMessage = "Unable to connect to the backend."

  for (const candidate of candidates) {
    const targetUrl = `${candidate}/api/b2b/admin${suffix}${request.nextUrl.search}`

    try {
      const response = await fetch(targetUrl, {
        method,
        headers,
        body,
        cache: "no-store",
      })

      const data = await parseBackendResponse(response)
      if (!response.ok) {
        const error = (data as { error?: string }).error || "Backend request failed."
        return NextResponse.json({ error }, { status: response.status })
      }

      return NextResponse.json(data)
    } catch (error) {
      lastErrorMessage = error instanceof Error ? error.message : lastErrorMessage
    }
  }

  return NextResponse.json(
    { error: `Unable to connect to the backend. ${lastErrorMessage}` },
    { status: 502 },
  )
}

export async function GET(request: NextRequest, params: Params) {
  return proxyRequest(request, params, "GET")
}

export async function POST(request: NextRequest, params: Params) {
  return proxyRequest(request, params, "POST")
}

export async function PATCH(request: NextRequest, params: Params) {
  return proxyRequest(request, params, "PATCH")
}

export async function PUT(request: NextRequest, params: Params) {
  return proxyRequest(request, params, "PUT")
}

export async function DELETE(request: NextRequest, params: Params) {
  return proxyRequest(request, params, "DELETE")
}
