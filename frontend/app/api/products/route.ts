import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-session"
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

export async function GET(request: NextRequest) {
  try {
    const categoryId = request.nextUrl.searchParams.get("categoryId")
    const query = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : ""

    const response = await fetch(`${BACKEND_URL}/products${query}`, {
      cache: "no-store",
    })

    if (!response.ok) {
      return NextResponse.json(
        { message: `Failed to fetch products: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { message: "Unable to load products from backend. Failed to fetch" },
      { status: 502 }
    )
  }
}

export async function POST(request: NextRequest) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Only super admins can create products." }, { status: 403 })
  }

  let body: {
    name?: string
    brand?: string | null
    description?: string
    image_url?: string | null
    categoryId?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  try {
    const response = await fetch(`${BACKEND_URL}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return NextResponse.json(
        { error: (data as { error?: string }).error || "Failed to create product." },
        { status: response.status }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Unable to connect to the backend." },
      { status: 502 }
    )
  }
}
