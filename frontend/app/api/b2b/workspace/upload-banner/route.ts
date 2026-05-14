import { createHmac } from "node:crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { BACKEND_URL } from "@/utils/admin/constants"
import { COOKIE_NAME, verifyB2CSessionToken } from "@/lib/b2c-session"

const B2B_AUTH_SECRET = process.env.B2B_AUTH_SECRET ?? ""

function signB2BAuth(uid: string): string {
  return createHmac("sha256", B2B_AUTH_SECRET).update(uid).digest("hex")
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

  const uid = session.firebase_uid
  const backendUrl = `${BACKEND_URL}/api/b2b/workspace/${encodeURIComponent(uid)}/upload-banner`

  try {
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: { "X-B2B-Auth": signB2BAuth(uid) },
      body: await request.formData(),
    })
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (err) {
    return NextResponse.json(
      { error: `Backend unavailable: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    )
  }
}
