import { NextRequest, NextResponse } from "next/server"

import { COOKIE_NAME } from "@/lib/admin-session"

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
  const response = NextResponse.json({ success: true })

  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: shouldUseSecureCookies(request),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })

  return response
}
