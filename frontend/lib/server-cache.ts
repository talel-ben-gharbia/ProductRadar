import { cache } from "react"

export function withCache<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  if (typeof window !== "undefined") return fn
  return cache(fn) as unknown as T
}
