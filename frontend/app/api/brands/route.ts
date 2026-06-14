import { NextResponse } from "next/server"
import { BACKEND_URL } from "@/utils/admin/constants"

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/brands`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return NextResponse.json([])
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json([])
  }
}
