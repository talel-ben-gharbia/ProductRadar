import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { verifySessionToken, COOKIE_NAME } from "./admin-session"
import { BACKEND_URL } from "@/utils/admin/constants"
import { cachedFetch } from "./fetch-with-cache"

const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "dev-admin-api-key-change-me"

export async function getAdminSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  const session = await verifySessionToken(token)
  if (!session) return null
  return ["ROLE_SUPER_ADMIN", "ROLE_SUB_ADMIN"].includes(session.role) ? session : null
}

export async function parseBackendResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    return response.json().catch(() => ({}))
  }
  const text = await response.text().catch(() => "")
  return { error: text.trim() || "Backend returned a non-JSON response." }
}

export function adminHeaders(session: { role: string; id: number }): Record<string, string> {
  return {
    "X-Admin-Api-Key": ADMIN_API_KEY,
    "X-Admin-Role": session.role,
    "X-Admin-Id": String(session.id),
  }
}

export function cacheKeyFor(path: string, suffix?: string): string {
  const base = `admin:api:${path.replace(/^\/+/, "").replace(/\//g, ":")}`
  return suffix ? `${base}:${suffix}` : base
}

export async function handleAdminGet<T>(
  request: NextRequest,
  backendPath: string,
  options?: {
    cacheKey?: string
    cacheTtl?: number
  }
): Promise<NextResponse> {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const qs = request.nextUrl.searchParams.toString()
  const targetUrl = `${BACKEND_URL}${backendPath}${request.nextUrl.search}`
  const baseKey = options?.cacheKey ?? cacheKeyFor(backendPath)
  const key = qs ? `${baseKey}:${qs}` : baseKey

  try {
    const data = await cachedFetch<T>(targetUrl, {
      cacheKey: key,
      cacheTtl: options?.cacheTtl ?? 30,
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

export async function handleAdminGetWithPath<T>(
  request: NextRequest,
  params: { params: Promise<{ path: string[] }> },
  backendBasePath: string,
  options?: {
    cacheKey?: string
    cacheTtl?: number
  }
): Promise<NextResponse> {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const { path } = await params.params
  const suffix = path.length > 0 ? `/${path.map(encodeURIComponent).join("/")}` : ""
  const targetUrl = `${BACKEND_URL}${backendBasePath}${suffix}${request.nextUrl.search}`
  const key = options?.cacheKey ?? `${cacheKeyFor(backendBasePath)}${suffix || "/all"}`

  try {
    const data = await cachedFetch<T>(targetUrl, {
      cacheKey: key,
      cacheTtl: options?.cacheTtl ?? 3600,
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

export async function handleAdminProxy(request: NextRequest, params: { params: Promise<{ path: string[] }> }, backendBasePath: string): Promise<{ session: { role: string; id: number }; suffix: string } | NextResponse> {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const { path } = await params.params
  const suffix = path.length > 0 ? `/${path.map(encodeURIComponent).join("/")}` : ""
  return { session, suffix }
}
