import { NextRequest, NextResponse } from "next/server"
import { getAdminSession, adminHeaders, parseBackendResponse } from "@/lib/admin-api-helper"
import { BACKEND_URL } from "@/utils/admin/constants"

const ALLOWED_ACTIONS = ["suspend", "unsuspend", "ban", "unban"]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const session = await getAdminSession()
  if (!session || session.role !== "ROLE_SUPER_ADMIN") {
    return NextResponse.json({ error: "Only super admins can perform this action." }, { status: 403 })
  }

  const { id, action } = await params

  if (!ALLOWED_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 })
  }

  try {
    const response = await fetch(`${BACKEND_URL}/admin/api/admins/${id}/${action}`, {
      method: "POST",
      headers: adminHeaders(session),
    })

    const data = await parseBackendResponse(response)

    if (!response.ok) {
      return NextResponse.json(
        { error: (data as { error?: string }).error || `Failed to ${action} admin.` },
        { status: response.status },
      )
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Unable to connect to the backend." }, { status: 502 })
  }
}
