"use client"

import { useEffect, useMemo, useState } from "react"
import { Pie, PieChart } from "recharts"
import { TrendingUp } from "lucide-react"

import { Spinner } from "@/components/ui/spinner"
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
import {
  getCategoriesWithParents,
} from "@/services/admin/categories"
import type { CategoryWithParent } from "@/utils/types"

type PieDatum = {
  key: string
  label: string
  value: number
  fill: string
}

const chartPalette = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

function toKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-")
}

function buildPieData(values: Array<string | null>): PieDatum[] {
  const counts = new Map<string, number>()

  values.forEach((value) => {
    if (!value) {
      return
    }

    counts.set(value, (counts.get(value) ?? 0) + 1)
  })

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], index) => ({
      key: toKey(label),
      label,
      value,
      fill: chartPalette[index % chartPalette.length],
    }))
}

function buildChartConfig(data: PieDatum[], valueLabel: string): ChartConfig {
  const config: ChartConfig = {
    value: {
      label: valueLabel,
    },
  }

  data.forEach((item) => {
    config[item.key] = {
      label: item.label,
      color: item.fill,
    }
  })

  return config
}

function HierarchyPieCard({
  title,
  description,
  data,
}: {
  title: string
  description: string
  data: PieDatum[]
}) {
  const chartConfig = useMemo(() => buildChartConfig(data, "Categories"), [data])
  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data])

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[260px] pb-0 [&_.recharts-pie-label-text]:fill-foreground"
        >
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, name) => (
                    <div className="flex min-w-32 items-center justify-between gap-2">
                      <span className="text-muted-foreground">{name}</span>
                      <span className="font-medium tabular-nums">{Number(value)}</span>
                    </div>
                  )}
                />
              }
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              label={false}
              isAnimationActive
            />
          </PieChart>
        </ChartContainer>
      </CardContent>

      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          Total: {total} <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">Distribution by category level</div>
      </CardFooter>
    </Card>
  )
}

export default function DashboardCategoryPies() {
  const [categories, setCategories] = useState<CategoryWithParent[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setFetchError(null)
        const data = await getCategoriesWithParents()
        setCategories(data)
      } catch (error) {
        setFetchError(
          error instanceof Error
            ? error.message
            : "Unable to load categories from backend"
        )
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const mainData = useMemo(
    () => buildPieData(categories.map((item) => item.category)),
    [categories]
  )
  const subData = useMemo(
    () => buildPieData(categories.map((item) => item.subCategory)),
    [categories]
  )
  const childData = useMemo(
    () => buildPieData(categories.map((item) => item.childCategory)),
    [categories]
  )

  if (loading) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-lg border bg-card">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Spinner className="size-5" />
          <span>Loading category charts...</span>
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

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <HierarchyPieCard
        title="Main Categories"
        description="Top-level categories"
        data={mainData}
      />
      <HierarchyPieCard
        title="Sub Categories"
        description="Second-level categories"
        data={subData}
      />
      <HierarchyPieCard
        title="Child Categories"
        description="Third-level categories"
        data={childData}
      />
    </div>
  )
}
