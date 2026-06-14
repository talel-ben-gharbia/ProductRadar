import { NextRequest } from "next/server"
import { handleAdminGet } from "@/lib/admin-api-helper"

export async function GET(request: NextRequest) {
  return handleAdminGet(request, "/admin/api/scraping-logs", {
    cacheKey: "admin:api:scraping-logs",
    cacheTtl: 30,
  })
}
