import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { cachedFetch } from "@/lib/fetch-with-cache"
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

export async function GET() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  try {
    const data = await cachedFetch<unknown>(
      `${BACKEND_URL}/notifications?clientId=${encodeURIComponent(String(session.id))}`,
      {
        cacheKey: `b2c:notifs:${session.id}`,
        cacheTtl: 60,
      },
    )

    return NextResponse.json({ notifications: data }, { status: 200 })
  } catch {
    return NextResponse.json({ error: "Unable to connect to backend." }, { status: 502 })
  }
}
