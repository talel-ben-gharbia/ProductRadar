import { NextRequest, NextResponse } from "next/server"

const MAILPIT_URL = process.env.MAILPIT_URL || "http://localhost:8025"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")?.trim()
  const isAdmin = searchParams.get("admin") === "true"

  const targetUrl = new URL(MAILPIT_URL)

  if (!isAdmin && email) {
    targetUrl.pathname = "/search"
    targetUrl.searchParams.set("q", `to:${email}`)
  }

  return NextResponse.redirect(targetUrl.toString(), 302)
}
