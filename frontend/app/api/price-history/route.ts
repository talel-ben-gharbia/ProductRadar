import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { BACKEND_URL } from "@/utils/admin/constants"
import { COOKIE_NAME, verifyB2CSessionToken } from "@/lib/b2c-session"

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

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (token) {
    const session = await verifyB2CSessionToken(token)
    if (session) {
      return proxyWithUid(request, session.firebase_uid)
    }
  }

  const firebaseUid = request.headers.get("X-Firebase-Uid")
  if (firebaseUid) {
    return proxyWithUid(request, firebaseUid)
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
