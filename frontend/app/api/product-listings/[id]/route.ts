import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-session"
import { BACKEND_URL } from "@/utils/admin/constants"
import { invalidateCache } from "@/lib/fetch-with-cache"

async function isSuperAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) {
    return false
  }

  const session = await verifySessionToken(token)
  return session?.role === "ROLE_SUPER_ADMIN"
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Only super admins can update listings." }, { status: 403 })
  }

  const { id } = await params

  let body: { is_active?: boolean; availability?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const hasActive = typeof body.is_active === "boolean"
  const hasAvailability = typeof body.availability === "boolean"

  if (!hasActive && !hasAvailability) {
    return NextResponse.json(
      { error: "Provide is_active or availability as a boolean." },
      { status: 400 }
    )
  }

  try {
    if (hasActive) {
      const response = await fetch(
        `${BACKEND_URL}/product-listings/${encodeURIComponent(id)}/active`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: body.is_active }),
        }
      )
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        return NextResponse.json(
          { error: (data as { error?: string }).error || "Failed to update listing." },
          { status: response.status }
        )
      }
      const data = await response.json()
      await invalidateCache("listings:*")
      return NextResponse.json(data)
    }

    const response = await fetch(
      `${BACKEND_URL}/product-listings/${encodeURIComponent(id)}/availability`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability: body.availability }),
      }
    )
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: (data as { error?: string }).error || "Failed to update listing." },
        { status: response.status }
      )
    }
    await invalidateCache("listings:*")
    return NextResponse.json(await response.json())
  } catch {
    return NextResponse.json(
      { error: "Unable to connect to the backend." },
      { status: 502 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Only super admins can update listings." }, { status: 403 })
  }

  const { id } = await params

  let body: { ref?: string; price?: number; old_price?: number | null; product_url?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  try {
    const response = await fetch(
      `${BACKEND_URL}/product-listings/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    )

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: (data as { error?: string }).error || "Failed to update listing." },
        { status: response.status }
      )
    }

    await invalidateCache("listings:*")
    return NextResponse.json(await response.json())
  } catch {
    return NextResponse.json({ error: "Unable to connect to the backend." }, { status: 502 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Only super admins can delete listings." }, { status: 403 })
  }

  const { id } = await params

  try {
    const response = await fetch(
      `${BACKEND_URL}/product-listings/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    )

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: (data as { error?: string }).error || "Failed to delete listing." },
        { status: response.status }
      )
    }

    await invalidateCache("listings:*")
    return NextResponse.json(await response.json())
  } catch {
    return NextResponse.json({ error: "Unable to connect to the backend." }, { status: 502 })
  }
}
