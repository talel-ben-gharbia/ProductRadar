"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

export function ProfileInformationPage() {
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
        if (cancelled) {
          return
        }

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
        body: JSON.stringify({ fullName, adress }),
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
      <Card className="rounded-xl border bg-background shadow-sm">
        <CardContent className="py-6 text-sm text-muted-foreground">Loading profile...</CardContent>
      </Card>
    )
  }

  if (!profile) {
    return (
      <Card className="rounded-xl border bg-background shadow-sm">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>You need to login first.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push("/")}>Back to home</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl border bg-background shadow-sm">
      <CardHeader>
        <CardTitle>Informations</CardTitle>
        <CardDescription>Update your customer information here. Email is read-only.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
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

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/B2C/products")}>
              Back
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}