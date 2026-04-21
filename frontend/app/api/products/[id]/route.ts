import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-session"
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
    return NextResponse.json({ error: "Only super admins can update products." }, { status: 403 })
  }

  const { id } = await params

  let body: {
    name?: string
    brand?: string | null
    description?: string
    image_url?: string | null
    categoryId?: number | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  try {
    const response = await fetch(`${BACKEND_URL}/products/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: (data as { error?: string }).error || "Failed to update product." },
        { status: response.status }
      )
    }

    return NextResponse.json(await response.json())
  } catch {
    return NextResponse.json({ error: "Unable to connect to the backend." }, { status: 502 })
  }
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params

  try {
    const response = await fetch(`${BACKEND_URL}/products/${encodeURIComponent(id)}`, {
      method: "GET",
      cache: "no-store",
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: (data as { error?: string }).error || "Failed to fetch product." },
        { status: response.status }
      )
    }

    return NextResponse.json(await response.json())
  } catch {
    return NextResponse.json({ error: "Unable to connect to the backend." }, { status: 502 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Only super admins can delete products." }, { status: 403 })
  }

  const { id } = await params

  try {
    const response = await fetch(`${BACKEND_URL}/products/${encodeURIComponent(id)}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: (data as { error?: string }).error || "Failed to delete product." },
        { status: response.status }
      )
    }

    return NextResponse.json(await response.json())
  } catch {
    return NextResponse.json({ error: "Unable to connect to the backend." }, { status: 502 })
  }
}
