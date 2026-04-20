import type { ReactNode } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { ProfileShell } from "@/components/B2C/profile/profile-shell"
import { COOKIE_NAME, verifyB2CSessionToken } from "@/lib/b2c-session"

export default async function ProfileLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) {
    redirect("/B2C/products")
  }

  const session = await verifyB2CSessionToken(token)
  if (!session) {
    redirect("/B2C/products")
  }

  return <ProfileShell>{children}</ProfileShell>
}