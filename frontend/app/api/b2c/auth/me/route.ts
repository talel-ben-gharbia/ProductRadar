import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { COOKIE_NAME, verifyB2CSessionToken } from "@/lib/b2c-session"

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.json({ customer: null }, { status: 200 })
  }

  const session = await verifyB2CSessionToken(token)
  if (!session) {
    const response = NextResponse.json({ customer: null }, { status: 200 })
    response.cookies.delete(COOKIE_NAME)
    return response
  }

  return NextResponse.json({ customer: session }, { status: 200 })
}
