import { NextRequest, NextResponse } from "next/server"

import {
  createSessionToken,
  COOKIE_NAME,
  SESSION_DURATION,
} from "@/lib/admin-session"
import { BACKEND_URL } from "@/utils/admin/constants"

const RATE_LIMIT_WINDOW = 15 * 60 * 1000
const RATE_LIMIT_MAX_ATTEMPTS = 10

const failedAttempts = new Map<string, { count: number; resetAt: number }>()

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown"
  return request.headers.get("x-real-ip") ?? request.headers.get("host") ?? "unknown"
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const entry = failedAttempts.get(ip)
  if (!entry || now > entry.resetAt) {
    return { allowed: true, remaining: RATE_LIMIT_MAX_ATTEMPTS, resetIn: 0 }
  }
  const remaining = Math.max(0, RATE_LIMIT_MAX_ATTEMPTS - entry.count)
  return { allowed: entry.count < RATE_LIMIT_MAX_ATTEMPTS, remaining, resetIn: Math.ceil((entry.resetAt - now) / 1000) }
}

function recordFailedAttempt(ip: string) {
  const now = Date.now()
  const entry = failedAttempts.get(ip)
  if (!entry || now > entry.resetAt) {
    failedAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
  } else {
    entry.count++
  }
}

function recordSuccessfulAttempt(ip: string) {
  failedAttempts.delete(ip)
}

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

function isOriginAllowed(request: NextRequest): boolean {
  if (process.env.STRICT_ORIGIN_CHECK !== "true") {
    return true
  }

  const originHeader = request.headers.get("origin")
  const hostHeaderRaw =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  const hostHeader = hostHeaderRaw?.split(",")[0]?.trim()

  if (!originHeader || !hostHeader) {
    return true
  }

  try {
    const expectedHostname = hostHeader.split(":")[0]
    const originHostname = new URL(originHeader).hostname
    return originHostname === expectedHostname
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  if (!isOriginAllowed(request)) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    )
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

  const ip = getClientIp(request)
  const rateLimit = checkRateLimit(ip)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Too many login attempts. Try again in ${rateLimit.resetIn} seconds.` },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.resetIn),
          "X-RateLimit-Remaining": "0",
        },
      },
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
      recordFailedAttempt(ip)
      return NextResponse.json(
        { error: data.error || "Authentication failed." },
        { status: backendResponse.status },
      )
    }

    recordSuccessfulAttempt(ip)
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
