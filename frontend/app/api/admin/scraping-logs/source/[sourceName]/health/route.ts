import { NextRequest, NextResponse } from "next/server"
import { getAdminSession, adminHeaders } from "@/lib/admin-api-helper"
import { cachedFetch } from "@/lib/fetch-with-cache"
import { BACKEND_URL } from "@/utils/admin/constants"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sourceName: string }> }
) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const { sourceName } = await params
  const backendUrl = `${BACKEND_URL}/admin/api/scraping-logs/source/${encodeURIComponent(sourceName)}/health`

  try {
    const data = await cachedFetch<unknown>(backendUrl, {
      cacheKey: `admin:api:scraping-logs:health:${sourceName}`,
      cacheTtl: 30,
      headers: adminHeaders(session),
    })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Unable to connect to the backend." }, { status: 502 })
  }
}
