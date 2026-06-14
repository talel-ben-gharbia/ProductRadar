import { getAdminSession, adminHeaders } from "@/lib/admin-api-helper"
import { cachedFetch } from "@/lib/fetch-with-cache"
import { NextResponse } from "next/server"
import { BACKEND_URL } from "@/utils/admin/constants"

export async function GET() {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const data = await cachedFetch<unknown>(`${BACKEND_URL}/admin/api/reviews/analytics`, {
      cacheKey: "admin:api:reviews:analytics",
      cacheTtl: 30,
      headers: adminHeaders(session),
    })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Unable to connect to the backend." }, { status: 502 })
  }
}
