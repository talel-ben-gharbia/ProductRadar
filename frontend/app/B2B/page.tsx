"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

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
  const [form, setForm] = useState<PartnerForm>(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

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

      setSuccess(data.message || "Request submitted. Our team will contact you after verification.")
      setForm(INITIAL_FORM)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit your request.")
    } finally {
      setSubmitting(false)
    }
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
              {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

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
