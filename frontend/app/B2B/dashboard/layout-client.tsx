"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { B2BProvider, type B2BSummary } from "@/components/B2B/b2b-context"
import B2BNavbar from "@/components/B2B/b2b-navbar"
import B2BSidebar from "@/components/B2B/b2b-sidebar"
import B2BAIAssistant from "@/components/B2B/b2b-ai-assistant"
import { SidebarProvider } from "@/components/ui/sidebar"

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
        <div className="flex min-h-svh w-full bg-[#f4f7f9] dark:bg-[#020617] text-slate-900 dark:text-slate-100 selection:bg-indigo-500/30">
          <B2BSidebar />
          <div className="min-w-0 flex-1 flex flex-col relative z-0 overflow-hidden shadow-[-10px_0_30px_rgba(0,0,0,0.05)] dark:shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
            <B2BNavbar />
            <main className="relative flex-1 w-full overflow-y-auto overflow-x-hidden bg-transparent">
              {/* Animated Premium Background Mesh */}
              <div className="pointer-events-none fixed inset-0 z-[-1] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] dark:opacity-[0.06] mix-blend-overlay"></div>
              <div className="pointer-events-none fixed -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-indigo-500/10 blur-[150px] dark:bg-indigo-500/15 animate-pulse-slow" />
              <div className="pointer-events-none fixed top-[40%] -left-[10%] h-[600px] w-[600px] rounded-full bg-violet-500/10 blur-[150px] dark:bg-violet-600/15" />
              <div className="pointer-events-none fixed -bottom-[20%] right-[20%] h-[700px] w-[700px] rounded-full bg-blue-500/5 blur-[150px] dark:bg-blue-500/10" />
              
              <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both">
                {children}
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
      <B2BAIAssistant />
    </B2BProvider>
  )
}
