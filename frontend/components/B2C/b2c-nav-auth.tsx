"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BellRing, ChevronDown, LogOut, User } from "lucide-react"

import { B2CAuthDialogTrigger } from "@/components/B2C/b2c-auth-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

type B2CProfile = {
  id: number
  email: string
  firebase_uid: string
  type: "customer" | "b2b_company" | "b2b_market"
  full_name: string | null
  address: string | null
}

export function B2CNavAuth() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<B2CProfile | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch("/api/b2c/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { customer?: B2CProfile | null }) => {
        if (!cancelled) {
          const sessionCustomer = data.customer ?? null
          if (sessionCustomer) {
            setCustomer({
              ...sessionCustomer,
              full_name: sessionCustomer.full_name ?? null,
              address: sessionCustomer.address ?? null,
            })
          } else {
            setCustomer(null)
          }
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCustomer(null)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  const avatarInitial = useMemo(() => {
    const name = customer?.full_name?.trim() ?? ""
    return name ? name.charAt(0).toUpperCase() : ""
  }, [customer?.full_name])

  const displayName = useMemo(() => {
    const name = customer?.full_name?.trim()
    return name || "Account"
  }, [customer?.full_name])

  const isB2BSession = customer?.type === "b2b_company" || customer?.type === "b2b_market"

  async function logout() {
    await fetch("/api/b2c/auth/logout", { method: "POST" })
    setOpen(false)
    setCustomer(null)
    router.push("/")
    router.refresh()
  }

  if (loading) {
    return <Button variant="outline" disabled>Loading...</Button>
  }

  if (!customer) {
    return <B2CAuthDialogTrigger />
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label="Open customer menu"
        className="flex h-9 items-center gap-2 rounded-full border border-input bg-background px-1.5 pr-2.5 text-sm shadow-sm transition-colors hover:bg-muted/50"
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar size="sm">
          <AvatarFallback className="bg-muted font-medium text-foreground">
            {avatarInitial || "U"}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-24 truncate text-sm font-medium lg:block">{displayName}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border bg-white shadow-lg">
          <div className="border-b px-3 py-3">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{customer.email}</p>
          </div>

          <Link
            href="/B2C/profile"
            onClick={() => setOpen(false)}
            className="mx-1 mt-1 flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-muted/60"
          >
            <User className="h-4 w-4" />
            <span>Profile</span>
          </Link>
          <Link
            href="/B2C/profile/alerts"
            onClick={() => setOpen(false)}
            className="mx-1 flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-muted/60"
          >
            <BellRing className="h-4 w-4" />
            <span>My alerts</span>
          </Link>
          {isB2BSession ? (
            <Link
              href="/B2B/dashboard"
              onClick={() => setOpen(false)}
              className="mx-1 flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-muted/60"
            >
              <User className="h-4 w-4" />
              <span>B2B dashboard</span>
            </Link>
          ) : null}
          <button
            type="button"
            onClick={logout}
            className="mx-1 mb-1 flex w-[calc(100%-0.5rem)] items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}
