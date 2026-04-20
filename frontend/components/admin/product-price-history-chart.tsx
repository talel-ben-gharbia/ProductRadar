"use client"

import { Activity, TrendingDown, TrendingUp } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"
import type { PriceHistoryEntry } from "@/utils/types"

type Props = {
  history: PriceHistoryEntry[]
  sellerNamesById?: Record<number, string>
}

type HistoryDatum = {
  id: number
  pointLabel: string
  recordedPrice: number
  isOutOfStock: boolean
  sellerLabel: string
  listingLabel: string
  direction: "up" | "down" | "same" | "start"
  movementLabel: string
}

const chartConfig = {
  price: {
    label: "Price",
    color: "var(--chart-1)",
    icon: Activity,
  },
} satisfies ChartConfig

function toMoney(value: number): string {
  return (
    value.toLocaleString("fr-TN", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }) + " DT"
  )
}

function buildHistoryData(
  history: PriceHistoryEntry[],
  sellerNamesById: Record<number, string>
): HistoryDatum[] {
  const sorted = [...history].sort((a, b) => {
    const timeA = a.recorded_at ? new Date(a.recorded_at).getTime() : Number.MAX_SAFE_INTEGER
    const timeB = b.recorded_at ? new Date(b.recorded_at).getTime() : Number.MAX_SAFE_INTEGER
    if (timeA !== timeB) {
      return timeA - timeB
    }

    return (a.id ?? 0) - (b.id ?? 0)
  })

  const points: HistoryDatum[] = []
  let previousPrice: number | null = null

  for (const item of sorted) {
    if (item.recorded_price === null) {
      continue
    }

    const date = item.recorded_at ? new Date(item.recorded_at) : null
    const pointLabel =
      date && !Number.isNaN(date.getTime())
        ? `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
        : `Point ${item.id}`

    let direction: HistoryDatum["direction"] = "start"
    if (previousPrice !== null) {
      if (item.recorded_price > previousPrice) {
        direction = "up"
      } else if (item.recorded_price < previousPrice) {
        direction = "down"
      } else {
        direction = "same"
      }
    }

    const movementLabel =
      direction === "up"
        ? "Price increased"
        : direction === "down"
          ? "Price dropped"
          : direction === "same"
            ? "No change"
            : "Start point"

    points.push({
      id: item.id,
      pointLabel,
      recordedPrice: item.recorded_price,
      isOutOfStock: item.out_of_stock === true,
      sellerLabel:
        item.sellerName?.trim() ||
        (item.sellerId !== null ? sellerNamesById[item.sellerId]?.trim() : "") ||
        (item.sellerId !== null ? `Seller #${item.sellerId}` : "Seller unknown"),
      listingLabel:
        item.productListingId !== null
          ? `Listing #${item.productListingId}`
          : "Listing unknown",
      direction,
      movementLabel,
    })

    previousPrice = item.recorded_price
  }

  return points
}

function PricePointDot({
  cx,
  cy,
  payload,
}: {
  cx?: number
  cy?: number
  payload?: HistoryDatum
}) {
  if (typeof cx !== "number" || typeof cy !== "number" || !payload) {
    return null
  }

  if (payload.isOutOfStock) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#ffffff" strokeWidth={1.5} />
        <line x1={cx - 2.2} y1={cy - 2.2} x2={cx + 2.2} y2={cy + 2.2} stroke="#ffffff" strokeWidth={1.3} />
        <line x1={cx + 2.2} y1={cy - 2.2} x2={cx - 2.2} y2={cy + 2.2} stroke="#ffffff" strokeWidth={1.3} />
      </g>
    )
  }

  return <circle cx={cx} cy={cy} r={3} fill="var(--color-price)" stroke="#ffffff" strokeWidth={1} />
}

function PriceHistoryTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: HistoryDatum }>
}) {
  if (!active || !payload?.length) {
    return null
  }

  const point = payload[0]?.payload
  if (!point) {
    return null
  }

  const movementColor =
    point.direction === "up"
      ? "text-amber-600"
      : point.direction === "down"
        ? "text-emerald-600"
        : "text-muted-foreground"

  return (
    <div className="min-w-52 rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="font-medium">{point.pointLabel}</p>
      <p className="mt-1 font-semibold">{toMoney(point.recordedPrice)}</p>
      <p className={`mt-1 ${movementColor}`}>{point.movementLabel}</p>
      {point.isOutOfStock ? <p className="mt-1 font-medium text-red-600">Out of stock at this point</p> : null}
      <p className="mt-1 text-muted-foreground">{point.sellerLabel}</p>
      <p className="text-muted-foreground">{point.listingLabel}</p>
    </div>
  )
}

export default function ProductPriceHistoryChart({ history, sellerNamesById = {} }: Props) {
  const chartData = buildHistoryData(history, sellerNamesById)
  const rises = chartData.filter((item) => item.direction === "up").length
  const drops = chartData.filter((item) => item.direction === "down").length
  const outOfStockEvents = chartData.filter((item) => item.isOutOfStock).length

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Price History</CardTitle>
          <CardDescription>Timeline of all recorded prices for this product.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No price history data available yet.</p>
        </CardContent>
      </Card>
    )
  }

  const latest = chartData[chartData.length - 1]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price History</CardTitle>
        <CardDescription>
          Step timeline of recorded prices with seller on each movement point.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="pointLabel"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value: string) => value.slice(0, 10)}
            />
            <ChartTooltip cursor={false} content={<PriceHistoryTooltip />} />
            <Area
              dataKey="recordedPrice"
              type="step"
              fill="var(--color-price)"
              fillOpacity={0.28}
              stroke="var(--color-price)"
              strokeWidth={2}
              dot={<PricePointDot />}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full flex-wrap items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <TrendingDown className="h-4 w-4" />
              Drops: {drops}
            </span>
            <span className="inline-flex items-center gap-1 text-amber-600">
              <TrendingUp className="h-4 w-4" />
              Rises: {rises}
            </span>
            <span className="inline-flex items-center gap-1 text-red-600">Out of stock points: {outOfStockEvents}</span>
          </div>
          <span className="text-muted-foreground">
            Latest: {toMoney(latest.recordedPrice)} by {latest.sellerLabel}
          </span>
        </div>
      </CardFooter>
    </Card>
  )
}
