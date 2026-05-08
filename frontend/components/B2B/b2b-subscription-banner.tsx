"use client"

import { useCallback, useState } from "react"
import { AlertTriangle, CheckCircle2, Clock, Loader2, Shield, Star, Zap } from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import { Button } from "@/components/ui/button"

export default function B2BSubscriptionBanner() {
  const { summary, planType, isGold, isSilver, refresh } = useB2B()
  const sub = summary?.subscription
  const [renewing, setRenewing] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const [renewDone, setRenewDone] = useState(false)
  const [upgradeDone, setUpgradeDone] = useState(false)

  const requestRenewal = useCallback(async () => {
    setRenewing(true)
    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=subscription/renew`, { method: "POST" })
      if (res.ok) {
        setRenewDone(true)
        refresh()
      }
    } catch { /* ignore */ }
    setRenewing(false)
  }, [refresh])

  const requestUpgrade = useCallback(async () => {
    setUpgrading(true)
    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=subscription/upgrade`, { method: "POST" })
      if (res.ok) {
        setUpgradeDone(true)
        refresh()
      }
    } catch { /* ignore */ }
    setUpgrading(false)
  }, [refresh])

  if (!sub || sub.source === "none" || !planType) return null

  const daysRemaining = typeof sub.days_remaining === "number" ? sub.days_remaining : null
  const isExpired = sub.active === false
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 30 && !isExpired
  const isRenewable = daysRemaining !== null && daysRemaining <= 10 && !isExpired && !renewDone
  const endDate = sub.end_date ? new Date(sub.end_date).toLocaleDateString() : null
  const planLabel = isGold ? "Gold" : "Silver"

  if (isExpired) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm dark:border-red-800/40 dark:bg-red-950/20">
        <div className="flex items-center gap-3">
          <AlertTriangle className="size-4 shrink-0 text-red-600 dark:text-red-400" />
          <span className="font-medium text-red-700 dark:text-red-400">
            Your B2B subscription has expired.
          </span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={requestRenewal} disabled={renewing || renewDone} className="h-8 text-xs border-red-300">
            {renewing ? <Loader2 className="size-3 animate-spin" /> : renewDone ? "Requested" : "Request Renewal"}
          </Button>
        </div>
      </div>
    )
  }

  if (isExpiringSoon) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800/40 dark:bg-amber-950/20">
        <div className="flex items-center gap-3">
          <Clock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="text-amber-700 dark:text-amber-400">
            Your <strong>{planLabel} Plan</strong> expires in{" "}
            <strong>{daysRemaining} day{daysRemaining !== 1 ? "s" : ""}</strong>
            {endDate ? ` (${endDate})` : ""}.
          </span>
        </div>
        {isRenewable && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={requestRenewal} disabled={renewing || renewDone} className="h-8 text-xs">
              {renewing ? <Loader2 className="size-3 animate-spin" /> : renewDone ? "Renewal Requested" : "Request Renewal"}
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border px-4 py-3 text-sm ${
        isGold
          ? "border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20"
          : "border-indigo-200 bg-indigo-50 dark:border-indigo-800/40 dark:bg-indigo-950/20"
      }`}
    >
      <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1">
        {isGold ? (
          <Star className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        ) : (
          <Shield className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
        )}
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
      </div>
      {!isGold && !upgradeDone && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={requestUpgrade} disabled={upgrading} className="h-8 text-xs bg-amber-50 hover:bg-amber-100 border-amber-300">
            {upgrading ? <Loader2 className="size-3 animate-spin" /> : "Request Upgrade to Gold"}
          </Button>
        </div>
      )}
      {upgradeDone && (
        <p className="text-xs text-amber-600 dark:text-amber-400">Upgrade request submitted. Awaiting admin approval.</p>
      )}
      {renewDone && (
        <p className="text-xs text-amber-600 dark:text-amber-400">Renewal request submitted. Awaiting admin approval.</p>
      )}
    </div>
  )
}
