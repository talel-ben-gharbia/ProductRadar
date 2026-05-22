import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { COOKIE_NAME, verifyB2CSessionToken } from "@/lib/b2c-session"
import { BACKEND_URL } from "@/utils/admin/constants"

async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  return verifyB2CSessionToken(token)
}

export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get("productId")?.trim() ?? ""
  const limit = request.nextUrl.searchParams.get("limit")?.trim() ?? "20"
  const offset = request.nextUrl.searchParams.get("offset")?.trim() ?? "0"

  if (!productId) {
    return NextResponse.json({ error: "productId is required." }, { status: 400 })
  }

  const query = new URLSearchParams({ productId, limit, offset })

  try {
    const response = await fetch(`${BACKEND_URL}/api/b2c/reviews?${query.toString()}`, {
      cache: "no-store",
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return NextResponse.json(
        { error: (data as { error?: string }).error || "Failed to load reviews." },
        { status: response.status },
      )
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Unable to connect to backend." }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  let body: { productId?: number; rating?: number; comment?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/b2c/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: session.id,
        productId: body.productId,
        rating: body.rating,
        comment: body.comment,
      }),
      cache: "no-store",
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return NextResponse.json(
        { error: (data as { error?: string }).error || "Failed to submit review." },
        { status: response.status },
      )
    }

    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ error: "Unable to connect to backend." }, { status: 502 })
  }
}
