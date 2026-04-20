import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { COOKIE_NAME, verifyB2CSessionToken } from "@/lib/b2c-session"
import { BACKEND_URL } from "@/utils/admin/constants"

async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) return null

  return verifyB2CSessionToken(token)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  let body: { sessionId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const sessionId = body.sessionId?.trim() ?? ""
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 })
  }

  try {
    const backendResponse = await fetch(`${BACKEND_URL}/api/b2c/payments/confirm-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firebaseUid: session.firebase_uid,
        sessionId,
      }),
      cache: "no-store",
    })

    const data = (await backendResponse.json().catch(() => ({}))) as {
      error?: string
      success?: boolean
      subscription?: unknown
    }

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: data.error || "Unable to confirm Stripe checkout." },
        { status: backendResponse.status },
      )
    }

    return NextResponse.json(
      {
        success: Boolean(data.success),
        subscription: data.subscription ?? null,
      },
      { status: 200 },
    )
  } catch {
    return NextResponse.json(
      { error: "Unable to connect to the backend." },
      { status: 502 },
    )
  }
}
