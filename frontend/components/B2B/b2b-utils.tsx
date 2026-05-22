"use client"

import React from "react"

// ---------------------------------------------------------------------------
// normalizeBreakdown
// ---------------------------------------------------------------------------
export function normalizeBreakdown(
  b: Record<string, unknown> | null | undefined
): Record<string, Record<string, unknown>> | null {
  if (b?.components) return b.components as Record<string, Record<string, unknown>>
  const h = (b?.history ?? {}) as Record<string, unknown>
  const l = (b?.listing ?? {}) as Record<string, unknown>
  if (
    typeof h.price_stability !== "number" &&
    typeof l.freshness !== "number" &&
    typeof l.seller_score !== "number"
  )
    return null
  const comps: Record<string, Record<string, unknown>> = {}
  if (typeof h.price_stability === "number")
    comps.price_stability = { score: Math.round(h.price_stability * 100) }
  if (typeof h.stock_reliability === "number")
    comps.stock_consistency = { score: Math.round(h.stock_reliability * 100) }
  if (typeof h.anomaly_reliability === "number")
    comps.anomaly_penalty = { score: Math.round(h.anomaly_reliability * 100) }
  if (typeof l.freshness === "number")
    comps.data_freshness = { score: Math.round(l.freshness * 100) }
  if (typeof l.seller_score === "number")
    comps.seller_reliability = { score: Math.round(l.seller_score * 100) }
  return Object.keys(comps).length > 0 ? comps : null
}

// ---------------------------------------------------------------------------
// TrustBreakdown
// ---------------------------------------------------------------------------
const TRUST_LABELS: Record<string, string> = {
  price_stability: "Price Stability",
  seller_reliability: "Seller Reliability",
  stock_consistency: "Stock Consistency",
  data_freshness: "Data Freshness",
  anomaly_penalty: "Anomaly Penalty",
}

export function TrustBreakdown({
  breakdown,
}: {
  breakdown: Record<string, unknown> | null | undefined
}) {
  const comps = normalizeBreakdown(breakdown)
  if (!comps)
    return <span className="text-xs text-muted-foreground">No data</span>

  return (
    <div className="space-y-1.5">
      {Object.entries(comps).map(([key, val]) => {
        const score = typeof val?.score === "number" ? val.score : 0
        const pct = Math.min(100, Math.max(0, score))
        const color =
          pct >= 80
            ? "bg-emerald-500"
            : pct >= 50
              ? "bg-amber-500"
              : "bg-red-500"
        return (
          <div
            key={key}
            className="grid grid-cols-[130px_1fr_36px] items-center gap-2 text-xs"
          >
            <span className="truncate text-right font-medium text-muted-foreground">
              {TRUST_LABELS[key] ?? key}
            </span>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${color}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-mono text-right text-xs font-bold">
              {pct.toFixed(0)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ordinalSuffix
// ---------------------------------------------------------------------------
export function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return s[(v - 20) % 10] ?? s[v] ?? s[0]
}

// ---------------------------------------------------------------------------
// timeAgo
// ---------------------------------------------------------------------------
export function timeAgo(dateStr: string | undefined | null): string {
  if (!dateStr) return ""
  const now = Date.now()
  const diff = now - new Date(dateStr).getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return new Date(dateStr).toLocaleDateString()
}

// ---------------------------------------------------------------------------
// normalizeSpecs — re-exported from shared utility
// ---------------------------------------------------------------------------
export { normalizeSpecs, SPEC_KEY_MAP } from "@/utils/specs"

// ---------------------------------------------------------------------------
// RankBadge
// ---------------------------------------------------------------------------
export function RankBadge({
  rank,
  total,
}: {
  rank?: unknown
  total?: unknown
}) {
  const r = typeof rank === "number" ? rank : null
  const t = typeof total === "number" ? total : null
  if (r === null || t === null || t === 0)
    return <span className="text-xs text-muted-foreground">&mdash;</span>

  const color =
    r === 1
      ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400"
      : r === t
        ? "text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400"
        : "text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400"

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${color}`}
    >
      {r}
      {ordinalSuffix(r)} / {t}
    </span>
  )
}
