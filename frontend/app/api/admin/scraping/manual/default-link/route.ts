import { NextRequest } from "next/server"
import { handleAdminGet } from "@/lib/admin-api-helper"

export async function GET(request: NextRequest) {
  return handleAdminGet(request, "/admin/api/scraping/manual/default-link", {
    cacheKey: "admin:api:scraping:manual:default-link",
    cacheTtl: 30,
  })
}
