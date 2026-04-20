"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { auth } from "@/lib/firebase"

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
  const [changingPassword, setChangingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")

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

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault()

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.error("Please fill in all password fields.")
      return
    }

    if (newPassword.length < 6) {
      toast.error("New password must contain at least 6 characters.")
      return
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("New password and confirmation do not match.")
      return
    }

    if (currentPassword === newPassword) {
      toast.error("New password must be different from current password.")
      return
    }

    const currentUser = auth.currentUser
    if (!currentUser || !currentUser.email) {
      toast.error("Please log in again before changing your password.")
      return
    }

    const hasPasswordProvider = currentUser.providerData.some(
      (provider) => provider.providerId === "password",
    )

    if (!hasPasswordProvider) {
      toast.error("This account uses social login. Password change is not available here.")
      return
    }

    setChangingPassword(true)

    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword)
      await reauthenticateWithCredential(currentUser, credential)
      await updatePassword(currentUser, newPassword)

      setCurrentPassword("")
      setNewPassword("")
      setConfirmNewPassword("")
      toast.success("Password changed successfully.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to change password."
      toast.error(message)
    } finally {
      setChangingPassword(false)
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

        <div className="mt-8 border-t pt-6">
          <h3 className="text-base font-semibold">Change password</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your account password securely.
          </p>

          <form onSubmit={handleChangePassword} className="mt-5 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Your current password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="At least 6 characters"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">Confirm new password</Label>
              <Input
                id="confirmNewPassword"
                type="password"
                autoComplete="new-password"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                placeholder="Repeat new password"
              />
            </div>

            <Button type="submit" disabled={changingPassword}>
              {changingPassword ? "Updating..." : "Change password"}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}