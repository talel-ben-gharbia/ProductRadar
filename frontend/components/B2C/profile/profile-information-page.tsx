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
import { useI18n } from "@/lib/i18n-context"

type B2CProfile = {
  id: number
  email: string
  firebase_uid: string
  type: "customer"
  full_name: string | null
  address: string | null
}

export function ProfileInformationPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<B2CProfile | null>(null)
  const [fullName, setFullName] = useState("")
  const [address, setAddress] = useState("")
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
        setAddress(data.customer?.address ?? "")
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
        body: JSON.stringify({ fullName, address }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t("profile.info_update_failed"))
      }

      const customer = data.customer as B2CProfile
      setProfile(customer)
      setFullName(customer.full_name ?? "")
      setAddress(customer.address ?? "")
      toast.success(t("profile.info_update_success"))
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : t("profile.info_update_failed")
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
      toast.success(t("profile.info_password_changed"))
    } catch (error) {
      const message = error instanceof Error ? error.message : t("profile.info_password_failed")
      toast.error(message)
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <Card className="rounded-xl border bg-background shadow-sm">
        <CardContent className="py-6 text-sm text-muted-foreground">{t("profile.info_loading")}</CardContent>
      </Card>
    )
  }

  if (!profile) {
    return (
      <Card className="rounded-xl border bg-background shadow-sm">
        <CardHeader>
          <CardTitle>{t("profile.info_title")}</CardTitle>
          <CardDescription>{t("profile.info_login_first")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push("/")}>{t("profile.info_back_home")}</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl border bg-background shadow-sm">
      <CardHeader>
        <CardTitle>{t("profile.info_title")}</CardTitle>
        <CardDescription>{t("profile.info_desc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">{t("profile.info_email")}</Label>
            <Input id="email" value={profile.email} readOnly disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">{t("profile.info_full_name")}</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder={t("profile.info_name_placeholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{t("profile.info_address")}</Label>
            <Input
              id="address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder={t("profile.info_address_placeholder")}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? t("profile.info_saving") : t("profile.info_save")}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/B2C/products")}>
              {t("profile.info_back")}
            </Button>
          </div>
        </form>

        <div className="mt-8 border-t pt-6">
          <h3 className="text-base font-semibold">{t("profile.info_change_password")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("profile.info_password_desc")}
          </p>

          <form onSubmit={handleChangePassword} className="mt-5 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t("profile.info_current_password")}</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder={t("profile.info_current_pw_placeholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">{t("profile.info_new_password")}</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder={t("profile.info_new_pw_placeholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">{t("profile.info_confirm_password")}</Label>
              <Input
                id="confirmNewPassword"
                type="password"
                autoComplete="new-password"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                placeholder={t("profile.info_confirm_pw_placeholder")}
              />
            </div>

            <Button type="submit" disabled={changingPassword}>
              {changingPassword ? t("profile.info_updating") : t("profile.info_change_pw_btn")}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
