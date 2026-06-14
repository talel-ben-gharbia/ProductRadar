import { NextRequest, NextResponse } from "next/server"
import { getAdminSession, adminHeaders } from "@/lib/admin-api-helper"
import { cachedFetch } from "@/lib/fetch-with-cache"
import { BACKEND_URL } from "@/utils/admin/constants"

type Params = { params: Promise<{ path: string[] }> }

export async function GET(request: NextRequest, params: Params) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const { path } = await params.params
  const suffix = path.length > 0 ? `/${path.map(encodeURIComponent).join("/")}` : ""
  const search = request.nextUrl.search
  const targetUrl = `${BACKEND_URL}/admin/api/scraping-logs${suffix}${search}`
  const cacheKey = `admin:api:scraping-logs${suffix || "/all"}${search || ""}`

  try {
    const data = await cachedFetch<unknown>(targetUrl, {
      cacheKey,
      cacheTtl: 30,
      headers: adminHeaders(session),
    })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "Unable to connect to the backend." },
      { status: 502 },
    )
  }
}
