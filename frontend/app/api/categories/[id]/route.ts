import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-session"
import { invalidateCache } from "@/lib/fetch-with-cache"
import { BACKEND_URL } from "@/utils/admin/constants"

type Params = { params: Promise<{ id: string }> }

async function isSuperAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) {
    return false
  }

  const session = await verifySessionToken(token)
  return session?.role === "ROLE_SUPER_ADMIN"
}

export async function PUT(request: NextRequest, { params }: Params) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Only super admins can update categories." }, { status: 403 })
  }

  const { id } = await params

  let body: { name?: string; parentId?: number | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  try {
    const response = await fetch(`${BACKEND_URL}/categories/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        { error: (data as { error?: string }).error || "Failed to update category." },
        { status: response.status }
      )
    }

    await invalidateCache("categories:*")
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "Unable to connect to the backend." },
      { status: 502 }
    )
  }
}
