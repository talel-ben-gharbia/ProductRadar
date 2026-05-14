import { getMonthlyLimit, getCurrentUsage } from "@/utils/b2b/limits"

export { getMonthlyLimit, getCurrentUsage }

export function QuotaBar({ usage, limit, label }: { usage: number; limit: number; label: string }) {
  const pct = limit > 0 ? Math.min(100, Math.round((usage / limit) * 100)) : 0
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500"
  return (
    <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className={`font-bold ${pct >= 90 ? "text-red-600" : pct >= 70 ? "text-amber-600" : "text-emerald-600"}`}>
          {usage} / {limit} used
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
