"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
} from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  function getAuthErrorMessage(message: string): string {
    if (message.includes("Too many login attempts")) {
      return "Too many login attempts. Please wait 5 minutes and try again."
    }

    if (message.includes("Invalid credentials")) {
      return "Invalid email or password."
    }

    return message
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        const message = getAuthErrorMessage(
          data.error || "Authentication failed."
        )
        toast.error(message)
        return
      }

      toast.success("Signed in successfully.")

      router.push("/admin")
      router.refresh()
    } catch {
      toast.error("Unable to connect to the authentication server.")
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm space-y-4">
        <Card className="overflow-hidden border-border/70 shadow-xl shadow-black/5">
          <CardHeader className="space-y-3 border-b bg-muted/25 p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <Avatar size="lg" className="bg-primary/10 text-primary after:border-primary/10">
                <AvatarFallback className="bg-transparent text-primary">
                  <LockKeyhole className="size-5" />
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <CardTitle className="text-2xl tracking-tight">Sign in</CardTitle>
                <CardDescription className="leading-6">Admin dashboard</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium tracking-wide text-muted-foreground">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@productRadar.com"
                  className="h-9 bg-background text-sm sm:h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium tracking-wide text-muted-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-9 bg-background pr-10 text-sm sm:h-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-10 w-full cursor-pointer"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Signing in&hellip;
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
