"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Building2, Loader2, Lock, LogIn, Mail } from "lucide-react"
import { signInWithEmailAndPassword } from "firebase/auth"

import { auth } from "@/lib/firebase"
import { B2BProvider, type B2BSummary } from "@/components/B2B/b2b-context"
import B2BNavbar from "@/components/B2B/b2b-navbar"
import B2BSidebar from "@/components/B2B/b2b-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function B2BLoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password)
      const idToken = await credential.user.getIdToken()

      // Create session via B2C auth endpoint (shared with consumer auth)
      const response = await fetch("/api/b2c/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Authentication failed. Please check your credentials.")
      }

      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed."
      if (msg.includes("auth/invalid-credential") || msg.includes("auth/wrong-password") || msg.includes("auth/user-not-found")) {
        setError("Invalid email or password.")
      } else if (msg.includes("auth/too-many-requests")) {
        setError("Too many attempts. Please wait and try again.")
      } else if (msg.includes("auth/network-request-failed")) {
        setError("Unable to connect to the authentication server. Please check your internet connection.")
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-4">
      <Card className="w-full max-w-md border-border/30 bg-background/95 shadow-2xl backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg">
            <Building2 className="size-8" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">B2B Dashboard</CardTitle>
          <CardDescription>
            Sign in with your B2B account credentials to access the business dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="b2b-email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="b2b-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="business@company.com"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="b2b-password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="b2b-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="pl-10"
                />
              </div>
            </div>

            <button type="button" onClick={() => window.location.href = "/B2B/forgot-password"} className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400">
              Forgot password?
            </button>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="h-11 w-full gap-2 rounded-xl">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
              {loading ? "Signing in..." : "Sign in to Dashboard"}
            </Button>
          </form>

          <div className="mt-6 space-y-2 border-t pt-4 text-center text-sm text-muted-foreground">
            <p>
              Don&apos;t have a B2B account?{" "}
              <Link href="/B2B" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                Apply as Partner
              </Link>
            </p>
            <p>
              <Link href="/" className="hover:text-foreground">
                ← Back to homepage
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
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
  // Show login screen if not authenticated
  if (!firebaseUid) {
    return <B2BLoginScreen />
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
    </B2BProvider>
  )
}
