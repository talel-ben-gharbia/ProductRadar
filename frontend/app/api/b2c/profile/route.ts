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

export async function GET() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ customer: null }, { status: 200 })
  }

  try {
    const data = await cachedFetch<unknown>(
      `${BACKEND_URL}/api/b2c/profile/${encodeURIComponent(session.firebase_uid)}`,
      {
        cacheKey: `b2c:profile:${session.firebase_uid}`,
        cacheTtl: 300,
      },
    )

    return NextResponse.json({ customer: data }, { status: 200 })
  } catch {
    return NextResponse.json(
      { error: "Unable to connect to the backend." },
      { status: 502 },
    )
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  let body: { fullName?: string | null; address?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  try {
    const backendResponse = await fetch(
      `${BACKEND_URL}/api/b2c/profile/${encodeURIComponent(session.firebase_uid)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: body.fullName ?? null,
          address: body.address ?? null,
        }),
      },
    )

    const data = await backendResponse.json().catch(() => ({}))

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: (data as { error?: string }).error || "Failed to update profile." },
        { status: backendResponse.status },
      )
    }

    return NextResponse.json({ customer: data }, { status: 200 })
  } catch {
    return NextResponse.json(
      { error: "Unable to connect to the backend." },
      { status: 502 },
    )
  }
}
