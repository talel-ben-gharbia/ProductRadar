import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

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

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession()

  if (!session) {
    console.warn("[favorites/[id]/DELETE] No session found")
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { id } = await context.params
  const favoriteId = Number(id)

  if (!Number.isFinite(favoriteId) || favoriteId <= 0) {
    console.warn("[favorites/[id]/DELETE] Invalid favorite id:", id)
    return NextResponse.json({ error: "Invalid favorite id." }, { status: 400 })
  }

  try {
    const backendResponse = await fetch(
      `${BACKEND_URL}/favorites/${favoriteId}?clientId=${encodeURIComponent(String(session.id))}`,
      {
        method: "DELETE",
        cache: "no-store",
      },
    )

    const data = await backendResponse.json().catch(() => ({}))

    if (!backendResponse.ok) {
      console.warn("[favorites/[id]/DELETE] Backend error:", backendResponse.status, data)
      return NextResponse.json(
        { error: (data as { error?: string }).error || "Failed to delete favorite." },
        { status: backendResponse.status },
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[favorites/[id]/DELETE] Network error:", error)
    return NextResponse.json({ error: "Unable to connect to backend." }, { status: 502 })
  }
}
