"use client"

import Image from "next/image"
import Link from "next/link"
import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { B2CNavbar } from "@/components/B2C/b2c-navbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { B2CAlert, B2CFavorite } from "@/utils/types"

type B2CProfile = {
  id: number
  email: string
  firebase_uid: string
  type: "customer"
  full_name: string | null
  address: string | null
}

type ProfileSectionId = "information" | "alerts" | "favorites"

const profileSections: Array<{ id: ProfileSectionId; label: string; description: string }> = [
  { id: "information", label: "Informations", description: "Update your account details" },
  { id: "alerts", label: "Alerts", description: "Monitor active notifications" },
  { id: "favorites", label: "Favorites", description: "Review saved listings" },
]

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
        <Button size="sm" variant="outline">Update</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Update alert</DialogTitle>
          <DialogDescription>Choose which notifications should stay active.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Button type="button" variant={isPriceNotif ? "default" : "outline"} className="justify-start" onClick={() => setIsPriceNotif((value) => !value)}>
            Price alert {isPriceNotif ? "ON" : "OFF"}
          </Button>
          <Button type="button" variant={isStockNotif ? "default" : "outline"} className="justify-start" onClick={() => setIsStockNotif((value) => !value)}>
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

export function B2CProfilePageContent() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<B2CProfile | null>(null)
  const [fullName, setFullName] = useState("")
  const [address, setAddress] = useState("")
  const [alertsLoading, setAlertsLoading] = useState(true)
  const [alerts, setAlerts] = useState<B2CAlert[]>([])
  const [alertsError, setAlertsError] = useState<string | null>(null)
  const [favoritesLoading, setFavoritesLoading] = useState(true)
  const [favorites, setFavorites] = useState<B2CFavorite[]>([])
  const [favoritesError, setFavoritesError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch("/api/b2c/profile", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { customer: B2CProfile | null }) => {
        if (cancelled) return
        setProfile(data.customer)
        setFullName(data.customer?.full_name ?? "")
        setAddress(data.customer?.address ?? "")
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false)
          setProfile(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!profile) {
      setAlerts([])
      setAlertsError(null)
      setAlertsLoading(false)
      return
    }

    let cancelled = false
    setAlertsLoading(true)

    fetch("/api/b2c/alerts", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          alerts?: B2CAlert[]
          error?: string
        }

        if (cancelled) return

        if (!response.ok) {
          setAlertsError(data.error || "Unable to load alerts.")
          setAlerts([])
          setAlertsLoading(false)
          return
        }

        setAlerts(data.alerts || [])
        setAlertsError(null)
        setAlertsLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setAlertsError("Unable to load alerts.")
          setAlerts([])
          setAlertsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [profile])

  useEffect(() => {
    if (!profile) {
      setFavorites([])
      setFavoritesError(null)
      setFavoritesLoading(false)
      return
    }

    let cancelled = false
    setFavoritesLoading(true)

    fetch("/api/b2c/favorites", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          favorites?: B2CFavorite[]
          error?: string
        }

        if (cancelled) return

        if (!response.ok) {
          setFavoritesError(data.error || "Unable to load favorites.")
          setFavorites([])
          setFavoritesLoading(false)
          return
        }

        setFavorites(data.favorites || [])
        setFavoritesError(null)
        setFavoritesLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setFavoritesError("Unable to load favorites.")
          setFavorites([])
          setFavoritesLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [profile])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)

    try {
      const response = await fetch("/api/b2c/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, address }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile.")
      }

      const customer = data.customer as B2CProfile
      setProfile(customer)
      setFullName(customer.full_name ?? "")
      setAddress(customer.address ?? "")
      toast.success("Profile updated successfully.")
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update profile."
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function removeAlert(alertId: number) {
    const response = await fetch(`/api/b2c/alerts/${alertId}`, { method: "DELETE" })
    if (!response.ok) return
    setAlerts((previous) => previous.filter((item) => item.id !== alertId))
  }

  function updateAlertInState(updated: B2CAlert) {
    setAlerts((previous) => previous.map((item) => (item.id === updated.id ? updated : item)))
  }

  async function removeFavorite(favoriteId: number) {
    const response = await fetch(`/api/b2c/favorites/${favoriteId}`, { method: "DELETE" })
    if (!response.ok) return
    setFavorites((previous) => previous.filter((item) => item.id !== favoriteId))
  }

  if (loading) {
    return <div className="p-10 text-sm text-muted-foreground">Loading profile...</div>
  }

  if (!profile) {
    return (
      <div className="p-10">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="mt-2 text-muted-foreground">You need to login first.</p>
        <Button className="mt-6" onClick={() => router.push("/")}>Back to home</Button>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-muted/30">
      <B2CNavbar title="My profile" backHref="/B2C/products" backLabel="Back to products" />
      <main className="mx-auto flex w-full max-w-8xl gap-6 px-4 py-6 sm:px-10">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-6 space-y-3 rounded-2xl border bg-background p-4 shadow-sm">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Account</p>
              <p className="mt-1 text-lg font-semibold">Navigation</p>
            </div>
            <nav className="space-y-2">
              {profileSections.map((item) => (
                <a key={item.id} href={`#${item.id}`} className="flex items-start justify-between rounded-xl border px-3 py-3 transition-colors hover:bg-muted/40">
                  <div>
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <section className="min-w-0 flex-1 space-y-6">
          <Card id="information" className="scroll-mt-6 rounded-xl border bg-background shadow-sm">
            <CardHeader>
              <CardTitle>Informations</CardTitle>
              <CardDescription>You can update your customer information here. Email is read-only.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={profile.email} readOnly disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your full name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Your address" />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
                  <Button type="button" variant="outline" onClick={() => router.push("/B2C/products")}>Back</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card id="alerts" className="scroll-mt-6 rounded-xl border bg-background shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Alerts</CardTitle>
                <CardDescription>Your active alerts and the products they track.</CardDescription>
              </div>
              <Button asChild variant="outline"><Link href="/B2C/alerts">Manage alerts</Link></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {alertsLoading ? <p className="text-sm text-muted-foreground">Loading alerts...</p> : alertsError ? <p className="text-sm text-destructive">{alertsError}</p> : alerts.length === 0 ? <p className="text-sm text-muted-foreground">No alerts yet.</p> : alerts.map((alert) => (
                <div key={alert.id} className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border bg-muted/20">
                      {alert.productImageUrl ? <Image src={alert.productImageUrl} alt={alert.productName || "Product"} width={120} height={120} className="h-14 w-14 object-contain" unoptimized /> : <span className="text-xs text-muted-foreground">No image</span>}
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">{alert.productName || "Unknown product"}</p>
                      <div className="flex flex-wrap gap-2">
                        {alert.is_price_notif ? <Badge variant="default">Price alert</Badge> : null}
                        {alert.is_stock_notif ? <Badge variant="secondary">Stock alert</Badge> : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {alert.productId ? <Button asChild variant="ghost" size="sm"><Link href={`/B2C/products/${alert.productId}`}>Open product</Link></Button> : null}
                    <AlertsEditor alert={alert} onSaved={updateAlertInState} />
                    <Button variant="destructive" size="sm" onClick={() => removeAlert(alert.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card id="favorites" className="scroll-mt-6 rounded-xl border bg-background shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Favorites</CardTitle>
                <CardDescription>Your saved offer listings. Remove them here or directly from the product card.</CardDescription>
              </div>
              <Button asChild variant="outline"><Link href="/B2C/products">Browse products</Link></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {favoritesLoading ? <p className="text-sm text-muted-foreground">Loading favorites...</p> : favoritesError ? <p className="text-sm text-destructive">{favoritesError}</p> : favorites.length === 0 ? <p className="text-sm text-muted-foreground">No favorites yet.</p> : favorites.map((favorite) => (
                <div key={favorite.id} className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border bg-muted/20">
                      {favorite.productImageUrl ? <Image src={favorite.productImageUrl} alt={favorite.productName || "Product"} width={120} height={120} className="h-14 w-14 object-contain" unoptimized /> : <span className="text-xs text-muted-foreground">No image</span>}
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">{favorite.productName || "Unknown product"}</p>
                      <p className="text-sm text-muted-foreground">Seller: {favorite.sellerName || "Unknown seller"}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{favorite.price !== null ? `${favorite.price.toFixed(2)} DT` : "-"}</Badge>
                        {favorite.availability === null ? <Badge variant="outline">Unknown</Badge> : favorite.availability ? <Badge variant="secondary">In stock</Badge> : <Badge variant="destructive">Out of stock</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {favorite.productId ? <Button asChild variant="ghost" size="sm"><Link href={`/B2C/products/${favorite.productId}`}>Open product</Link></Button> : null}
                    <Button asChild variant="outline" size="sm"><a href={favorite.product_url} target="_blank" rel="noreferrer">Visit offer</a></Button>
                    <Button variant="destructive" size="sm" onClick={() => removeFavorite(favorite.id)}>Remove</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}
