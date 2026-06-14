import { NextRequest, NextResponse } from "next/server"
import { getAdminSession, adminHeaders } from "@/lib/admin-api-helper"
import { cachedFetch } from "@/lib/fetch-with-cache"
import { BACKEND_URL } from "@/utils/admin/constants"

type Params = { params: Promise<{ path: string[] }> }

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

export async function GET(request: NextRequest, params: Params) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const { path } = await params.params
  const suffix = path.length > 0 ? `/${path.map(encodeURIComponent).join("/")}` : ""

  const candidates = buildBackendCandidates(BACKEND_URL)
  const cacheKey = `admin:api:users${suffix || "/all"}`

  let lastError = ""

  for (const candidate of candidates) {
    const targetUrl = `${candidate}/admin/api/users${suffix}${request.nextUrl.search}`

    try {
      const data = await cachedFetch<unknown>(targetUrl, {
        cacheKey,
        cacheTtl: 30,
        headers: adminHeaders(session),
      })
      return NextResponse.json(data)
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
  }

  return NextResponse.json(
    { error: `Unable to connect to the backend. ${lastError}` },
    { status: 502 },
  )
}

export async function PATCH(request: NextRequest, params: Params) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const { path } = await params.params
  const suffix = path.length > 0 ? `/${path.map(encodeURIComponent).join("/")}` : ""

  const candidates = buildBackendCandidates(BACKEND_URL)
  let lastError = ""

  for (const candidate of candidates) {
    const targetUrl = `${candidate}/admin/api/users${suffix}${request.nextUrl.search}`

    try {
      const response = await fetch(targetUrl, {
        method: "PATCH",
        headers: { ...adminHeaders(session), "Content-Type": "application/json" },
        body: await request.text(),
        cache: "no-store",
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        return NextResponse.json(
          {
            error: (data as { error?: string }).error || "Backend request failed.",
            detail: (data as { detail?: string }).detail || undefined,
          },
          { status: response.status },
        )
      }

      return NextResponse.json(data)
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
  }

  return NextResponse.json(
    { error: `Unable to connect to the backend. ${lastError}` },
    { status: 502 },
  )
}
