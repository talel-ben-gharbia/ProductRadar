"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"

import { B2CNavbar } from "@/components/B2C/b2c-navbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

      const data = (await response.json().catch(() => ({}))) as {
        alert?: B2CAlert
      }

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
        <Button size="sm" variant="outline">Update</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Update alert</DialogTitle>
          <DialogDescription>
            Choose which notifications should stay active.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
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

        <DialogFooter>
          <Button type="button" onClick={saveChanges} disabled={!canSave || saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function B2CAlertsPage() {
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
          setError(data.error || "Unable to load alerts.")
          setAlerts([])
          setLoading(false)
          return
        }

        setAlerts(data.alerts || [])
        setError(null)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setError("Unable to load alerts.")
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
    <div className="min-h-svh bg-muted/30">
      <B2CNavbar
        title="My alerts"
        backHref="/B2C/products"
        backLabel="Back to products"
        showAlertsButton={false}
      />

      <main className="mx-auto w-full max-w-8xl space-y-4 px-4 py-6 sm:px-10">
        {loading ? (
          <Card className="rounded-xl border">
            <CardContent className="py-6 text-sm text-muted-foreground">Loading alerts...</CardContent>
          </Card>
        ) : error ? (
          <Card className="rounded-xl border-destructive/40 bg-destructive/5">
            <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : alerts.length === 0 ? (
          <Card className="rounded-xl border">
            <CardHeader>
              <CardTitle>No alerts yet</CardTitle>
              <CardDescription>
                You have no active alerts. Open a product and add price or stock alerts.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4">
            {alerts.map((alert) => (
              <Card key={alert.id} className="rounded-xl border">
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border bg-muted/20">
                      {alert.productImageUrl ? (
                        <Image
                          src={alert.productImageUrl}
                          alt={alert.productName || "Product"}
                          width={120}
                          height={120}
                          className="h-14 w-14 object-contain"
                          unoptimized
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">No image</span>
                      )}
                    </div>

                    <div>
                      <p className="font-medium">{alert.productName || "Unknown product"}</p>
                      <div className="mt-1 flex gap-2">
                        {alert.is_price_notif ? <Badge variant="default">Price alert</Badge> : null}
                        {alert.is_stock_notif ? <Badge variant="secondary">Stock alert</Badge> : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/B2C/products/${alert.productId}`}>Open product</Link>
                    </Button>
                    <AlertsEditor alert={alert} onSaved={updateAlertInState} />
                    <Button variant="destructive" size="sm" onClick={() => removeAlert(alert.id)}>
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
