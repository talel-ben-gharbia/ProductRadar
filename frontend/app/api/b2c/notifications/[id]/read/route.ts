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

export async function PUT(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { id } = await context.params
  const notificationId = Number(id)

  if (!Number.isFinite(notificationId) || notificationId <= 0) {
    return NextResponse.json({ error: "Invalid notification id." }, { status: 400 })
  }

  try {
    const backendResponse = await fetch(`${BACKEND_URL}/notifications/${notificationId}/read`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: session.id }),
      cache: "no-store",
    })

    const data = await backendResponse.json().catch(() => ({}))

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: (data as { error?: string }).error || "Failed to mark notification as read." },
        { status: backendResponse.status },
      )
    }

    return NextResponse.json({ notification: data }, { status: 200 })
  } catch {
    return NextResponse.json({ error: "Unable to connect to backend." }, { status: 502 })
  }
}
