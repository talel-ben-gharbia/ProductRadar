const NAMESPACE = "frontend:"
const DEFAULT_TTL = 300

let client: unknown = null
let clientPromise: Promise<unknown> | null = null

function getRedisUrl(): string | null {
  if (typeof window !== "undefined") return null
  return process.env.REDIS_URL ?? null
}

async function getClient(): Promise<unknown> {
  if (typeof window !== "undefined") return null
  if (!getRedisUrl()) return null

  if (client) return client

  if (!clientPromise) {
    clientPromise = (async () => {
      try {
        const { default: Redis } = await import("ioredis")
        const redis = new Redis(getRedisUrl()!, {
          maxRetriesPerRequest: 1,
          retryStrategy(times: number) {
            if (times > 3) return null
            return Math.min(times * 100, 1000)
          },
          lazyConnect: true,
        })
        redis.on("error", () => {})
        await redis.connect()
        client = redis
        return redis
      } catch {
        return null
      }
    })()
  }

  return clientPromise
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = await getClient()
    if (!redis) return null

    const value = await (redis as { get(k: string): Promise<string | null> }).get(`${NAMESPACE}${key}`)
    if (value === null) return null

    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttl: number = DEFAULT_TTL
): Promise<void> {
  try {
    const redis = await getClient()
    if (!redis) return

    await (redis as { set(k: string, v: string, ex: string, ttl: number): Promise<unknown> }).set(
      `${NAMESPACE}${key}`,
      JSON.stringify(value),
      "EX",
      ttl,
    )
  } catch {
    // Graceful fallback
  }
}

export async function cacheDel(pattern: string): Promise<void> {
  try {
    const redis = await getClient()
    if (!redis) return

    const scanStream = (redis as { scanStream(o: { match: string; count: number }): AsyncIterable<string[]> }).scanStream({
      match: `${NAMESPACE}${pattern}`,
      count: 100,
    })

    for await (const keys of scanStream) {
      if (keys.length > 0) {
        await (redis as { del(...keys: string[]): Promise<number> }).del(...keys)
      }
    }
  } catch {
    // Graceful fallback
  }
}

export async function cacheFlush(): Promise<void> {
  await cacheDel("*")
}
