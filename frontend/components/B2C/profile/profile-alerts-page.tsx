"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useI18n } from "@/lib/i18n-context"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { B2CAlert } from "@/utils/types"

function AlertsEditor({
  alert,
  onSaved,
}: {
  alert: B2CAlert
  onSaved: (updated: B2CAlert) => void
}) {
  const { t } = useI18n()
  const [isPriceNotif, setIsPriceNotif] = useState(Boolean(alert.is_price_notif))
  const [isStockNotif, setIsStockNotif] = useState(Boolean(alert.is_stock_notif))
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const canSave = isPriceNotif || isStockNotif

  async function saveChanges() {
    if (!canSave || saving) {
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`/api/b2c/alerts/${alert.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_price_notif: isPriceNotif,
          is_stock_notif: isStockNotif,
        }),
      })

      const data = (await response.json().catch(() => ({}))) as { alert?: B2CAlert }

      if (!response.ok || !data.alert) {
        return
      }

      onSaved(data.alert)
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          {t("profile.alert_update")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("profile.alert_update_title")}</DialogTitle>
          <DialogDescription>{t("profile.alert_update_desc")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Button
            type="button"
            variant={isPriceNotif ? "default" : "outline"}
            className="justify-start"
            onClick={() => setIsPriceNotif((value) => !value)}
          >
            {isPriceNotif ? t("profile.alert_price_on") : t("profile.alert_price_off")}
          </Button>
          <Button
            type="button"
            variant={isStockNotif ? "default" : "outline"}
            className="justify-start"
            onClick={() => setIsStockNotif((value) => !value)}
          >
            {isStockNotif ? t("profile.alert_stock_on") : t("profile.alert_stock_off")}
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" onClick={saveChanges} disabled={!canSave || saving}>
            {saving ? t("profile.alert_saving") : t("profile.alert_save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ProfileAlertsPage() {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState<B2CAlert[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch("/api/b2c/alerts", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          alerts?: B2CAlert[]
          error?: string
        }

        if (cancelled) {
          return
        }

        if (!response.ok) {
          setError(data.error || t("general.error"))
          setAlerts([])
          setLoading(false)
          return
        }

        setAlerts((data.alerts || []).filter((alert) => !alert.cancelled))
        setError(null)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setError(t("general.error"))
          setAlerts([])
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function removeAlert(alertId: number) {
    const response = await fetch(`/api/b2c/alerts/${alertId}`, { method: "DELETE" })

    if (!response.ok) {
      return
    }

    setAlerts((previous) => previous.filter((item) => item.id !== alertId))
  }

  function updateAlertInState(updated: B2CAlert) {
    setAlerts((previous) => previous.map((item) => (item.id === updated.id ? updated : item)))
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-xl border bg-background shadow-sm">
        <CardHeader>
          <CardTitle>{t("profile.alert_title")}</CardTitle>
          <CardDescription>{t("profile.alert_desc")}</CardDescription>
        </CardHeader>
      </Card>

      {loading ? (
        <Card className="rounded-xl border bg-background shadow-sm">
          <CardContent className="py-6 text-sm text-muted-foreground">{t("profile.alert_loading")}</CardContent>
        </Card>
      ) : error ? (
        <Card className="rounded-xl border-destructive/40 bg-destructive/5 shadow-sm">
          <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : alerts.length === 0 ? (
        <Card className="rounded-xl border bg-background shadow-sm">
          <CardHeader>
            <CardTitle>{t("profile.alert_empty_title")}</CardTitle>
            <CardDescription>{t("profile.alert_empty_desc")}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4">
          {alerts.map((alert) => (
            <Card key={alert.id} className="rounded-xl border bg-background shadow-sm">
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border bg-muted/20">
                    {alert.productImageUrl ? (
                      <Image
                        src={alert.productImageUrl}
                        alt={alert.productName || t("profile.alert_unknown")}
                        width={120}
                        height={120}
                        className="h-14 w-14 object-contain"
                        unoptimized
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">{t("profile.alert_no_image")}</span>
                    )}
                  </div>

                  <div>
                    <p className="font-medium">{alert.productName || t("profile.alert_unknown")}</p>
                    <div className="mt-1 flex gap-2">
                      {alert.is_price_notif ? <Badge variant="default">{t("profile.alert_price")}</Badge> : null}
                      {alert.is_stock_notif ? <Badge variant="secondary">{t("profile.alert_stock")}</Badge> : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/B2C/products/${alert.productId}`}>{t("profile.alert_open_product")}</Link>
                  </Button>
                  <AlertsEditor alert={alert} onSaved={updateAlertInState} />
                  <Button variant="destructive" size="sm" onClick={() => removeAlert(alert.id)}>
                    {t("profile.alert_delete")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}