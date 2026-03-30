import { NextResponse } from "next/server"

import { COOKIE_NAME } from "@/lib/admin-session"

export async function POST() {
  const response = NextResponse.json({ success: true })

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
