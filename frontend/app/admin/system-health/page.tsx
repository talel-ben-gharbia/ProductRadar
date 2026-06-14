import React, { Suspense } from "react"
import { cookies } from "next/headers"

import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-session"
import SystemHealthClient from "@/components/admin/system-health-client"
import { Skeleton } from "@/components/ui/skeleton"

async function SystemHealthPageContent() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session || session.role !== "ROLE_SUPER_ADMIN") {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        Only super admins can view system health.
      </div>
    )
  }

  return <SystemHealthClient />
}

function SystemHealthFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}

export default async function SystemHealthPage() {
  return (
    <section className="w-full max-w-none space-y-4">
      <Suspense fallback={<SystemHealthFallback />}>
        <SystemHealthPageContent />
      </Suspense>
    </section>
  )
}
