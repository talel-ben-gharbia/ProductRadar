import { NextRequest, NextResponse } from "next/server"

import {
  verifySessionToken,
  shouldRefreshSession,
  createSessionToken,
  COOKIE_NAME,
  SESSION_DURATION,
} from "@/lib/admin-session"

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect all /admin routes except the login page
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = request.cookies.get("admin_session")?.value

    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }

    const session = await verifySessionToken(token)
    if (!session) {
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }

    // Protect super-admin-only routes
    if (
      pathname.startsWith("/admin/admins") &&
      session.role !== "ROLE_SUPER_ADMIN"
    ) {
      return NextResponse.redirect(new URL("/admin", request.url))
    }

    // Sliding session: refresh token when approaching expiry
    if (shouldRefreshSession(session)) {
      const refreshed = await createSessionToken(session)
      const response = NextResponse.next()
      response.cookies.set({
        name: COOKIE_NAME,
        value: refreshed,
        httpOnly: true,
        secure: shouldUseSecureCookies(request),
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_DURATION,
      })
      return response
    }
  }

  // Redirect authenticated admins away from login page
  if (pathname === "/admin/login") {
    const token = request.cookies.get("admin_session")?.value
    if (token) {
      const session = await verifySessionToken(token)
      if (session) {
        return NextResponse.redirect(new URL("/admin", request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
