export function getMonthlyLimit(planType: string | null, type: "ads" | "scraping" | "reports" | "sponsored"): number {
  const isGold = planType != null && planType.toUpperCase().includes("GOLD")
  const isSilver = planType != null && planType.toUpperCase().includes("SILVER")
  if (isGold) {
    if (type === "ads") return 50
    if (type === "sponsored") return 20
    if (type === "scraping") return 200
    if (type === "reports") return 20
  }
  if (isSilver) {
    if (type === "ads") return 20
    if (type === "sponsored") return 5
    if (type === "scraping") return 50
    if (type === "reports") return 5
  }
  if (type === "ads") return 5
  if (type === "sponsored") return 2
  if (type === "scraping") return 10
  return 2
}

export function getCurrentUsage(usageJson: Record<string, unknown> | null | undefined, type: string): number {
  if (!usageJson) return 0
  const currentMonth = new Date().toISOString().slice(0, 7)
  const monthData = usageJson[currentMonth] as Record<string, unknown> | undefined
  if (!monthData) return 0
  return typeof monthData[type] === "number" ? monthData[type] : 0
}
