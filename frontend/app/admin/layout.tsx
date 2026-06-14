import { cookies } from "next/headers"
import type { ReactNode } from "react"

import { COOKIE_NAME, verifySessionToken } from "@/lib/admin-session"
import AdminLayoutClient from "./admin-layout-client"

type AdminLayoutProps = {
  children: ReactNode
}

async function AdminLayout({ children }: AdminLayoutProps) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  const session = token ? await verifySessionToken(token) : null

  const initialAdmin = session
    ? { id: session.id, email: session.email, role: session.role }
    : null

  return <AdminLayoutClient initialAdmin={initialAdmin}>{children}</AdminLayoutClient>
}

export default AdminLayout
