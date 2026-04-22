"use client"

import { useEffect, useMemo, useState } from "react"
import { BellRing, TrendingDown, TrendingUp } from "lucide-react"
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis } from "recharts"

import { Button } from "@/components/ui/button"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { B2CAlert, BestTimeToBuyPrediction, PriceHistoryEntry } from "@/utils/types"

type Props = {
  productId: number
  history: PriceHistoryEntry[]
  bestTimePrediction?: BestTimeToBuyPrediction | null
}

type ChartDatum = {
  label: string
  price: number
}

const chartConfig = {
  price: {
    label: "Price",
    color: "#f97316",
  },
} satisfies ChartConfig

function toMoney(value: number): string {
  return `${value.toFixed(2)} DT`
}

function buildData(history: PriceHistoryEntry[]): ChartDatum[] {
  const sorted = [...history].sort((a, b) => {
    const timeA = a.recorded_at ? new Date(a.recorded_at).getTime() : Number.MAX_SAFE_INTEGER
    const timeB = b.recorded_at ? new Date(b.recorded_at).getTime() : Number.MAX_SAFE_INTEGER

    if (timeA !== timeB) {
      return timeA - timeB
    }

    return a.id - b.id
  })

  return sorted
    .filter((item) => item.recorded_price !== null)
    .map((item) => {
      const date = item.recorded_at ? new Date(item.recorded_at) : null
      const label =
        date && !Number.isNaN(date.getTime())
          ? date.toLocaleDateString("fr-TN", {
              day: "2-digit",
              month: "short",
            })
          : `P${item.id}`

      return {
        label,
        price: item.recorded_price as number,
      }
    })
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export default function ProductPriceHistoryLinearChart({ productId, history, bestTimePrediction }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [alertId, setAlertId] = useState<number | null>(null)
  const [isPriceNotif, setIsPriceNotif] = useState(true)
  const [isStockNotif, setIsStockNotif] = useState(false)
  const [isSavingAlert, setIsSavingAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState<string | null>(null)
  const chartData = buildData(history)

  useEffect(() => {
    let cancelled = false

    fetch(`/api/b2c/alerts?productId=${encodeURIComponent(String(productId))}`, {
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) {
          return null
        }

        return response.json() as Promise<{ alerts?: B2CAlert[] }>
      })
      .then((data) => {
        if (cancelled || !data?.alerts?.length) {
          return
        }

        const alert = data.alerts[0]
        setAlertId(alert.id)
        setIsPriceNotif(Boolean(alert.is_price_notif))
        setIsStockNotif(Boolean(alert.is_stock_notif))
      })
      .catch(() => {
        if (!cancelled) {
          setAlertMessage("Unable to load existing alert settings.")
        }
      })

    return () => {
      cancelled = true
    }
  }, [productId])

  const hasSelectedType = useMemo(() => isPriceNotif || isStockNotif, [isPriceNotif, isStockNotif])

  async function saveAlert() {
    if (!hasSelectedType || isSavingAlert) {
      return
    }

    setIsSavingAlert(true)
    setAlertMessage(null)

    try {
      const endpoint = alertId ? `/api/b2c/alerts/${alertId}` : "/api/b2c/alerts"
      const method = alertId ? "PUT" : "POST"

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          is_price_notif: isPriceNotif,
          is_stock_notif: isStockNotif,
        }),
      })

      const data = (await response.json().catch(() => ({}))) as {
        error?: string
        alert?: B2CAlert
      }

      if (!response.ok) {
        setAlertMessage(data.error || "Unable to save alert.")
        return
      }

      if (data.alert?.id) {
        setAlertId(data.alert.id)
      }

      setAlertMessage(alertId ? "Alert updated successfully." : "Alert added successfully.")
      setDialogOpen(false)
    } catch {
      setAlertMessage("Unable to connect. Please try again.")
    } finally {
      setIsSavingAlert(false)
    }
  }

  if (chartData.length === 0) {
    return (
      <Card className="rounded-xl border">
        <CardHeader className="pb-2">
          <CardTitle>Evolution du prix</CardTitle>
          <CardDescription>No history points yet.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const first = chartData[0].price
  const latest = chartData[chartData.length - 1].price
  const deltaPercent = first > 0 ? ((latest - first) / first) * 100 : 0
  const isUp = deltaPercent >= 0

  return (
    <Card className="rounded-xl border">
      <CardHeader className="pb-2">
        <CardTitle>Evolution du prix</CardTitle>
        <CardDescription>Timeline of recorded prices</CardDescription>
      </CardHeader>

      <CardContent>
        {bestTimePrediction ? (
          <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">
                Premium tip: {bestTimePrediction.action === "WAIT" ? `wait ${bestTimePrediction.best_day_offset} days` : "buy now"}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                confidence {formatPercent(bestTimePrediction.confidence * 100)}
              </span>
            </div>
            <div className="mt-1 text-xs text-blue-800/90">
              Predicted best price: {toMoney(bestTimePrediction.predicted_best_price)} · Expected drop: {formatPercent(bestTimePrediction.expected_drop_percent)}
            </div>
          </div>
        ) : null}

        <ChartContainer config={chartConfig} className="h-64 w-full">
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => String(value).slice(0, 3)}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Line
              dataKey="price"
              type="linear"
              stroke="var(--color-price)"
              strokeWidth={2}
              dot={false}
            />
            {bestTimePrediction ? (
              <ReferenceLine
                y={bestTimePrediction.predicted_best_price}
                stroke="#2563eb"
                strokeDasharray="6 6"
                strokeWidth={2}
                label={{
                  value:
                    bestTimePrediction.action === "WAIT"
                      ? `Best buy ~ ${bestTimePrediction.best_day_offset}d`
                      : "Buy now",
                  fill: "#2563eb",
                  position: "insideTopRight",
                }}
              />
            ) : null}
          </LineChart>
        </ChartContainer>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="mt-4 w-full border-blue-300 bg-white text-blue-700 hover:bg-blue-50"
            >
              <BellRing className="mr-2 h-4 w-4" />
              {alertId ? "Update alert" : "Activer une alerte prix"}
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Choose alert type</DialogTitle>
              <DialogDescription>
                Select the alert you want for this product.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-2 grid gap-2">
              <Button
                type="button"
                variant={isPriceNotif ? "default" : "outline"}
                className="justify-start"
                onClick={() => setIsPriceNotif((value) => !value)}
              >
                Price alert {isPriceNotif ? "ON" : "OFF"}
              </Button>

              <Button
                type="button"
                variant={isStockNotif ? "default" : "outline"}
                className="justify-start"
                onClick={() => setIsStockNotif((value) => !value)}
              >
                Stock alert {isStockNotif ? "ON" : "OFF"}
              </Button>
            </div>

            <div className="mt-3 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
              {hasSelectedType
                ? "Choose one or both notifications, then click Add alert."
                : "Select at least one type to activate alerts."}
            </div>

            {alertMessage ? <p className="text-sm text-muted-foreground">{alertMessage}</p> : null}

            <DialogFooter>
              <Button
                type="button"
                onClick={saveAlert}
                disabled={!hasSelectedType || isSavingAlert}
              >
                {isSavingAlert ? "Saving..." : "Add alert"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>

      <CardFooter className="flex-col items-start gap-1 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          {isUp
            ? `Trending up by ${Math.abs(deltaPercent).toFixed(1)}%`
            : `Trending down by ${Math.abs(deltaPercent).toFixed(1)}%`}
          {isUp ? (
            <TrendingUp className="h-4 w-4 text-orange-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-orange-600" />
          )}
        </div>
        <div className="leading-none text-muted-foreground">Latest price: {toMoney(latest)}</div>
      </CardFooter>
    </Card>
  )
}
