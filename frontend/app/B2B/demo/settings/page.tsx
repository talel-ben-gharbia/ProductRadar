"use client"

import { Building2, Calendar, Clock, Globe, Mail, MapPin, Shield, Star, User } from "lucide-react"

import { useDemo } from "../layout-client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DemoSettingsPage() {
  const { summary, mode, planType, isGold } = useDemo()
  const user = summary.user
  const sub = summary.subscription
  const usage = user?.usage_json as Record<string, any> | undefined

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Your company profile, subscription, and workspace configuration.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="size-4 text-indigo-500" />Company Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { icon: Building2, label: "Company Name", value: user?.company_name },
              { icon: Mail, label: "Email", value: user?.email },
              { icon: User, label: "Full Name", value: user?.full_name },
              { icon: Globe, label: "Website", value: user?.company_website },
              { icon: MapPin, label: "Country", value: user?.company_country },
              { icon: Star, label: "Market / Sector", value: user?.company_market },
            ].map((field) => (
              <div key={field.label} className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                <field.icon className="size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{field.label}</p>
                  <p className="mt-0.5 text-sm font-medium">{String(field.value ?? "—")}</p>
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
                  {isGold ? "★ " : ""}{planType}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="default">Active</Badge>
              </div>
              {sub?.days_remaining != null && (
                <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="size-3" />Days Remaining</span>
                  <span className="text-sm font-medium">{sub.days_remaining} days</span>
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
                <Badge variant="default">APPROVED</Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                <span className="text-sm text-muted-foreground">Verified</span>
                <Badge variant="default">Yes</Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                <span className="text-sm text-muted-foreground">Linked Seller</span>
                <span className="text-sm font-mono font-medium">#{user?.seller_id ?? "-"}</span>
              </div>
            </CardContent>
          </Card>

          {usage && Object.keys(usage).length > 0 && (
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar className="size-4 text-indigo-500" />Monthly Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(usage).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                    <span className="text-sm text-muted-foreground">{key.replace(/_/g, " ")}</span>
                    <span className="text-sm font-mono font-medium">{String(val)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
