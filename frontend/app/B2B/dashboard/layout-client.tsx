"use client"

import dynamic from "next/dynamic"
import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { B2BProvider, type B2BSummary } from "@/components/B2B/b2b-context"
import { SidebarProvider } from "@/components/ui/sidebar"

const B2BNavbar = dynamic(() => import("@/components/B2B/b2b-navbar"), { ssr: false })
const B2BSidebar = dynamic(() => import("@/components/B2B/b2b-sidebar"), {
  ssr: false,
  loading: () => <div className="w-64 shrink-0" />,
})

function B2BLoginRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace("/") }, [router])
  return null
}

export default function B2BDashboardLayoutClient({
  children,
  summary,
  firebaseUid,
}: {
  children: ReactNode
  summary: B2BSummary | null
  firebaseUid: string | null
}) {
  // Redirect to homepage if not authenticated
  if (!firebaseUid) {
    return <B2BLoginRedirect />
  }

  return (
    <B2BProvider initialSummary={summary} firebaseUid={firebaseUid}>
      <SidebarProvider>
        <div className="flex min-h-svh w-full bg-white text-slate-900 selection:bg-blue-500/20">
          <B2BSidebar />            <div className="min-w-0 flex-1 flex flex-col relative z-0 overflow-x-hidden shadow-[-10px_0_30px_rgba(0,0,0,0.03)]">
            <B2BNavbar />
            <main className="relative flex-1 w-full overflow-y-auto overflow-x-hidden bg-slate-50/40">
              <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both">
                {children}
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </B2BProvider>
  )
}
