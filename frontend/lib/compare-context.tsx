"use client"

import { usePathname } from "next/navigation"
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

type CompareContextType = {
  comparedIds: number[]
  addToCompare: (id: number) => void
  removeFromCompare: (id: number) => void
  toggleCompare: (id: number) => void
  isInCompare: (id: number) => boolean
  clearCompare: () => void
}

const CompareContext = createContext<CompareContextType | null>(null)

const LS_KEY = "b2c_compare_ids"
const MAX_COMPARE = 3

export function CompareProvider({ children }: { children: ReactNode }) {
  const [comparedIds, setComparedIds] = useState<number[]>([])

  useEffect(() => {
    const saved = (() => {
      try {
        const raw = localStorage.getItem(LS_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.every((n: unknown) => typeof n === "number")) {
          return parsed.slice(0, MAX_COMPARE) as number[]
        }
        return null
      } catch { return null }
    })()
    if (saved) setComparedIds(saved)
  }, [])

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(comparedIds)) } catch {}
  }, [comparedIds])

  const addToCompare = useCallback((id: number) => {
    setComparedIds((prev) => {
      if (prev.includes(id) || prev.length >= MAX_COMPARE) return prev
      return [...prev, id]
    })
  }, [])

  const removeFromCompare = useCallback((id: number) => {
    setComparedIds((prev) => prev.filter((x) => x !== id))
  }, [])

  const toggleCompare = useCallback((id: number) => {
    setComparedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_COMPARE) return prev
      return [...prev, id]
    })
  }, [])

  const isInCompare = useCallback((id: number) => comparedIds.includes(id), [comparedIds])

  const clearCompare = useCallback(() => setComparedIds([]), [])

  const ctxValue = useMemo(() => ({
    comparedIds, addToCompare, removeFromCompare, toggleCompare, isInCompare, clearCompare,
  }), [comparedIds, addToCompare, removeFromCompare, toggleCompare, isInCompare, clearCompare])

  return (
    <CompareContext.Provider value={ctxValue}>
      {children}
      <CompareFloatingBar />
    </CompareContext.Provider>
  )
}

export function useCompare() {
  const ctx = useContext(CompareContext)
  if (!ctx) throw new Error("useCompare must be inside CompareProvider")
  return ctx
}

function CompareFloatingBar() {
  const pathname = usePathname()
  const { comparedIds, removeFromCompare, clearCompare } = useCompare()
  const isB2CRoute = pathname.startsWith("/B2C")
  const [productNames, setProductNames] = useState<Record<number, string>>({})
  const [productImages, setProductImages] = useState<Record<number, string | null>>({})
  const [productPrices, setProductPrices] = useState<Record<number, string>>({})

  useEffect(() => {
    if (comparedIds.length === 0 || !isB2CRoute) {
      setProductNames({})
      setProductImages({})
      setProductPrices({})
      return
    }
    const ids = comparedIds.join(",")
    fetch(`/api/products?ids=${encodeURIComponent(ids)}`)
      .then((r) => r.json())
      .then((data: any[]) => {
        const names: Record<number, string> = {}
        const images: Record<number, string | null> = {}
        for (const p of data) {
          names[p.id] = p.name
          images[p.id] = p.image_url ?? null
        }
        setProductNames(names)
        setProductImages(images)
      })
      .catch(() => {})
    fetch(`/api/product-listings?productIds=${encodeURIComponent(ids)}`)
      .then((r) => r.json())
      .then((listings: any[]) => {
        const prices: Record<number, string> = {}
        for (const id of comparedIds) {
          const best = listings
            .filter((l: any) => l.productId === id && l.is_active !== false && l.availability !== false && l.price !== null && l.price > 0)
            .sort((a: any, b: any) => a.price - b.price)
          const bestPrice = best[0]?.price
          prices[id] = bestPrice !== undefined ? `${Number(bestPrice).toFixed(2)} DT` : "—"
        }
        setProductPrices(prices)
      })
      .catch(() => {})
  }, [comparedIds, isB2CRoute])

  if (!isB2CRoute) return null
  if (comparedIds.length === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white shadow-2xl">
      <div className="mx-auto flex max-w-8xl items-center gap-4 px-4 py-3 sm:px-10">
        <button
          onClick={clearCompare}
          className="shrink-0 rounded-lg border px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50"
        >
          Clear
        </button>

        <div className="flex flex-1 items-center gap-3 overflow-x-auto">
          {comparedIds.map((id) => (
            <div key={id} className="flex shrink-0 items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2">
              {productImages[id] ? (
                <img src={productImages[id]!} alt="" className="h-8 w-8 rounded object-contain" />
              ) : (
                <div className="h-8 w-8 rounded bg-slate-200" />
              )}
              <div className="min-w-0 max-w-[180px]">
                <p className="truncate text-xs font-medium text-slate-800">{productNames[id] ?? "Loading..."}</p>
                <p className="text-xs font-semibold text-orange-600">{productPrices[id] ?? "—"}</p>
              </div>
              <button
                onClick={() => removeFromCompare(id)}
                className="ml-1 shrink-0 rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <a
          href="/B2C/compare"
          className="shrink-0 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          Compare ({comparedIds.length})
        </a>
      </div>
    </div>
  )
}
