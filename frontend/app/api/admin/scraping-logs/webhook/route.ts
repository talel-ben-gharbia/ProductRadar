import { createHmac } from "crypto"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-session"
import { BACKEND_URL } from "@/utils/admin/constants"

const WEBHOOK_API_KEY = process.env.WEBHOOK_API_KEY ?? "dev-webhook-api-key-change-me"

async function getAdminSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null

  const session = await verifySessionToken(token)
  if (!session) return null

  if (!["ROLE_SUPER_ADMIN", "ROLE_SUB_ADMIN"].includes(session.role)) {
    return null
  }

  return session
}

async function parseBackendResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    return response.json().catch(() => ({}))
  }

  const text = await response.text().catch(() => "")
  return { error: text.trim() || "Backend returned a non-JSON response." }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const rawBody = await request.text()
  const signature = createHmac("sha256", WEBHOOK_API_KEY).update(rawBody).digest("hex")

  try {
    const response = await fetch(`${BACKEND_URL}/admin/api/scraping-logs/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Api-Key": WEBHOOK_API_KEY,
        "X-Webhook-Signature": `sha256=${signature}`,
      },
      body: rawBody,
      cache: "no-store",
    })

    const data = await parseBackendResponse(response)
    if (!response.ok) {
      const error = (data as { error?: string }).error || "Webhook ingestion failed."
      return NextResponse.json({ error }, { status: response.status })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "Unable to connect to the backend." },
      { status: 502 },
    )
  }
}
