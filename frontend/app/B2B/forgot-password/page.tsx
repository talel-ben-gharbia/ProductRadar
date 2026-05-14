"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Building2, Loader2, Mail, Send } from "lucide-react"
import { sendPasswordResetEmail } from "firebase/auth"

import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSent(false)

    try {
      await sendPasswordResetEmail(auth, email.trim())
      setSent(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ""
      if (msg.includes("auth/user-not-found")) {
        setError("No account found with this email address.")
      } else if (msg.includes("auth/invalid-email")) {
        setError("Invalid email address.")
      } else if (msg.includes("auth/too-many-requests")) {
        setError("Too many attempts. Please wait and try again.")
      } else if (msg.includes("auth/network-request-failed")) {
        setError("Unable to connect. Please check your internet connection.")
      } else {
        setError("Failed to send reset email. Please try again.")
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
          <CardTitle className="text-2xl font-bold tracking-tight">Reset Password</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-6 dark:border-emerald-800 dark:bg-emerald-950/30">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Reset link sent!
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Check your email inbox for the password reset link.
                </p>
              </div>
              <Button variant="outline" asChild className="w-full">
                <Link href="/B2B/dashboard">
                  <ArrowLeft className="mr-2 size-4" />
                  Back to sign in
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reset-email"
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

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loading} className="h-11 w-full gap-2 rounded-xl">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {loading ? "Sending reset link..." : "Send Reset Link"}
              </Button>

              <div className="text-center">
                <Link href="/B2B/dashboard" className="text-xs text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                  <ArrowLeft className="mr-1 inline size-3" />
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
