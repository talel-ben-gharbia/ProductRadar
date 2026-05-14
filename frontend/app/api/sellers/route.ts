import { NextResponse } from "next/server"

import { cachedFetch } from "@/lib/fetch-with-cache"
import { BACKEND_URL } from "@/utils/admin/constants"

export async function GET() {
  try {
    const data = await cachedFetch<unknown>(`${BACKEND_URL}/sellers`, {
      cacheKey: "sellers:all",
      cacheTtl: 300,
    })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { message: "Unable to load sellers from backend. Failed to fetch" },
      { status: 502 }
    )
  }
}
