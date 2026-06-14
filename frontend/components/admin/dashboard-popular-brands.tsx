"use client"

import { useEffect, useMemo, useState } from "react"
import { TrendingUp } from "lucide-react"
import { Bar, BarChart, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { getProducts } from "@/services/products"
import type { Product } from "@/utils/types"

type BrandBarDatum = {
  brand: string
  total: number
}

const chartConfig = {
  total: {
    label: "Products",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

function normalizeBrand(value: string | null): string | null {
  if (!value) {
    return null
  }

  const brand = value.trim()
  return brand ? brand : null
}

function buildBrandData(products: Product[]): BrandBarDatum[] {
  const brandCount = new Map<string, number>()

  products.forEach((product) => {
    const brand = normalizeBrand(product.brand)
    if (!brand) {
      return
    }

    brandCount.set(brand, (brandCount.get(brand) ?? 0) + 1)
  })

  return Array.from(brandCount.entries())
    .map(([brand, total]) => ({ brand, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
}

export default function DashboardPopularBrands() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setFetchError(null)
        const data = await getProducts()
        setProducts(data)
      } catch (error) {
        setFetchError(
          error instanceof Error
            ? error.message
            : "Unable to load products from backend"
        )
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const chartData = useMemo(() => buildBrandData(products), [products])
  const totalBrandedProducts = useMemo(
    () => chartData.reduce((sum, item) => sum + item.total, 0),
    [chartData]
  )

  if (loading) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-lg border bg-card">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Spinner className="size-5" />
          <span>Loading popular brands chart...</span>
        </div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {fetchError}
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Most Popular Brands</CardTitle>
          <CardDescription>Based on all products</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No brand data available.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Most Popular Brands</CardTitle>
        <CardDescription>Based on all products</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ left: 8, right: 8 }}
          >
            <XAxis type="number" dataKey="total" hide />
            <YAxis
              dataKey="brand"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              width={110}
              tickFormatter={(value: string) =>
                value.length > 14 ? `${value.slice(0, 14)}...` : value
              }
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="total" fill="var(--color-total)" radius={6} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Top 10 brands by product count <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing {totalBrandedProducts} branded products from the catalog
        </div>
      </CardFooter>
    </Card>
  )
}
