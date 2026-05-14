"use client"

import { useCallback, useState } from "react"
import { ArrowUp, Building2, Calendar, Check, Clock, Globe, Loader2, Mail, MapPin, Pencil, RefreshCw, Shield, Star, User, X } from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import B2BSubscriptionBanner from "@/components/B2B/b2b-subscription-banner"
import B2BErrorState from "@/components/B2B/b2b-error-state"
import { QuotaBar, getMonthlyLimit, getCurrentUsage } from "@/components/B2B/b2b-quota-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const OPERATIONS: { key: string; label: string; planKey: "ads" | "scraping" | "reports" | "sponsored" }[] = [
  { key: "ads_requests", label: "Ads Requests", planKey: "ads" },
  { key: "scraping_requests", label: "Scraping Requests", planKey: "scraping" },
  { key: "reports", label: "Reports Generated", planKey: "reports" },
  { key: "sponsored_products", label: "Sponsored Products", planKey: "sponsored" },
]

function RenewButton({ firebaseUid, refresh }: { firebaseUid: string; refresh: () => void }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const handleClick = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=subscription%2Frenew`, { method: "POST" })
      if (res.ok) { setDone(true); refresh() } else { setError("Renewal request failed") }
    } catch { setError("Network error while renewing subscription") }
    setLoading(false)
  }
  if (done) {
    return <Badge className="self-start text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">Renewal Requested</Badge>
  }
  return (
    <div className="flex flex-col gap-1">
      <Button variant="outline" size="sm" onClick={handleClick} disabled={loading} className="gap-1.5 text-xs">
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
        Renew Subscription
      </Button>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  )
}

function UpgradeButton({ firebaseUid, refresh }: { firebaseUid: string; refresh: () => void }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const handleClick = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=subscription%2Fupgrade`, { method: "POST" })
      if (res.ok) { setDone(true); refresh() } else { const data = await res.json(); setError(data.error ?? "Request failed") }
    } catch { setError("Network error") }
    setLoading(false)
  }
  if (done) {
    return <Badge className="self-start text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">Upgrade Requested</Badge>
  }
  return (
    <div className="flex flex-col gap-1">
      <Button variant="default" size="sm" onClick={handleClick} disabled={loading} className="gap-1.5 text-xs bg-amber-600 hover:bg-amber-700">
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowUp className="size-3.5" />}
        Upgrade to Gold
      </Button>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  )
}

export default function SettingsPage() {
  const { summary, mode, planType, isGold, firebaseUid, refresh } = useB2B()
  const user = summary?.user
  const sub = summary?.subscription
  const usageJson = user?.usage_json as Record<string, unknown> | null | undefined

  const planLabel = planType
    ? planType.replace(/^B2B_/i, "").charAt(0).toUpperCase() + planType.replace(/^B2B_/i, "").slice(1).toLowerCase()
    : "None"

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [form, setForm] = useState({
    fullName: (user?.full_name as string) ?? "",
    companyName: (user?.company_name as string) ?? "",
    companyWebsite: (user?.company_website as string) ?? "",
    companyCountry: (user?.company_country as string) ?? "",
    companyMarket: (user?.company_market as string) ?? "",
  })

  const handleSave = useCallback(async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setEditing(false)
        refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setSaveError((data as { error?: string }).error ?? "Failed to save profile")
      }
    } catch { setSaveError("Network error while saving profile") }
    setSaving(false)
  }, [firebaseUid, form, refresh])

  const handleCancel = useCallback(() => {
    setEditing(false)
    setSaveError(null)
    setForm({
      fullName: (user?.full_name as string) ?? "",
      companyName: (user?.company_name as string) ?? "",
      companyWebsite: (user?.company_website as string) ?? "",
      companyCountry: (user?.company_country as string) ?? "",
      companyMarket: (user?.company_market as string) ?? "",
    })
  }, [user])

  const profileFields = [
    { icon: Building2, label: "Company Name", value: user?.company_name, key: "companyName" as const },
    { icon: Mail, label: "Email", value: user?.email, key: null },
    { icon: User, label: "Full Name", value: user?.full_name, key: "fullName" as const },
    { icon: Globe, label: "Website", value: user?.company_website, key: "companyWebsite" as const },
    { icon: MapPin, label: "Country", value: user?.company_country, key: "companyCountry" as const },
    { icon: Star, label: "Market / Sector", value: user?.company_market, key: "companyMarket" as const },
  ]

  return (
    <div className="space-y-6">
      <B2BSubscriptionBanner />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Your company profile, subscription, and workspace configuration.</p>
        </div>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
            <Pencil className="size-3.5" /> Edit
          </Button>
        ) : (
          <div className="flex flex-col items-end gap-1">
            {saveError && <p className="text-xs text-red-500">{saveError}</p>}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving} className="gap-1.5">
                <X className="size-3.5" /> Cancel
              </Button>
              <Button variant="default" size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                Save
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="size-4 text-indigo-500" />Company Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profileFields.map((field) => (
              <div key={field.label} className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                <field.icon className="size-4 shrink-0 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{field.label}</p>
                  {editing && field.key ? (
                    <Input
                      value={form[field.key]}
                      onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className="mt-1 h-8 text-sm"
                      placeholder={field.label}
                    />
                  ) : (
                    <p className="mt-0.5 text-sm font-medium">{String(field.value ?? "—")}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="size-4 text-indigo-500" />Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                <span className="text-sm text-muted-foreground">Plan</span>
                <Badge className={`${isGold ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" : "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300"}`}>
                  {isGold ? "★ " : ""}{planLabel}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={sub?.active ? "default" : "destructive"}>
                  {sub?.active ? "Active" : "Inactive"}
                </Badge>
              </div>
              {sub?.days_remaining != null && (
                <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="size-3" />Days Remaining</span>
                  <span className={`text-sm font-medium ${Number(sub.days_remaining) <= 30 ? "text-amber-600" : ""}`}>{sub.days_remaining} days</span>
                </div>
              )}
              {sub?.duration_months && (
                <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                  <span className="text-sm text-muted-foreground">Duration</span>
                  <span className="text-sm font-medium">{sub.duration_months} months</span>
                </div>
              )}
              {sub?.start_date && (
                <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                  <span className="text-sm text-muted-foreground">Start Date</span>
                  <span className="text-sm font-medium">{new Date(sub.start_date).toLocaleDateString()}</span>
                </div>
              )}
              {sub?.end_date && (
                <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                  <span className="text-sm text-muted-foreground">End Date</span>
                  <span className="text-sm font-medium">{new Date(sub.end_date).toLocaleDateString()}</span>
                </div>
              )}
              {sub?.active === true && firebaseUid && (
                <div className="flex flex-col gap-2 pt-1">
                  <RenewButton firebaseUid={firebaseUid} refresh={refresh} />
                  {!isGold && <UpgradeButton firebaseUid={firebaseUid} refresh={refresh} />}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="size-4 text-indigo-500" />Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                <span className="text-sm text-muted-foreground">Account Type</span>
                <Badge variant="outline">{mode === "market" ? "Market Intelligence" : "Seller Intelligence"}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                <span className="text-sm text-muted-foreground">B2B Status</span>
                <Badge variant={user?.b2b_status === "APPROVED" ? "default" : "outline"}>{user?.b2b_status ?? "—"}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                <span className="text-sm text-muted-foreground">Verified</span>
                <Badge variant={user?.is_verified ? "default" : "destructive"}>{user?.is_verified ? "Yes" : "No"}</Badge>
              </div>
              {user?.seller_id && (
                <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                  <span className="text-sm text-muted-foreground">Linked Seller</span>
                  <span className="text-sm font-mono font-medium">#{user.seller_id}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Calendar className="size-4 text-indigo-500" />Monthly Usage</CardTitle>
              <CardDescription>Your current plan limits and consumption this month.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {OPERATIONS.map((op) => {
                const usage = getCurrentUsage(usageJson, op.key)
                const limit = getMonthlyLimit(planType, op.planKey)
                return <QuotaBar key={op.key} usage={usage} limit={limit} label={op.label} />
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
