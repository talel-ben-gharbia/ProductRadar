import { NextRequest } from "next/server"
import { handleAdminGet } from "@/lib/admin-api-helper"

export async function GET(request: NextRequest) {
  return handleAdminGet(request, "/admin/api/users", {
    cacheKey: "admin:api:users",
    cacheTtl: 30,
  })
}
