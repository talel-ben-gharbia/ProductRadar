import { NextRequest, NextResponse } from "next/server"

import { BACKEND_URL } from "@/utils/admin/constants"
import {
  COOKIE_NAME,
  SESSION_DURATION,
  createB2CSessionToken,
} from "@/lib/b2c-session"

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

type FirebaseLookupResponse = {
  users?: Array<{
    localId?: string
    email?: string
    displayName?: string
  }>
}

async function verifyFirebaseIdToken(idToken: string) {
  const apiKey =
    process.env.FIREBASE_WEB_API_KEY ??
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    "AIzaSyBHztYA2cs7XtsOsu1gFWOKzBeT6R2gRG4"

  if (!apiKey) {
    throw new Error(
      "Missing Firebase API key configuration. Set FIREBASE_WEB_API_KEY or NEXT_PUBLIC_FIREBASE_API_KEY.",
    )
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    },
  )

  const data = (await response.json().catch(() => ({}))) as FirebaseLookupResponse

  if (!response.ok || !data.users || data.users.length === 0) {
    throw new Error("Invalid Firebase token.")
  }

  const firebaseUser = data.users[0]

  if (!firebaseUser.localId || !firebaseUser.email) {
    throw new Error("Firebase user data is incomplete.")
  }

  return {
    firebaseUid: firebaseUser.localId,
    email: firebaseUser.email,
    fullName: firebaseUser.displayName ?? null,
  }
}

export async function POST(request: NextRequest) {
  if (!isOriginAllowed(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 })
  }

  let body: { idToken?: string; fullName?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const idToken = body.idToken?.trim() ?? ""
  if (!idToken) {
    return NextResponse.json({ error: "Firebase token is required." }, { status: 400 })
  }

  try {
    const firebaseUser = await verifyFirebaseIdToken(idToken)
    const fullNameOverride = body.fullName?.trim() || null

    const backendResponse = await fetch(`${BACKEND_URL}/api/b2c/auth/firebase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...firebaseUser,
        fullName: fullNameOverride ?? firebaseUser.fullName,
      }),
      cache: "no-store",
    })

    const backendData = await backendResponse.json().catch(() => ({}))

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: (backendData as { error?: string }).error || "Authentication failed." },
        { status: backendResponse.status },
      )
    }

    const customer = backendData as {
      id: number
      email: string
      firebase_uid: string
      type: "customer"
      full_name: string | null
      is_verified: boolean
      is_active: boolean
    }

    const token = await createB2CSessionToken({
      id: customer.id,
      email: customer.email,
      firebase_uid: customer.firebase_uid,
      type: "customer",
    })

    const response = NextResponse.json({ success: true, customer })

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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to authenticate."
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
