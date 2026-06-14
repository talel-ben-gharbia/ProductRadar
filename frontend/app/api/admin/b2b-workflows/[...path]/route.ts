import { NextResponse, type NextRequest } from "next/server"
import { getAdminSession, adminHeaders } from "@/lib/admin-api-helper"
import { cachedFetch } from "@/lib/fetch-with-cache"
import { BACKEND_URL } from "@/utils/admin/constants"

export async function GET(request: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const endpoint = request.nextUrl.pathname.replace("/api/admin/b2b-workflows/", "")
  const params = request.nextUrl.searchParams.toString()
  const backendUrl = `${BACKEND_URL}/api/b2b/admin/${endpoint}${params ? "?" + params : ""}`

  try {
    const data = await cachedFetch<unknown>(backendUrl, {
      cacheKey: `admin:api:b2b-workflows:${endpoint.replace(/\//g, ":")}`,
      cacheTtl: 30,
      headers: adminHeaders(session),
    })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const endpoint = request.nextUrl.pathname.replace("/api/admin/b2b-workflows/", "")
  const params = request.nextUrl.searchParams.toString()
  const backendUrl = `${BACKEND_URL}/api/b2b/admin/${endpoint}${params ? "?" + params : ""}`

  try {
    const res = await fetch(backendUrl, {
      method: "POST",
      headers: { ...adminHeaders(session), "Content-Type": "application/json" },
      body: await request.text(),
      cache: "no-store",
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 })
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const endpoint = request.nextUrl.pathname.replace("/api/admin/b2b-workflows/", "")
  const params = request.nextUrl.searchParams.toString()
  const backendUrl = `${BACKEND_URL}/api/b2b/admin/${endpoint}${params ? "?" + params : ""}`

  try {
    const res = await fetch(backendUrl, {
      method: "PATCH",
      headers: { ...adminHeaders(session), "Content-Type": "application/json" },
      body: await request.text(),
      cache: "no-store",
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 })
  }
}
