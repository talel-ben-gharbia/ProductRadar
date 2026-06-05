import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-session"
import { cachedFetch, invalidateCache } from "@/lib/fetch-with-cache"
import { BACKEND_URL } from "@/utils/admin/constants"

async function isSuperAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) {
    return false
  }

  const session = await verifySessionToken(token)
  return session?.role === "ROLE_SUPER_ADMIN"
}

export async function GET() {
  try {
    const data = await cachedFetch<unknown>(`${BACKEND_URL}/categories`, {
      cacheKey: "categories:all",
      cacheTtl: 300,
    })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { message: "Unable to load categories from backend. Failed to fetch" },
      { status: 502 }
    )
  }
}

export async function POST(request: NextRequest) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Only super admins can create categories." }, { status: 403 })
  }

  let body: { name?: string; parentId?: number | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  try {
    const response = await fetch(`${BACKEND_URL}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        { error: (data as { error?: string }).error || "Failed to create category." },
        { status: response.status }
      )
    }

    await invalidateCache("categories:*")
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Unable to connect to the backend." },
      { status: 502 }
    )
  }
}
