"use client"

import { useEffect, useMemo, useState } from "react"
import { BellRing, TrendingDown, TrendingUp } from "lucide-react"
import { CartesianGrid, Line, LineChart, ReferenceDot, XAxis, YAxis } from "recharts"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
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
import { useI18n } from "@/lib/i18n-context"

type Props = {
  productId: number
  history: PriceHistoryEntry[]
  bestTimePrediction?: BestTimeToBuyPrediction | null
  friendlyMessage?: string | null
  historyAccessMonths?: number
}

type ChartDatum = {
  label: string
  price: number
  outOfStock: boolean
}

type HistoryRange = 1 | 3 | 6

const chartConfig = {
  price: {
    label: "Price",
    color: "#f97316",
  },
} satisfies ChartConfig

function toMoney(value: number): string {
  return `${value.toFixed(2)} DT`
}

function buildData(history: PriceHistoryEntry[], monthsBack: HistoryRange): ChartDatum[] {
  const sorted = [...history].sort((a, b) => {
    const timeA = a.recorded_at ? new Date(a.recorded_at).getTime() : Number.MAX_SAFE_INTEGER
    const timeB = b.recorded_at ? new Date(b.recorded_at).getTime() : Number.MAX_SAFE_INTEGER

    if (timeA !== timeB) {
      return timeA - timeB
    }

    return a.id - b.id
  })

  const datedRows = sorted.filter(
    (item) => item.recorded_at && !Number.isNaN(new Date(item.recorded_at).getTime()),
  )

  if (datedRows.length > 0) {
    const latestTime = new Date(datedRows[datedRows.length - 1].recorded_at as string).getTime()
    const cutoff = new Date(latestTime)
    cutoff.setMonth(cutoff.getMonth() - monthsBack)
    const cutoffMs = cutoff.getTime()

    return sorted
      .filter((item) => {
        if (item.recorded_price === null) {
          return false
        }

        if (!item.recorded_at) {
          return false
        }

        const recordedAt = new Date(item.recorded_at).getTime()
        return !Number.isNaN(recordedAt) && recordedAt >= cutoffMs
      })
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
          outOfStock: Boolean(item.out_of_stock),
        }
      })
  }

  return []
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export default function ProductPriceHistoryLinearChart({
  productId,
  history,
  bestTimePrediction,
  friendlyMessage,
  historyAccessMonths = 1,
}: Props) {
  const { t } = useI18n()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [alertId, setAlertId] = useState<number | null>(null)
  const [isPriceNotif, setIsPriceNotif] = useState(true)
  const [isStockNotif, setIsStockNotif] = useState(false)
  const [isSavingAlert, setIsSavingAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState<string | null>(null)
  const allowedHistoryMonths = historyAccessMonths >= 6 ? 6 : 1
  const rangeOptions = useMemo<HistoryRange[]>(
    () => (allowedHistoryMonths >= 6 ? [1, 3, 6] : [1]),
    [allowedHistoryMonths],
  )
  const [selectedRange, setSelectedRange] = useState<HistoryRange>(allowedHistoryMonths >= 6 ? 6 : 1)

  useEffect(() => {
    if (!rangeOptions.includes(selectedRange)) {
      setSelectedRange(allowedHistoryMonths >= 6 ? 6 : 1)
    }
  }, [allowedHistoryMonths, rangeOptions, selectedRange])

  const chartData = useMemo(() => buildData(history, selectedRange), [history, selectedRange])
  const hasChartData = chartData.length > 0

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
          setAlertMessage(t("general.error"))
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
        setAlertMessage(data.error || t("general.error"))
        return
      }

      if (data.alert?.id) {
        setAlertId(data.alert.id)
      }

      setAlertMessage(alertId ? t("alert.update") : t("alert.activate"))
      setDialogOpen(false)
    } catch {
      setAlertMessage(t("general.error"))
    } finally {
      setIsSavingAlert(false)
    }
  }

  const first = hasChartData ? chartData[0].price : 0
  const latest = hasChartData ? chartData[chartData.length - 1].price : 0
  const deltaPercent = first > 0 ? ((latest - first) / first) * 100 : 0
  const isUp = deltaPercent >= 0

  return (
    <Card className="rounded-xl border">
      <CardHeader className="pb-2">
        <CardTitle>{t("history.chart_title")}</CardTitle>
        <CardDescription>{t("history.chart_subtitle")}</CardDescription>
      </CardHeader>

      <CardContent>
        {bestTimePrediction ? (
          <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium">
                {bestTimePrediction.action === "WAIT" ? t("history.wait") : t("history.buy_now")}
              </div>
              <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">{t("history.confidence")}{formatPercent(bestTimePrediction.confidence * 100)}</div>
            </div>

            <div className="mt-1 text-xs text-blue-800/90">
              <span>{t("history.current_price")}{toMoney(bestTimePrediction.current_price)}</span>
            </div>
          </div>
        ) : null}

        <div className="mb-3 flex flex-wrap justify-center gap-2">
          {rangeOptions.map((range) => (
            <Button
              key={range}
              type="button"
              size="sm"
              variant={selectedRange === range ? "default" : "outline"}
              className={cn("h-8 min-w-12 px-3", selectedRange === range && "shadow-sm")}
              onClick={() => setSelectedRange(range)}
            >
              {range}M
            </Button>
          ))}
        </div>

        {hasChartData ? (
          <ChartContainer config={chartConfig} className="h-72 w-full">
            <LineChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: 14,
                right: 18,
                top: 10,
                bottom: 8,
              }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tickFormatter={(value) => String(value).slice(0, 3)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={64}
                tickMargin={8}
                tickFormatter={(value) => `${Number(value).toFixed(0)} DT`}
                domain={["auto", "auto"]}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Line
                dataKey="price"
                type="monotone"
                stroke="var(--color-price)"
                strokeWidth={2.5}
                dot={{ r: 3.5, strokeWidth: 2, fill: "#fff" }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
              {chartData
                .filter((item) => item.outOfStock)
                .map((item, index) => (
                  <ReferenceDot
                    key={`${item.label}-${index}`}
                    x={item.label}
                    y={item.price}
                    r={7}
                    fill="#dc2626"
                    stroke="#991b1b"
                    strokeWidth={2}
                    isFront
                    ifOverflow="extendDomain"
                    label={{ value: "OOS", position: "top", fill: "#dc2626", fontSize: 10, fontWeight: 700 }}
                  />
                ))}
            </LineChart>
          </ChartContainer>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            {t("history.no_chart_data")}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="mt-4 w-full border-blue-300 bg-white text-blue-700 hover:bg-blue-50"
            >
              <BellRing className="mr-2 h-4 w-4" />
              {alertId ? t("alert.update") : t("alert.activate")}
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t("alert.type")}</DialogTitle>
              <DialogDescription>
                {t("alert.type_desc")}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-2 grid gap-2">
              <Button
                type="button"
                variant={isPriceNotif ? "default" : "outline"}
                className="justify-start"
                onClick={() => setIsPriceNotif((value) => !value)}
              >
                {isPriceNotif ? t("alert.price_on") : t("alert.price_off")}
              </Button>

              <Button
                type="button"
                variant={isStockNotif ? "default" : "outline"}
                className="justify-start"
                onClick={() => setIsStockNotif((value) => !value)}
              >
                {isStockNotif ? t("alert.stock_on") : t("alert.stock_off")}
              </Button>
            </div>

            <div className="mt-3 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
              {hasSelectedType
                ? t("alert.hint")
                : t("alert.select_hint")}
            </div>

            {alertMessage ? <p className="text-sm text-muted-foreground">{alertMessage}</p> : null}

            <DialogFooter>
              <Button
                type="button"
                onClick={saveAlert}
                disabled={!hasSelectedType || isSavingAlert}
              >
                {isSavingAlert ? t("alert.saving") : t("alert.add")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>

      <CardFooter className="flex-col items-start gap-1 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          {isUp
            ? t("history.trending_up", { pct: Math.abs(deltaPercent).toFixed(1) })
            : t("history.trending_down", { pct: Math.abs(deltaPercent).toFixed(1) })}
          {isUp ? (
            <TrendingUp className="h-4 w-4 text-orange-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-orange-600" />
          )}
        </div>
        <div className="leading-none text-muted-foreground">{t("history.latest_price")}{toMoney(latest)}</div>
      </CardFooter>
    </Card>
  )
}
