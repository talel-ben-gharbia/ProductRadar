"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, Globe, Loader2, Mail, MapPin, Store, User } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const COUNTRY_OPTIONS = [
  { code: "AE", name: "United Arab Emirates" },
  { code: "BH", name: "Bahrain" },
  { code: "DZ", name: "Algeria" },
  { code: "EG", name: "Egypt" },
  { code: "FR", name: "France" },
  { code: "GB", name: "United Kingdom" },
  { code: "IQ", name: "Iraq" },
  { code: "JO", name: "Jordan" },
  { code: "KW", name: "Kuwait" },
  { code: "LB", name: "Lebanon" },
  { code: "LY", name: "Libya" },
  { code: "MA", name: "Morocco" },
  { code: "OM", name: "Oman" },
  { code: "QA", name: "Qatar" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "TN", name: "Tunisia" },
  { code: "US", name: "United States" },
  { code: "YE", name: "Yemen" },
]

export default function B2BPartnerSignup() {
  const router = useRouter()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [accountType, setAccountType] = useState<"B2B_COMPANY" | "B2B_MARKET" | "">("")
  const [companyName, setCompanyName] = useState("")
  const [companyMarket, setCompanyMarket] = useState("")
  const [companyCountry, setCompanyCountry] = useState("")
  const [companyWebsite, setCompanyWebsite] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!accountType) { toast.error("Select an account type."); return }
    if (password.length < 8) { toast.error("Password must be at least 8 characters."); return }
    if (password !== confirmPassword) { toast.error("Password confirmation does not match."); return }
    if (companyCountry.length !== 2) { toast.error("Please select a country."); return }

    setLoading(true)
    try {
      const response = await fetch("/api/b2b/partner-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim() || undefined,
          email: email.trim(),
          password,
          confirmPassword,
          accountType,
          companyName: companyName.trim(),
          companyMarket: companyMarket.trim(),
          companyCountry,
          companyWebsite: companyWebsite.trim(),
          notes: notes.trim() || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) { toast.error(data.error || "Failed to submit."); return }
      toast.success("Partner request submitted! We will review it shortly.")
      router.push("/")
    } catch {
      toast.error("Unable to connect. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Become a Partner</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choose your account type and fill in your details.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setAccountType("B2B_COMPANY")}
              className={`flex flex-1 items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                accountType === "B2B_COMPANY"
                  ? "border-indigo-500 bg-indigo-50 shadow-sm"
                  : "border-border hover:border-muted-foreground/30 bg-card"
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                <Building2 className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">Company</p>
                <p className="text-xs text-muted-foreground">Brands &amp; distributors</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setAccountType("B2B_MARKET")}
              className={`flex flex-1 items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                accountType === "B2B_MARKET"
                  ? "border-indigo-500 bg-indigo-50 shadow-sm"
                  : "border-border hover:border-muted-foreground/30 bg-card"
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                <Store className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">Market</p>
                <p className="text-xs text-muted-foreground">Retailers &amp; platforms</p>
              </div>
            </button>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="space-y-3">
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className="pl-9 h-9 text-sm" />
              </div>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email *" className="pl-9 h-9 text-sm" required />
              </div>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                  </span>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password *" className="pl-9 h-9 text-sm" required minLength={8} />
                </div>
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                  </span>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password *" className="pl-9 h-9 text-sm" required />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Name *" className="pl-9 h-9 text-sm" required />
                </div>
                <div className="relative flex-1">
                  <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={companyMarket} onChange={(e) => setCompanyMarket(e.target.value)} placeholder="Sector *" className="pl-9 h-9 text-sm" required />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Select value={companyCountry} onValueChange={setCompanyCountry}>
                    <SelectTrigger className="h-9 w-full pl-9 text-sm">
                      <SelectValue placeholder="Country *" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_OPTIONS.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>
                  </span>
                  <Input type="url" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} placeholder="Website *" className="pl-9 h-9 text-sm" required />
                </div>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="flex min-h-[60px] w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="h-10 w-full rounded-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Submitting..." : "Submit partner request"}
          </Button>
        </form>
      </div>
    </div>
  )
}
