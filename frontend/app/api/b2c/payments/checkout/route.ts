import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { COOKIE_NAME, verifyB2CSessionToken } from "@/lib/b2c-session"
import { BACKEND_URL } from "@/utils/admin/constants"

const SUPPORTED_PREMIUM_PLANS = new Set(["premium_monthly", "premium_yearly"])

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

  let body: { planId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const planId = body.planId?.trim() ?? ""
  if (!SUPPORTED_PREMIUM_PLANS.has(planId)) {
    return NextResponse.json({ error: "Unsupported plan selected." }, { status: 400 })
  }

  const origin = request.headers.get("origin") ?? request.nextUrl.origin
  const successUrl = `${origin}/B2C/profile/plans?payment=success`
  const cancelUrl = `${origin}/B2C/profile/plans?payment=cancel`

  try {
    const backendResponse = await fetch(`${BACKEND_URL}/api/b2c/payments/checkout-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firebaseUid: session.firebase_uid,
        planId,
        successUrl,
        cancelUrl,
      }),
      cache: "no-store",
    })

    const data = (await backendResponse.json().catch(() => ({}))) as {
      error?: string
      sessionId?: string
      url?: string
    }

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: data.error || "Unable to start Stripe checkout." },
        { status: backendResponse.status },
      )
    }

    return NextResponse.json(
      {
        sessionId: data.sessionId,
        url: data.url,
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
