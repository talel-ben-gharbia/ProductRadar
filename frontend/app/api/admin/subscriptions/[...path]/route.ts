import { NextRequest, NextResponse } from "next/server"
import { getAdminSession, adminHeaders } from "@/lib/admin-api-helper"
import { cachedFetch } from "@/lib/fetch-with-cache"
import { BACKEND_URL } from "@/utils/admin/constants"

type Params = { params: Promise<{ path: string[] }> }

export async function GET(request: NextRequest, params: Params) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const { path } = await params.params
  const suffix = path.length > 0 ? `/${path.map(encodeURIComponent).join("/")}` : ""
  const targetUrl = `${BACKEND_URL}/admin/api/subscriptions${suffix}${request.nextUrl.search}`
  const cacheKey = `admin:api:subscriptions${suffix || "/all"}`

  try {
    const data = await cachedFetch<unknown>(targetUrl, {
      cacheKey,
      cacheTtl: 30,
      headers: adminHeaders(session),
    })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "Unable to connect to the backend." },
      { status: 502 },
    )
  }
}

export async function POST(request: NextRequest, params: Params) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const { path } = await params.params
  const suffix = path.length > 0 ? `/${path.map(encodeURIComponent).join("/")}` : ""
  const targetUrl = `${BACKEND_URL}/admin/api/subscriptions${suffix}${request.nextUrl.search}`

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        ...adminHeaders(session),
        "Content-Type": "application/json",
      },
      body: await request.text(),
      cache: "no-store",
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return NextResponse.json(
        { error: (data as { error?: string }).error || "Failed to process subscription." },
        { status: response.status },
      )
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "Unable to connect to the backend." },
      { status: 502 },
    )
  }
}
