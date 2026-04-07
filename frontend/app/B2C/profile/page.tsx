"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { B2CNavbar } from "@/components/B2C/b2c-navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type B2CProfile = {
  id: number
  email: string
  firebase_uid: string
  type: "customer"
  full_name: string | null
  adress: string | null
}

export default function B2CProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<B2CProfile | null>(null)
  const [fullName, setFullName] = useState("")
  const [adress, setAdress] = useState("")

  useEffect(() => {
    let cancelled = false

    fetch("/api/b2c/profile", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { customer: B2CProfile | null }) => {
        if (cancelled) return

        setProfile(data.customer)
        setFullName(data.customer?.full_name ?? "")
        setAdress(data.customer?.adress ?? "")
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false)
          setProfile(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)

    try {
      const response = await fetch("/api/b2c/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          adress,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile.")
      }

      const customer = data.customer as B2CProfile
      setProfile(customer)
      setFullName(customer.full_name ?? "")
      setAdress(customer.adress ?? "")
      toast.success("Profile updated successfully.")
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update profile."
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-svh bg-muted/30">
        <B2CNavbar title="My profile" backHref="/B2C/products" backLabel="Back to products" />
        <div className="p-10 text-sm text-muted-foreground">Loading profile...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-svh bg-muted/30">
        <B2CNavbar title="My profile" backHref="/B2C/products" backLabel="Back to products" />
        <div className="p-10">
          <h1 className="text-2xl font-semibold">Profile</h1>
          <p className="mt-2 text-muted-foreground">You need to login first.</p>
          <Button className="mt-6" onClick={() => router.push("/")}>Back to home</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-muted/30">
      <B2CNavbar title="My profile" backHref="/B2C/products" backLabel="Back to products" />
      <div className="mx-auto max-w-xl p-6 sm:p-10">
        <h1 className="text-2xl font-semibold">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You can update your customer information here. Email is read-only.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile.email} readOnly disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Your full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adress">Address</Label>
            <Input
              id="adress"
              value={adress}
              onChange={(event) => setAdress(event.target.value)}
              placeholder="Your address"
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/")}>
              Back
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
