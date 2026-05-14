import { NextResponse } from "next/server"

import { BACKEND_URL } from "@/utils/admin/constants"

export async function GET(request: Request) {
  const firebaseUid = request.headers.get("X-Firebase-Uid")
  if (!firebaseUid) {
    return NextResponse.json({ error: "X-Firebase-Uid header is required" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const params = new URLSearchParams()
  searchParams.forEach((value, key) => params.set(key, value))

  const backendUrl = `${BACKEND_URL}/api/b2b/sponsored/products${params.toString() ? "?" + params.toString() : ""}`

  try {
    const response = await fetch(backendUrl, {
      headers: { "X-Firebase-Uid": firebaseUid },
      cache: "no-store",
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
