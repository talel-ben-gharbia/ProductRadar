"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, Home } from "lucide-react"

type PartnerForm = {
  email: string
  password: string
  confirmPassword: string
  accountType: "B2B_COMPANY" | "B2B_MARKET"
  companyName: string
  companyMarket: string
  companyCountry: string
  companyWebsite: string
  notes: string
}

const INITIAL_FORM: PartnerForm = {
  email: "",
  password: "",
  confirmPassword: "",
  accountType: "B2B_COMPANY",
  companyName: "",
  companyMarket: "",
  companyCountry: "",
  companyWebsite: "",
  notes: "",
}

export default function BecomePartnerPage() {
  const router = useRouter()
  const [form, setForm] = useState<PartnerForm>(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [countdown, setCountdown] = useState(5)

  const goHome = useCallback(() => {
    router.push("/")
  }, [router])

  useEffect(() => {
    if (!success) return
    if (countdown <= 0) {
      goHome()
      return
    }
    const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [success, countdown, goHome])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    if (form.password !== form.confirmPassword) {
      setError("Password confirmation does not match.")
      setSubmitting(false)
      return
    }

    try {
      const response = await fetch("/api/b2b/partner-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string }

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit your request.")
      }

      setSuccess(true)
      setForm(INITIAL_FORM)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit your request.")
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-lg items-center justify-center px-4 py-10">
        <Card className="w-full border-emerald-200/50 text-center shadow-sm dark:border-emerald-900/30">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-xl">Thank You for Applying!</CardTitle>
              <CardDescription className="mt-2 max-w-sm text-sm">
                Your partner application has been received. Our admin team will review your company details and
                activate your account shortly. We&apos;ll notify you by email once approved.
              </CardDescription>
            </div>
            <Button onClick={goHome} className="mt-2 gap-2">
              <Home className="size-4" />
              Back to Home
            </Button>
            <p className="text-xs text-muted-foreground">
              Redirecting in {countdown} second{countdown !== 1 ? "s" : ""}...
            </p>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <section id="partner-request" className="mx-auto w-full max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Become a Partner</CardTitle>
            <CardDescription>
              Submit your B2B application. The admin will verify your company website before account activation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Business Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="name@company.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    value={form.password}
                    onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="At least 8 characters"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  value={form.confirmPassword}
                  onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Retype your password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountType">Partner Type</Label>
                <select
                  id="accountType"
                  value={form.accountType}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      accountType: e.target.value as "B2B_COMPANY" | "B2B_MARKET",
                    }))
                  }
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="B2B_COMPANY">B2B Company</option>
                  <option value="B2B_MARKET">B2B Market</option>
                </select>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    required
                    value={form.companyName}
                    onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyMarket">Market / Sector</Label>
                  <Input
                    id="companyMarket"
                    required
                    value={form.companyMarket}
                    onChange={(e) => setForm((prev) => ({ ...prev, companyMarket: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyCountry">Country (2-letter code)</Label>
                  <Input
                    id="companyCountry"
                    required
                    maxLength={2}
                    value={form.companyCountry}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, companyCountry: e.target.value.toUpperCase() }))
                    }
                    placeholder="TN"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyWebsite">Company Website</Label>
                  <Input
                    id="companyWebsite"
                    type="url"
                    required
                    value={form.companyWebsite}
                    onChange={(e) => setForm((prev) => ({ ...prev, companyWebsite: e.target.value }))}
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Tell us about your products or integration needs"
                />
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Partner Request"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
