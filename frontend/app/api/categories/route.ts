import { NextResponse } from "next/server"

import { BACKEND_URL } from "@/utils/admin/constants"

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/categories`, {
      cache: "no-store",
    })

    if (!response.ok) {
      return NextResponse.json(
        { message: `Failed to fetch categories: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { message: "Unable to load categories from backend. Failed to fetch" },
      { status: 502 }
    )
  }
}
