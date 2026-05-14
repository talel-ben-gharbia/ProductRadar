import { NextResponse } from "next/server"

import { BACKEND_URL } from "@/utils/admin/constants"

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/b2b/b2c/sponsored-products`, {
      cache: "no-store",
    })
    const body = await res.json()
    if (res.ok) {
      return NextResponse.json(body)
    }
    return NextResponse.json({ error: body?.error ?? "Backend error" }, { status: res.status })
  } catch (err) {
    return NextResponse.json(
      { error: `Backend unavailable: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    )
  }
}
