import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { cachedFetch } from "@/lib/fetch-with-cache"
import { BACKEND_URL } from "@/utils/admin/constants"
import { COOKIE_NAME, verifyB2CSessionToken } from "@/lib/b2c-session"

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.json({ customer: null }, { status: 200 })
  }

  const session = await verifyB2CSessionToken(token)
  if (!session) {
    const response = NextResponse.json({ customer: null }, { status: 200 })
    response.cookies.delete(COOKIE_NAME)
    return response
  }

  try {
    const profile = await cachedFetch<unknown>(
      `${BACKEND_URL}/api/b2c/profile/${encodeURIComponent(session.firebase_uid)}`,
      {
        cacheKey: `b2c:auth:me:${session.firebase_uid}`,
        cacheTtl: 120,
      },
    )

    return NextResponse.json(
      {
        customer: {
          ...session,
          ...(profile as Record<string, unknown>),
        },
      },
      { status: 200 },
    )
  } catch {
    return NextResponse.json({ customer: session }, { status: 200 })
  }
}
