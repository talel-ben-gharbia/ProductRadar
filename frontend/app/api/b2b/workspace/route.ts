import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { BACKEND_URL } from "@/utils/admin/constants"
import { COOKIE_NAME, verifyB2CSessionToken } from "@/lib/b2c-session"

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const session = await verifyB2CSessionToken(token)
  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get("endpoint") ?? "summary"
  const uid = session.firebase_uid

  const params = new URLSearchParams()
  searchParams.forEach((value, key) => {
    if (key !== "endpoint") params.set(key, value)
  })

  const backendUrl = `${BACKEND_URL}/api/b2b/workspace/${encodeURIComponent(uid)}/${endpoint}${params.toString() ? "?" + params.toString() : ""}`

  try {
    const response = await fetch(backendUrl, { cache: "no-store" })
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 })
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const session = await verifyB2CSessionToken(token)
  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get("endpoint") ?? "summary"
  const uid = session.firebase_uid

  const body = await request.text()
  const backendUrl = `${BACKEND_URL}/api/b2b/workspace/${encodeURIComponent(uid)}/${endpoint}`

  try {
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    })
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 })
  }
}
