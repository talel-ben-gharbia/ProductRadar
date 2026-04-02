"use client"

import { FormEvent, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth"
import { toast } from "sonner"

import { auth, googleProvider } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
type PendingAction = "none" | "email" | "google"

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
  const [open, setOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction>("none")
  const [mode, setMode] = useState<AuthMode>("signin")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const suppressErrorToastRef = useRef(false)

  const isLoading = pendingAction !== "none"
  const isEmailLoading = pendingAction === "email"
  const isGoogleLoading = pendingAction === "google"

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
    setOpen(false)
    router.push("/")
    router.refresh()
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

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      suppressErrorToastRef.current = true
      setPendingAction("none")
    }
    setOpen(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Login</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={mode === "signin" ? "default" : "outline"}
            onClick={() => setMode("signin")}
            disabled={isLoading}
          >
            Sign in
          </Button>
          <Button
            type="button"
            variant={mode === "signup" ? "default" : "outline"}
            onClick={() => setMode("signup")}
            disabled={isLoading}
          >
            Sign up
          </Button>
        </div>

        <form onSubmit={handleEmailPasswordAuth} className="space-y-3">
          {mode === "signup" ? (
            <div className="space-y-1.5">
              <Label htmlFor="b2c-full-name">Full name</Label>
              <Input
                id="b2c-full-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your full name"
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="b2c-email">Email</Label>
            <Input
              id="b2c-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="b2c-password">Password</Label>
            <Input
              id="b2c-password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              required
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isEmailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isEmailLoading
              ? "Connecting..."
              : mode === "signup"
                ? "Sign up with email"
                : "Sign in with email"}
          </Button>
        </form>

        <Button
          type="button"
          onClick={handleGoogleAuth}
          disabled={isLoading}
          className="w-full"
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
      </DialogContent>
    </Dialog>
  )
}
