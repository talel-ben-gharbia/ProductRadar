import { NextRequest, NextResponse } from "next/server"

const MAILPIT_API = process.env.MAILPIT_URL ?? "http://localhost:8025"

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email")
    const query = email
      ? `query=to:${encodeURIComponent(email)}&unread=true`
      : "unread=true"
    const res = await fetch(`${MAILPIT_API}/api/v1/search?${query}`, {
      headers: { Accept: "application/json" },
    })
    if (!res.ok) {
      return NextResponse.json({ count: 0 })
    }
    const data = await res.json()
    const count: number = data.messages_count ?? data.total ?? 0
    return NextResponse.json({ count })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
