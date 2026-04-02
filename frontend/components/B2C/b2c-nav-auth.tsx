"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { B2CAuthDialogTrigger } from "@/components/B2C/b2c-auth-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

type B2CProfile = {
  id: number
  email: string
  firebase_uid: string
  type: "customer"
  full_name: string | null
  adress: string | null
}

export function B2CNavAuth() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<B2CProfile | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch("/api/b2c/profile", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { customer?: B2CProfile | null }) => {
        if (!cancelled) {
          setCustomer(data.customer ?? null)
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
        className="rounded-full"
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar>
          <AvatarFallback>{avatarInitial}</AvatarFallback>
        </Avatar>
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-3 w-52 rounded-lg border bg-background p-1 shadow-md">
          <div className="border-b px-3 py-2">
            <p className="truncate text-sm font-medium">{customer.full_name || ""}</p>
            <p className="truncate text-xs text-muted-foreground">{customer.email}</p>
          </div>

          <Link
            href="/B2C/profile"
            onClick={() => setOpen(false)}
            className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            Profile
          </Link>
          <button
            type="button"
            onClick={logout}
            className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
          >
            Logout
          </button>
        </div>
      ) : null}
    </div>
  )
}
