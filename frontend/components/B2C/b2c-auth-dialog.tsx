"use client"

import { FormEvent, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Loader2, LogIn, Lock, Mail, User, UserPlus } from "lucide-react"
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth"
import { toast } from "sonner"

import { auth, googleProvider } from "@/lib/firebase"
import { useAuthDialog } from "@/lib/auth-dialog-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type B2CAuthResponse = {
  success: boolean
  customer?: {
    id: number
    email: string
    firebase_uid: string
    type: string
    full_name: string | null
  }
  error?: string
}

type AuthMode = "signin" | "signup"
type PendingAction = "none" | "email" | "google" | "reset"

function getErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code
    return typeof code === "string" ? code : ""
  }

  return ""
}

function isExpectedCancelledError(error: unknown) {
  const code = getErrorCode(error)
  return code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request"
}

function getFriendlyAuthErrorMessage(error: unknown, fallback: string) {
  const code = getErrorCode(error)

  if (code === "auth/email-already-in-use") {
    return "Email already used."
  }

  return error instanceof Error ? error.message : fallback
}

export function B2CAuthDialogTrigger() {
  const router = useRouter()
  const { isOpen, setIsOpen, openAuthDialog } = useAuthDialog()
  const [pendingAction, setPendingAction] = useState<PendingAction>("none")
  const [mode, setMode] = useState<AuthMode>("signin")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const suppressErrorToastRef = useRef(false)

  const isLoading = pendingAction !== "none"
  const isEmailLoading = pendingAction === "email"
  const isGoogleLoading = pendingAction === "google"
  const isResetLoading = pendingAction === "reset"

  const dialogTitle = useMemo(
    () => (mode === "signin" ? "Sign in as customer" : "Create customer account"),
    [mode],
  )

  const dialogDescription = useMemo(
    () =>
      mode === "signin"
        ? "Sign in with email/password or Google."
        : "Sign up with email/password or Google.",
    [mode],
  )

  async function createSessionFromIdToken(idToken: string, fullNameOverride?: string) {
    const response = await fetch("/api/b2c/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, fullName: fullNameOverride ?? null }),
    })

    const data = (await response.json()) as B2CAuthResponse
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Unable to authenticate.")
    }
  }

  async function completeLogin(idToken: string, fullNameOverride?: string) {
    await createSessionFromIdToken(idToken, fullNameOverride)
    toast.success("Welcome !")
    setIsOpen(false)
    router.push("/")
    router.refresh()
    window.location.reload()
  }

  async function handleGoogleAuth() {
    setPendingAction("google")
    suppressErrorToastRef.current = false
    try {
      const popupResult = await signInWithPopup(auth, googleProvider)
      const idToken = await popupResult.user.getIdToken()
      await completeLogin(idToken)
    } catch (error) {
      if (suppressErrorToastRef.current || isExpectedCancelledError(error)) {
        return
      }
      const message = getFriendlyAuthErrorMessage(error, "Unable to sign in with Google.")
      toast.error(message)
    } finally {
      setPendingAction("none")
    }
  }

  async function handleEmailPasswordAuth(event: FormEvent) {
    event.preventDefault()
    setPendingAction("email")
    suppressErrorToastRef.current = false

    try {
      if (!email.trim() || !password) {
        throw new Error("Email and password are required.")
      }

      if (mode === "signup") {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password)
        const normalizedFullName = fullName.trim()

        if (normalizedFullName) {
          await updateProfile(credential.user, { displayName: normalizedFullName })
        }

        const idToken = await credential.user.getIdToken(true)
        await completeLogin(idToken, normalizedFullName || undefined)
      } else {
        const credential = await signInWithEmailAndPassword(auth, email.trim(), password)
        const idToken = await credential.user.getIdToken()
        await completeLogin(idToken)
      }
    } catch (error) {
      if (suppressErrorToastRef.current) {
        return
      }
      const message = getFriendlyAuthErrorMessage(
        error,
        "Unable to sign in with email and password.",
      )
      toast.error(message)
    } finally {
      setPendingAction("none")
    }
  }

  async function handlePasswordReset() {
    if (!email.trim()) {
      toast.error("Please enter your email first.")
      return
    }

    setPendingAction("reset")
    suppressErrorToastRef.current = false

    try {
      await sendPasswordResetEmail(auth, email.trim())
      toast.success("Password reset email sent. Check your inbox.")
    } catch (error) {
      if (suppressErrorToastRef.current) {
        return
      }
      const message = getFriendlyAuthErrorMessage(error, "Unable to send reset email.")
      toast.error(message)
    } finally {
      setPendingAction("none")
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      suppressErrorToastRef.current = true
      setPendingAction("none")
    }
    setIsOpen(nextOpen)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 rounded-full px-4"
        onClick={openAuthDialog}
      >
        Log in
      </Button>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="overflow-hidden rounded-2xl border bg-background p-0 shadow-xl sm:max-w-md">
          <DialogHeader className="border-b px-6 pb-4 pt-6">
            <DialogTitle className="text-lg font-semibold tracking-tight">{dialogTitle}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {dialogDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 pb-6 pt-5">
            <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/40 p-1">
              <Button
                type="button"
                variant={mode === "signin" ? "default" : "ghost"}
                className="rounded-lg"
                onClick={() => setMode("signin")}
                disabled={isLoading}
              >
                <LogIn className="h-4 w-4" />
                Sign in
              </Button>
              <Button
                type="button"
                variant={mode === "signup" ? "default" : "ghost"}
                className="rounded-lg"
                onClick={() => setMode("signup")}
                disabled={isLoading}
              >
                <UserPlus className="h-4 w-4" />
                Sign up
              </Button>
            </div>

            <form onSubmit={handleEmailPasswordAuth} className="space-y-4">
              {mode === "signup" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="b2c-full-name">Full name</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="b2c-full-name"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Your full name"
                      className="pl-10"
                    />
                  </div>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="b2c-email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="b2c-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="b2c-password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="b2c-password"
                    type="password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Your password"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {mode === "signin" ? (
                <div className="space-y-1">
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-sm"
                      disabled={isLoading}
                      onClick={handlePasswordReset}
                    >
                      {isResetLoading ? "Sending reset email..." : "Reset password"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Forgot your password? Enter your email and send a reset link.
                  </p>
                </div>
              ) : null}

              <Button type="submit" disabled={isLoading} className="h-10 w-full rounded-full">
                {isEmailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isEmailLoading
                  ? "Connecting..."
                  : mode === "signup"
                    ? "Create account"
                    : "Sign in"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isLoading}
              className="h-10 w-full rounded-full"
              variant="outline"
            >
              {isGoogleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Image
                  src="/assets/google-logo.svg"
                  alt="Google"
                  width={16}
                  height={16}
                  className="h-4 w-4"
                />
              )}
              {isGoogleLoading ? "Connecting..." : "Continue with Google"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
