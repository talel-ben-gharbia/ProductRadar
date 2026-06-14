import { NextRequest, NextResponse } from "next/server"
import { getAdminSession, parseBackendResponse, adminHeaders } from "@/lib/admin-api-helper"
import { cachedFetch } from "@/lib/fetch-with-cache"
import { BACKEND_URL } from "@/utils/admin/constants"

export async function GET(request: NextRequest) {
  return handleAdminGetWithFetch(request, "/admin/api/subscriptions", "admin:api:subscriptions", 30)
}

async function handleAdminGetWithFetch(request: NextRequest, backendPath: string, baseCacheKey: string, cacheTtl = 30) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const qs = request.nextUrl.searchParams.toString()
  const targetUrl = `${BACKEND_URL}${backendPath}${request.nextUrl.search}`
  const cacheKey = qs ? `${baseCacheKey}:${qs}` : baseCacheKey

  try {
    const data = await cachedFetch<unknown>(targetUrl, {
      cacheKey,
      cacheTtl,
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

export async function POST(request: NextRequest) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const targetUrl = `${BACKEND_URL}/admin/api/subscriptions${request.nextUrl.search}`
  const rawBody = await request.text()

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        ...adminHeaders(session),
        "Content-Type": "application/json",
      },
      body: rawBody,
      cache: "no-store",
    })

    const data = await parseBackendResponse(response)
    if (!response.ok) {
      const error = (data as { error?: string }).error || "Failed to run subscription action."
      return NextResponse.json({ error }, { status: response.status })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "Unable to connect to the backend." },
      { status: 502 },
    )
  }
}
