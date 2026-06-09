import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { BACKEND_URL } from "@/utils/admin/constants"
import { COOKIE_NAME as ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin-session"
import { COOKIE_NAME as B2C_COOKIE_NAME, verifyB2CSessionToken } from "@/lib/b2c-session"

const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "dev-admin-api-key-change-me"

async function proxyWithUid(request: Request, firebaseUid: string) {
  const { searchParams } = new URL(request.url)
  const params = new URLSearchParams(searchParams)
  const backendUrl = `${BACKEND_URL}/price-history${params.toString() ? "?" + params.toString() : ""}`

  try {
    const response = await fetch(backendUrl, {
      cache: "no-store",
      headers: { "X-Firebase-Uid": firebaseUid },
    })

    const text = await response.text()
    try {
      const data = JSON.parse(text)
      return NextResponse.json(data, { status: response.status })
    } catch {
      return NextResponse.json(
        { error: `Backend error (${response.status}): ${text.slice(0, 500)}` },
        { status: 502 },
      )
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Backend unavailable: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    )
  }
}

async function proxyWithAdminAuth(request: Request) {
  const { searchParams } = new URL(request.url)
  const params = new URLSearchParams(searchParams)
  const backendUrl = `${BACKEND_URL}/price-history${params.toString() ? "?" + params.toString() : ""}`

  try {
    const response = await fetch(backendUrl, {
      cache: "no-store",
      headers: {
        "X-Admin-Api-Key": ADMIN_API_KEY,
        "X-Admin-Role": "ROLE_SUPER_ADMIN",
      },
    })

    const text = await response.text()
    try {
      const data = JSON.parse(text)
      return NextResponse.json(data, { status: response.status })
    } catch {
      return NextResponse.json(
        { error: `Backend error (${response.status}): ${text.slice(0, 500)}` },
        { status: 502 },
      )
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Backend unavailable: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    )
  }
}

export async function GET(request: Request) {
  const cookieStore = await cookies()

  // B2C auth
  const token = cookieStore.get(B2C_COOKIE_NAME)?.value
  if (token) {
    const session = await verifyB2CSessionToken(token)
    if (session) {
      return proxyWithUid(request, session.firebase_uid)
    }
  }

  // Admin auth
  const adminToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value
  if (adminToken) {
    const adminSession = await verifySessionToken(adminToken)
    if (adminSession && ["ROLE_SUPER_ADMIN", "ROLE_SUB_ADMIN"].includes(adminSession.role)) {
      return proxyWithAdminAuth(request)
    }
  }

  // Direct X-Firebase-Uid header (e.g. from server-side)
  const firebaseUid = request.headers.get("X-Firebase-Uid")
  if (firebaseUid) {
    return proxyWithUid(request, firebaseUid)
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
