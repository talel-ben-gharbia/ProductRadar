const DEFAULT_CACHE_TTL = 3600
const STALE_TTL_FACTOR = 3

interface CachedFetchOptions extends RequestInit {
  cacheTtl?: number
  cacheKey?: string
}

interface CacheEntry<T> {
  data: T
  cachedAt: number
}

// --- In-memory fallback cache (used when Redis is unavailable) ---
const memCache = new Map<string, { data: unknown; expiresAt: number }>()
const MEM_CACHE_MAX = 200
const MEM_CACHE_SWEEP_INTERVAL = 60_000
let lastMemSweep = Date.now()

async function memGet<T>(key: string): Promise<T | null> {
  const entry = memCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    memCache.delete(key)
    return null
  }
  return entry.data as T
}

async function memSet(key: string, data: unknown, ttlSeconds: number = 3600): Promise<void> {
  // Evict oldest entries when at capacity
  if (memCache.size >= MEM_CACHE_MAX && !memCache.has(key)) {
    const now = Date.now()
    if (now - lastMemSweep > MEM_CACHE_SWEEP_INTERVAL) {
      lastMemSweep = now
      for (const [k, v] of memCache) {
        if (now > v.expiresAt) memCache.delete(k)
      }
    }
    // If still full, delete the oldest entry
    if (memCache.size >= MEM_CACHE_MAX) {
      const oldest = memCache.keys().next().value
      if (oldest) memCache.delete(oldest)
    }
  }
  memCache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 })
}

let cachedCacheOps: {
  cacheGet: <T>(key: string) => Promise<T | null>
  cacheSet: (key: string, value: unknown, ttl?: number) => Promise<void>
} | null = null
let cacheOpsResolved = false

async function getCacheOps(): Promise<{
  cacheGet: <T>(key: string) => Promise<T | null>
  cacheSet: (key: string, value: unknown, ttl?: number) => Promise<void>
} | null> {
  if (typeof window !== "undefined") return null
  if (cacheOpsResolved) return cachedCacheOps
  if (!process.env.REDIS_URL) {
    cachedCacheOps = { cacheGet: memGet, cacheSet: memSet }
    cacheOpsResolved = true
    return cachedCacheOps
  }

  try {
    cachedCacheOps = await import("./redis-cache")
  } catch {
    cachedCacheOps = { cacheGet: memGet, cacheSet: memSet }
  }
  cacheOpsResolved = true
  return cachedCacheOps
}

function refreshInBackground(url: string, cacheKey: string, fetchOptions: RequestInit, cacheTtl: number): void {
  Promise.resolve().then(async () => {
    try {
      const response = await fetch(url, { ...fetchOptions, cache: "no-store" })
      if (response.ok) {
        const data = await response.json()
        const cache = await getCacheOps()
        if (cache) {
          const entry: CacheEntry<unknown> = { data, cachedAt: Date.now() }
          await cache.cacheSet(cacheKey, entry, cacheTtl * STALE_TTL_FACTOR)
        }
      }
    } catch {
      // Background refresh failed — next stale request will try again
    }
  })
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
      const entry = await cache.cacheGet<CacheEntry<T> | T>(cacheKey)
      if (entry !== null) {
        if (typeof entry === 'object' && entry !== null && 'data' in entry && 'cachedAt' in entry) {
          const typed = entry as CacheEntry<T>
          const age = Date.now() - typed.cachedAt
          const freshTtl = cacheTtl * 1000

          if (age < freshTtl) {
            return typed.data
          }

          refreshInBackground(url, cacheKey, fetchOptions, cacheTtl)
          return typed.data
        }

        return entry as unknown as T
      }
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
      const entry: CacheEntry<T> = { data, cachedAt: Date.now() }
      await cache.cacheSet(cacheKey, entry, cacheTtl * STALE_TTL_FACTOR)
    }
  }

  return data
}

export async function invalidateCache(pattern: string): Promise<void> {
  if (typeof window === "undefined") {
    // Also clear matching in-memory entries
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1)
      for (const key of memCache.keys()) {
        if (key.startsWith(prefix)) memCache.delete(key)
      }
    } else {
      memCache.delete(pattern)
    }
    try {
      const cache = await getCacheOps()
      if (cache && typeof (cache as any).cacheDel === "function") {
        await (cache as any).cacheDel(pattern)
      }
    } catch {
      // Graceful fallback
    }
  }
}
