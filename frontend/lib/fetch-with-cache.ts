const DEFAULT_CACHE_TTL = 300

interface CachedFetchOptions extends RequestInit {
  cacheTtl?: number
  cacheKey?: string
}

async function getCacheOps(): Promise<{
  cacheGet: <T>(key: string) => Promise<T | null>
  cacheSet: (key: string, value: unknown, ttl?: number) => Promise<void>
} | null> {
  if (typeof window !== "undefined") return null
  if (!process.env.REDIS_URL) return null

  try {
    return await import("./redis-cache")
  } catch {
    return null
  }
}

export async function cachedFetch<T>(
  url: string,
  options: CachedFetchOptions = {}
): Promise<T> {
  const { cacheTtl = DEFAULT_CACHE_TTL, cacheKey, ...fetchOptions } = options

  const isGet = !fetchOptions.method || fetchOptions.method === "GET"

  if (isGet && cacheKey) {
    const cache = await getCacheOps()
    if (cache) {
      const cached = await cache.cacheGet<T>(cacheKey)
      if (cached !== null) return cached
    }
  }

  const response = await fetch(url, {
    ...fetchOptions,
    cache: fetchOptions.cache ?? "no-store",
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error || `HTTP ${response.status}`)
  }

  const data = (await response.json()) as T

  if (isGet && cacheKey) {
    const cache = await getCacheOps()
    if (cache) {
      await cache.cacheSet(cacheKey, data, cacheTtl)
    }
  }

  return data
}

export async function invalidateCache(pattern: string): Promise<void> {
  if (typeof window === "undefined") {
    try {
      const cache = await import("./redis-cache")
      await cache.cacheDel(pattern)
    } catch {
      // Graceful fallback
    }
  }
}
