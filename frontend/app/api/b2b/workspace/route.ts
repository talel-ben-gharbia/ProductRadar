import { createHmac } from "node:crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { BACKEND_URL } from "@/utils/admin/constants"
import { COOKIE_NAME, verifyB2CSessionToken } from "@/lib/b2c-session"

const B2B_AUTH_SECRET = process.env.B2B_AUTH_SECRET ?? ""

function signB2BAuth(uid: string): string {
  return createHmac("sha256", B2B_AUTH_SECRET).update(uid).digest("hex")
}

function authHeaders(uid: string): Record<string, string> {
  return { "X-B2B-Auth": signB2BAuth(uid) }
}

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
    const response = await fetch(backendUrl, {
      cache: "no-store",
      headers: authHeaders(uid),
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

  const params = new URLSearchParams()
  searchParams.forEach((value, key) => {
    if (key !== "endpoint") params.set(key, value)
  })

  const body = await request.text()
  const backendUrl = `${BACKEND_URL}/api/b2b/workspace/${encodeURIComponent(uid)}/${endpoint}${params.toString() ? "?" + params.toString() : ""}`

  try {
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(uid) },
      body,
    })
    const text = await response.text()
    try {
      const data = JSON.parse(text)
      return NextResponse.json(data, { status: response.status })
    } catch {
      return NextResponse.json(
        { error: `Backend error (${response.status}): ${text.slice(0, 200)}` },
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

export async function PUT(request: Request) {
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

  const body = await request.text()
  const backendUrl = `${BACKEND_URL}/api/b2b/workspace/${encodeURIComponent(uid)}/${endpoint}${params.toString() ? "?" + params.toString() : ""}`

  try {
    const response = await fetch(backendUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders(uid) },
      body,
    })
    const text = await response.text()
    try {
      const data = JSON.parse(text)
      return NextResponse.json(data, { status: response.status })
    } catch {
      return NextResponse.json(
        { error: `Backend error (${response.status}): ${text.slice(0, 200)}` },
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

export async function DELETE(request: Request) {
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
    const response = await fetch(backendUrl, {
      method: "DELETE",
      cache: "no-store",
      headers: authHeaders(uid),
    })
    const text = await response.text()
    try {
      const data = JSON.parse(text)
      return NextResponse.json(data, { status: response.status })
    } catch {
      return NextResponse.json(
        { error: `Backend error (${response.status}): ${text.slice(0, 200)}` },
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
