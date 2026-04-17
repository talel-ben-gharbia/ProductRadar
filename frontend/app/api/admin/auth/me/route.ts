import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-session"

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

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 },
    )
  }

  const session = await verifySessionToken(token)

  if (!session) {
    return NextResponse.json(
      { error: "Session expired." },
      { status: 401 },
    )
  }

  return NextResponse.json({
    admin: {
      id: session.id,
      email: session.email,
      role: session.role,
    },
  })
}
