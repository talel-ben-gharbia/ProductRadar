"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, BellRing, Heart, Search } from "lucide-react"

import { B2CNavAuth } from "@/components/B2C/b2c-nav-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type B2CNavbarProps = {
  title: string
  backHref?: string
  backLabel?: string
}

type LiveSearchProduct = {
  id: number
  name: string
  imageUrl: string | null
  bestPrice: number | null
}

type B2CNotification = {
  id: number
  message: string | null
  is_read: boolean
  productListingId: number | null
  productId: number | null
  productName: string | null
  productImageUrl: string | null
  productPrice: number | null
  created_at: string | null
}

function formatPrice(value: number | null): string {
  if (value === null) {
    return "No available price"
  }

  return `${value.toFixed(2)} DT`
}

export function B2CNavbar({
  title,
  backHref,
  backLabel = "Back",
}: B2CNavbarProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<LiveSearchProduct[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<B2CNotification[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const notificationsRef = useRef<HTMLDivElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const trimmedQuery = useMemo(() => query.trim(), [query])

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }

      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
    }
  }, [])

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      abortRef.current?.abort()
      setResults([])
      setIsLoading(false)
      return
    }

    const timeoutId = window.setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setIsLoading(true)

      try {
        const response = await fetch(
          `/api/b2c/products/search?q=${encodeURIComponent(trimmedQuery)}&limit=8`,
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error("Search request failed")
        }

        const data = (await response.json()) as LiveSearchProduct[]
        setResults(data)
        setIsOpen(true)
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setResults([])
          setIsOpen(true)
        }
      } finally {
        setIsLoading(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [trimmedQuery])

  async function loadNotifications() {
    setNotificationsLoading(true)

    try {
      const response = await fetch("/api/b2c/notifications", { cache: "no-store" })

      if (!response.ok) {
        throw new Error("Failed to load notifications")
      }

      const data = (await response.json()) as { notifications?: B2CNotification[] }
      setNotifications(data.notifications ?? [])
    } catch {
      setNotifications([])
    } finally {
      setNotificationsLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  useEffect(() => {
    if (notificationsOpen) {
      loadNotifications()
    }
  }, [notificationsOpen])

  const unreadCount = notifications.filter((item) => !item.is_read).length

  async function handleNotificationClick(notification: B2CNotification) {
    try {
      await fetch(`/api/b2c/notifications/${notification.id}/read`, {
        method: "PUT",
      })
    } catch {
      // Keep navigation working even if mark-as-read fails.
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id
          ? {
              ...item,
              is_read: true,
            }
          : item,
      ),
    )
    setNotificationsOpen(false)

    if (notification.productId) {
      router.push(`/B2C/products/${notification.productId}`)
      return
    }

    router.push("/B2C/products")
  }

  return (
    <nav className="border-b bg-background">
      <div className="mx-auto flex max-w-8xl flex-wrap items-center justify-between gap-3 px-6 py-4 sm:px-10">
        <div className="flex items-center gap-3">
          {backHref ? (
            <Button asChild size="sm" variant="ghost" className="h-9 rounded-full px-4">
              <Link href={backHref}>{backLabel}</Link>
            </Button>
          ) : null}
          <h1 className="text-2xl font-bold tracking-tight">
            <Link href="/" className="hover:text-primary transition-colors">
              {title}
            </Link>
          </h1>
        </div>

        <div ref={containerRef} className="relative order-3 w-full sm:order-2 sm:w-auto sm:flex-1 sm:px-4">
          <form
            action="/B2C/products"
            method="get"
            className="relative w-full sm:max-w-xl"
            onSubmit={() => setIsOpen(false)}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              name="search"
              placeholder="Search by product name or reference"
              className="h-10 rounded-full border-slate-300 bg-white pl-9 pr-3"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => {
                if (trimmedQuery.length >= 2) {
                  setIsOpen(true)
                }
              }}
            />
          </form>

          {isOpen && trimmedQuery.length >= 2 ? (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border bg-white shadow-lg sm:max-w-xl">
              {isLoading ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">Searching...</p>
              ) : results.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">No matching products found.</p>
              ) : (
                <ul className="max-h-80 divide-y overflow-auto">
                  {results.map((product) => (
                    <li key={product.id}>
                      <Link
                        href={`/B2C/products/${product.id}`}
                        onClick={() => {
                          setIsOpen(false)
                          setQuery("")
                        }}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-[#f7f9ff]">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain" />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">No image</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{formatPrice(product.bestPrice)}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        <div className="order-2 flex items-center gap-3 sm:order-3">
          <div className="relative" ref={notificationsRef}>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="relative h-9 w-9 rounded-full"
              onClick={() => setNotificationsOpen((value) => !value)}
              aria-label="Open notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </Button>

            {notificationsOpen ? (
              <div className="absolute right-0 z-50 mt-2 w-88 overflow-hidden rounded-xl border bg-white shadow-lg">
                <div className="flex items-center justify-between border-b px-4 py-2">
                  <p className="text-sm font-semibold">Notifications</p>
                  <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
                </div>

                {notificationsLoading ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">Loading notifications...</p>
                ) : notifications.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">No notifications yet.</p>
                ) : (
                  <ul className="max-h-96 divide-y overflow-auto">
                    {notifications.map((notification) => (
                      <li key={notification.id}>
                        <button
                          type="button"
                          onClick={() => handleNotificationClick(notification)}
                          className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 ${notification.is_read ? "bg-white" : "bg-blue-50/60"}`}
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-[#f7f9ff]">
                            {notification.productImageUrl ? (
                              <img
                                src={notification.productImageUrl}
                                alt={notification.productName || "Notification product"}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <BellRing className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {notification.productName || "Product update"}
                            </p>
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {notification.message || "A new update is available for this listing."}
                            </p>
                            {notification.productPrice !== null ? (
                              <p className="mt-0.5 text-xs font-medium text-emerald-700">
                                {notification.productPrice.toFixed(2)} DT
                              </p>
                            ) : null}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>

          <Button asChild variant="outline" size="sm" className="h-9 rounded-full px-4">
            <Link href="/B2C/profile/favorites" className="inline-flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span>Favorites</span>
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm" className="h-9 rounded-full px-4">
            <Link href="/B2C/profile/alerts" className="inline-flex items-center gap-2">
              <BellRing className="h-4 w-4" />
              <span>My alerts</span>
            </Link>
          </Button>
          <B2CNavAuth />
          <Button asChild className="h-9 rounded-full px-4">
            <Link href="/B2B">Become a Partner</Link>
          </Button>
        </div>
      </div>
    </nav>
  )
}
