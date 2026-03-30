"use client"

import { useMemo } from "react"
import { Activity, BarChart3, Clock3, ShieldCheck } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"

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
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { ProductListing } from "@/utils/types"

type Props = {
  listings: ProductListing[]
  fetchError: string | null
}

type CountDatum = {
  label: string
  value: number
  fill?: string
}

type TrendDatum = {
  date: string
  total: number
}

const availabilityConfig = {
  value: { label: "Listings" },
  available: { label: "Available", color: "var(--chart-1)" },
  unavailable: { label: "Unavailable", color: "var(--chart-3)" },
  unknown: { label: "Unknown", color: "var(--chart-5)" },
} satisfies ChartConfig

const sellersConfig = {
  value: { label: "Listings", color: "var(--chart-2)" },
} satisfies ChartConfig

const trendConfig = {
  total: { label: "Listings", color: "var(--chart-1)" },
} satisfies ChartConfig

const priceBandConfig = {
  value: { label: "Listings", color: "var(--chart-4)" },
} satisfies ChartConfig

function buildAvailabilityData(listings: ProductListing[]): CountDatum[] {
  let available = 0
  let unavailable = 0
  let unknown = 0

  listings.forEach((listing) => {
    if (listing.availability === true) {
      available += 1
    } else if (listing.availability === false) {
      unavailable += 1
    } else {
      unknown += 1
    }
  })

  return [
    { label: "available", value: available, fill: "var(--color-available)" },
    { label: "unavailable", value: unavailable, fill: "var(--color-unavailable)" },
    { label: "unknown", value: unknown, fill: "var(--color-unknown)" },
  ]
}

function buildTopSellersData(listings: ProductListing[]): CountDatum[] {
  const sellerCount = new Map<string, number>()

  listings.forEach((listing) => {
    const sellerLabel =
      listing.sellerName?.trim() ||
      (listing.sellerId !== null ? `Seller #${listing.sellerId}` : "Unknown")

    sellerCount.set(sellerLabel, (sellerCount.get(sellerLabel) ?? 0) + 1)
  })

  return Array.from(sellerCount.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
}

function buildRecentTrendData(listings: ProductListing[]): TrendDatum[] {
  const days = 14
  const today = new Date()
  const dailyCount = new Map<string, number>()

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    dailyCount.set(key, 0)
  }

  listings.forEach((listing) => {
    if (!listing.created_at) {
      return
    }

    const created = new Date(listing.created_at)
    if (Number.isNaN(created.getTime())) {
      return
    }

    const key = created.toISOString().slice(0, 10)
    if (!dailyCount.has(key)) {
      return
    }

    dailyCount.set(key, (dailyCount.get(key) ?? 0) + 1)
  })

  return Array.from(dailyCount.entries()).map(([date, total]) => ({
    date,
    total,
  }))
}

function buildPriceBandData(listings: ProductListing[]): CountDatum[] {
  const bands: Array<{ label: string; min: number; max: number | null; count: number }> = [
    { label: "0-500", min: 0, max: 500, count: 0 },
    { label: "500-1000", min: 500, max: 1000, count: 0 },
    { label: "1000-2000", min: 1000, max: 2000, count: 0 },
    { label: "2000-5000", min: 2000, max: 5000, count: 0 },
    { label: ">5000", min: 5000, max: null, count: 0 },
  ]

  listings.forEach((listing) => {
    const price = listing.price
    if (price === null || Number.isNaN(price)) {
      return
    }

    const band = bands.find((item) => {
      if (item.max === null) {
        return price >= item.min
      }

      return price >= item.min && price < item.max
    })

    if (band) {
      band.count += 1
    }
  })

  return bands.map((band) => ({ label: band.label, value: band.count }))
}

function formatShortDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export default function DashboardMonitorChartsClient({ listings, fetchError }: Props) {
  const availabilityData = useMemo(() => buildAvailabilityData(listings), [listings])
  const topSellersData = useMemo(() => buildTopSellersData(listings), [listings])
  const trendData = useMemo(() => buildRecentTrendData(listings), [listings])
  const priceBandData = useMemo(() => buildPriceBandData(listings), [listings])

  if (fetchError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {fetchError}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Monitoring Charts</h2>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-4" />
              Availability Mix
            </CardTitle>
            <CardDescription>Available vs unavailable vs unknown</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={availabilityConfig} className="h-72 w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
                <Pie
                  data={availabilityData}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={50}
                  outerRadius={90}
                  strokeWidth={2}
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            Total listings: {listings.length}
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4" />
              Top Sellers by Listings
            </CardTitle>
            <CardDescription>Most active sellers in the catalog</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={sellersConfig} className="h-72 w-full">
              <BarChart data={topSellersData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <XAxis type="number" hide />
                <YAxis
                  dataKey="label"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  width={130}
                  tickFormatter={(value: string) =>
                    value.length > 16 ? `${value.slice(0, 16)}...` : value
                  }
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={6} />
              </BarChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            Top {Math.min(8, topSellersData.length)} sellers shown
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock3 className="size-4" />
              Listing Activity (14 Days)
            </CardTitle>
            <CardDescription>New listings created per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trendConfig} className="h-72 w-full">
              <LineChart data={trendData} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={formatShortDate}
                />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={28} />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => formatShortDate(String(value))}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="var(--color-total)"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            Last 14 days activity overview
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4" />
              Price Bands
            </CardTitle>
            <CardDescription>Distribution of listing prices</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={priceBandConfig} className="h-72 w-full">
              <BarChart data={priceBandData} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={28} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={6} />
              </BarChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            Helps spot concentration in low/high price ranges
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
