"use client"

import { AlertTriangle, CheckCircle2, Clock, Shield, Star, Zap } from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"

export default function B2BSubscriptionBanner() {
  const { summary, planType, isGold, isSilver } = useB2B()
  const sub = summary?.subscription

  if (!sub || sub.source === "none" || !planType) return null

  const daysRemaining = typeof sub.days_remaining === "number" ? sub.days_remaining : null
  const isExpired = sub.active === false
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 30 && !isExpired
  const endDate = sub.end_date ? new Date(sub.end_date).toLocaleDateString() : null

  // Clean plan label
  const planLabel = isGold ? "Gold" : "Silver"

  if (isExpired) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm dark:border-red-800/40 dark:bg-red-950/20">
        <AlertTriangle className="size-4 shrink-0 text-red-600 dark:text-red-400" />
        <span className="font-medium text-red-700 dark:text-red-400">
          Your B2B subscription has expired. Contact your account manager to renew.
        </span>
      </div>
    )
  }

  if (isExpiringSoon) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800/40 dark:bg-amber-950/20">
        <Clock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="text-amber-700 dark:text-amber-400">
          Your <strong>{planLabel} Plan</strong> expires in{" "}
          <strong>{daysRemaining} day{daysRemaining !== 1 ? "s" : ""}</strong>
          {endDate ? ` (${endDate})` : ""}. Contact your account manager to renew.
        </span>
      </div>
    )
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
        isGold
          ? "border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20"
          : "border-indigo-200 bg-indigo-50 dark:border-indigo-800/40 dark:bg-indigo-950/20"
      }`}
    >
      {isGold ? (
        <Star className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      ) : (
        <Shield className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
      )}
      <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1">
        <span className={`font-semibold ${isGold ? "text-amber-800 dark:text-amber-300" : "text-indigo-800 dark:text-indigo-300"}`}>
          {planLabel} Plan — Active
        </span>
        {daysRemaining !== null && (
          <span className="text-muted-foreground">
            <Clock className="mr-1 inline size-3" />
            {daysRemaining} days remaining
          </span>
        )}
        {endDate && (
          <span className="text-muted-foreground">Expires {endDate}</span>
        )}
        {isGold && (
          <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
            <Zap className="size-3" />
            Full Access
          </span>
        )}
        {!isGold && isSilver && (
          <span className="flex items-center gap-1 text-indigo-700 dark:text-indigo-400">
            <CheckCircle2 className="size-3" />
            Premium features included
          </span>
        )}
      </div>
    </div>
  )
}
