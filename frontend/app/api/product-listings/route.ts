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

export async function POST(request: NextRequest) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Only super admins can create listings." }, { status: 403 })
  }

  let body: {
    productId?: number
    sellerId?: number
    ref?: string
    price?: number
    old_price?: number | null
    product_url?: string
    availability?: boolean | null
    is_active?: boolean
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  try {
    const response = await fetch(`${BACKEND_URL}/product-listings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        { error: (data as { error?: string }).error || "Failed to create listing." },
        { status: response.status }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Unable to connect to the backend." }, { status: 502 })
  }
}
