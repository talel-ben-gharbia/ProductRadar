import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { cachedFetch } from "@/lib/fetch-with-cache"
import { BACKEND_URL } from "@/utils/admin/constants"
import { COOKIE_NAME, verifyB2CSessionToken } from "@/lib/b2c-session"

async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  return verifyB2CSessionToken(token)
}

export async function GET(request: NextRequest) {
  const session = await getSession()

  if (!session) {
    console.warn("[favorites/GET] No session found")
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const productListingId = request.nextUrl.searchParams.get("productListingId")?.trim() || ""
  const params = new URLSearchParams({ clientId: String(session.id) })

  if (productListingId) {
    params.set("productListingId", productListingId)
  }

  try {
    const data = await cachedFetch<unknown>(`${BACKEND_URL}/favorites?${params.toString()}`, {
      cacheKey: `b2c:favs:${session.id}`,
      cacheTtl: 60,
    })

    return NextResponse.json({ favorites: data }, { status: 200 })
  } catch {
    return NextResponse.json({ error: "Unable to connect to backend." }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()

  if (!session) {
    console.warn("[favorites/POST] No session found")
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  let body: { productListingId?: number }
  try {
    body = await request.json()
  } catch {
    console.warn("[favorites/POST] Invalid request body")
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  try {
    const backendResponse = await fetch(`${BACKEND_URL}/favorites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productListingId: body.productListingId,
        clientId: session.id,
      }),
      cache: "no-store",
    })

    const data = await backendResponse.json().catch(() => ({}))

    if (!backendResponse.ok) {
      console.warn("[favorites/POST] Backend error:", backendResponse.status, data)
      return NextResponse.json(
        { error: (data as { error?: string }).error || "Failed to save favorite." },
        { status: backendResponse.status },
      )
    }

    return NextResponse.json({ favorite: data }, { status: backendResponse.status })
  } catch (error) {
    console.error("[favorites/POST] Network error:", error)
    return NextResponse.json({ error: "Unable to connect to backend." }, { status: 502 })
  }
}
