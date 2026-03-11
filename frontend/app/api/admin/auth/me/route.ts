import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-session"

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 },
    )
  }

  const session = await verifySessionToken(token)

  if (!session) {
    const response = NextResponse.json(
      { error: "Session expired." },
      { status: 401 },
    )
    response.cookies.set({
      name: COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    })
    return response
  }

  return NextResponse.json({
    admin: {
      id: session.id,
      email: session.email,
      role: session.role,
    },
  })
}
