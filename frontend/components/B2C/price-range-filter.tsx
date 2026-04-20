"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"

type PriceRangeFilterProps = {
  minBound: number
  maxBound: number
  initialMin: number
  initialMax: number
  baseParams: Record<string, string>
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function PriceRangeFilter({
  minBound,
  maxBound,
  initialMin,
  initialMax,
  baseParams,
}: PriceRangeFilterProps) {
  const router = useRouter()

  const safeMinBound = Math.min(minBound, maxBound)
  const safeMaxBound = Math.max(minBound, maxBound)

  const [range, setRange] = useState<[number, number]>([
    clamp(initialMin, safeMinBound, safeMaxBound),
    clamp(initialMax, safeMinBound, safeMaxBound),
  ])

  const displayRange = useMemo(() => {
    const [a, b] = range
    return [Math.min(a, b), Math.max(a, b)] as [number, number]
  }, [range])

  function applyRange() {
    const params = new URLSearchParams(baseParams)
    params.set("minPrice", String(displayRange[0]))
    params.set("maxPrice", String(displayRange[1]))
    params.set("page", "1")
    router.push(`/B2C/products?${params.toString()}`)
  }

  function clearRange() {
    const params = new URLSearchParams(baseParams)
    params.delete("minPrice")
    params.delete("maxPrice")
    params.set("page", "1")
    router.push(`/B2C/products?${params.toString()}`)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Min: {displayRange[0]} DT</span>
        <span>Max: {displayRange[1]} DT</span>
      </div>

      <Slider
        min={safeMinBound}
        max={safeMaxBound}
        step={1}
        value={displayRange}
        onValueChange={(value) => {
          if (value.length === 2) {
            setRange([value[0] ?? safeMinBound, value[1] ?? safeMaxBound])
          }
        }}
      />

      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div className="rounded-md border bg-muted/30 px-2 py-1">{safeMinBound} DT</div>
        <div className="rounded-md border bg-muted/30 px-2 py-1 text-right">{safeMaxBound} DT</div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={applyRange}>
          Apply
        </Button>
        <Button type="button" variant="ghost" onClick={clearRange}>
          Clear
        </Button>
      </div>
    </div>
  )
}
