const PREWARM_TTL = 10800
const PREWARMED_KEY = "__prewarmed"

export async function prewarmCache(): Promise<void> {
  if (typeof window !== "undefined") return
  if (!process.env.REDIS_URL) return
  if ((globalThis as Record<string, unknown>)[PREWARMED_KEY]) return
  ;(globalThis as Record<string, unknown>)[PREWARMED_KEY] = true

  const { cacheGet, cacheSet } = await import("./redis-cache")

  const { BACKEND_URL } = await import("@/utils/admin/constants")

  const backend = BACKEND_URL.replace(/\/+$/, "")

  const endpoints = [
    { url: "/products", key: "products:all" },
    { url: "/sellers", key: "sellers:all" },
    { url: "/categories", key: "categories:all" },
    { url: "/product-listings", key: "listings:pall:sall:p1" },
  ]

  for (const { url, key } of endpoints) {
    try {
      const existing = await cacheGet<unknown>(key)
      if (existing !== null) continue
    } catch {
      continue
    }

    const fullUrl = `${backend}${url}`

    try {
      const response = await fetch(fullUrl, {
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      })
      if (response.ok) {
        const data = await response.json()
        await cacheSet(key, { data, cachedAt: Date.now() }, PREWARM_TTL)
      }
    } catch {
      // Pre-warming failed, first user request will warm it
    }
  }
}
