import { NextRequest, NextResponse } from "next/server"

import {
  createSessionToken,
  COOKIE_NAME,
  SESSION_DURATION,
} from "@/lib/admin-session"
import { BACKEND_URL } from "@/utils/admin/constants"

function shouldUseSecureCookies(request: NextRequest): boolean {
  const configured = process.env.COOKIE_SECURE
  if (configured === "true") return true
  if (configured === "false") return false

  const forwardedProto = request.headers.get("x-forwarded-proto")
  if (forwardedProto) {
    return forwardedProto.split(",")[0]?.trim() === "https"
  }

  return request.nextUrl.protocol === "https:"
}

export async function POST(request: NextRequest) {
  // CSRF: verify request origin matches the host
  const originHeader = request.headers.get("origin")
  const hostHeaderRaw =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  const hostHeader = hostHeaderRaw?.split(",")[0]?.trim()

  if (originHeader && hostHeader) {
    try {
      const expectedHostname = hostHeader.split(":")[0]
      const originHostname = new URL(originHeader).hostname
      if (originHostname !== expectedHostname) {
        return NextResponse.json(
          { error: "Invalid request origin." },
          { status: 403 },
        )
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 },
      )
    }
  }

  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    )
  }

  const email = body.email?.trim() ?? ""
  const password = body.password ?? ""

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    )
  }

  try {
    const backendResponse = await fetch(`${BACKEND_URL}/admin/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    const data = await backendResponse.json()

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: data.error || "Authentication failed." },
        { status: backendResponse.status },
      )
    }

    const token = await createSessionToken(data)

    const response = NextResponse.json({
      success: true,
      admin: { id: data.id, email: data.email, role: data.role },
    })

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: shouldUseSecureCookies(request),
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION,
    })

    return response
  } catch {
    return NextResponse.json(
      { error: "Unable to connect to the authentication server." },
      { status: 502 },
    )
  }
}
