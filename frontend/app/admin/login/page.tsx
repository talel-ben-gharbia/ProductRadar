"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, Radar, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Authentication failed.")
        return
      }

      router.push("/admin")
      router.refresh()
    } catch {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-svh w-full">
      {/* Left decorative panel */}
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex lg:w-[480px] xl:w-[560px]">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary-foreground/15">
            <Radar className="size-6" />
          </div>
          <span className="text-lg font-bold tracking-tight">Product Radar</span>
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-bold leading-tight">
            Administration<br />
            Control Center
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-primary-foreground/70">
            Access the internal back office to manage products, categories, and
            platform operations. This area is restricted to authorized
            administrators only.
          </p>
        </div>

        <p className="text-xs text-primary-foreground/40">
          &copy; {new Date().getFullYear()} Product Radar &mdash; Internal Use Only
        </p>
      </div>

      {/* Right login form */}
      <div className="flex flex-1 items-center justify-center bg-muted/30 px-4 py-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary">
              <Radar className="size-6 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">Product Radar</span>
          </div>

          <Card className="border-0 shadow-xl lg:border lg:shadow-lg">
            <CardHeader className="space-y-1 pb-4 text-center">
              <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck className="size-7 text-primary" />
              </div>
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>
                Enter your credentials to access the admin dashboard
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
                    <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive/15">
                      <span className="text-xs font-bold text-destructive">!</span>
                    </div>
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@productRadar.com"
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="h-10 pr-10"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-10 w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Signing in&hellip;
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Protected by end-to-end encryption &middot; Authorized access only
          </p>
        </div>
      </div>
    </div>
  )
}
