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
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { id } = await context.params
  const alertId = Number(id)

  if (!Number.isFinite(alertId) || alertId <= 0) {
    return NextResponse.json({ error: "Invalid alert id." }, { status: 400 })
  }

  let body: { is_price_notif?: boolean; is_stock_notif?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  try {
    const backendResponse = await fetch(`${BACKEND_URL}/alerts/${alertId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        alerterId: session.id,
        is_price_notif: Boolean(body.is_price_notif),
        is_stock_notif: Boolean(body.is_stock_notif),
      }),
      cache: "no-store",
    })

    const data = await backendResponse.json().catch(() => ({}))

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: (data as { error?: string }).error || "Failed to update alert." },
        { status: backendResponse.status },
      )
    }

    return NextResponse.json({ alert: data }, { status: 200 })
  } catch {
    return NextResponse.json({ error: "Unable to connect to backend." }, { status: 502 })
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { id } = await context.params
  const alertId = Number(id)

  if (!Number.isFinite(alertId) || alertId <= 0) {
    return NextResponse.json({ error: "Invalid alert id." }, { status: 400 })
  }

  try {
    const backendResponse = await fetch(
      `${BACKEND_URL}/alerts/${alertId}?alerterId=${encodeURIComponent(String(session.id))}`,
      {
        method: "DELETE",
        cache: "no-store",
      },
    )

    const data = await backendResponse.json().catch(() => ({}))

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: (data as { error?: string }).error || "Failed to delete alert." },
        { status: backendResponse.status },
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch {
    return NextResponse.json({ error: "Unable to connect to backend." }, { status: 502 })
  }
}
