"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Bell, BellRing, Heart, Menu, Search, Target, X } from "lucide-react"

import { B2CNavAuth } from "@/components/B2C/b2c-nav-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthDialog } from "@/lib/auth-dialog-context"

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

type SessionType = "customer" | "b2b_company" | "b2b_market" | null

function formatPrice(value: number | null): string {
  if (value === null) return "No available price"
  return `${value.toFixed(2)} DT`
}

export function B2CNavbar() {
  const router = useRouter()
  const { openAuthDialog } = useAuthDialog()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<LiveSearchProduct[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<B2CNotification[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sessionType, setSessionType] = useState<SessionType>(null)
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
    return () => document.removeEventListener("mousedown", handleOutsideClick)
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
        if (!response.ok) throw new Error("Search failed")
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

    return () => window.clearTimeout(timeoutId)
  }, [trimmedQuery])

  const loadNotifications = useCallback(
    async (forceAuthenticated = false) => {
      if (!isAuthenticated && !forceAuthenticated) {
        setNotifications([])
        setNotificationsLoading(false)
        return
      }
      setNotificationsLoading(true)
      try {
        const response = await fetch("/api/b2c/notifications", { cache: "no-store" })
        if (!response.ok) throw new Error("Failed to load notifications")
        const data = (await response.json()) as { notifications?: B2CNotification[] }
        setNotifications(data.notifications ?? [])
      } catch {
        setNotifications([])
      } finally {
        setNotificationsLoading(false)
      }
    },
    [isAuthenticated],
  )

  useEffect(() => {
    let cancelled = false

    fetch("/api/b2c/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { customer?: { id?: number; type?: SessionType } | null }) => {
        if (cancelled) return
        const authenticated = Boolean(data.customer?.id)
        setIsAuthenticated(authenticated)
        setSessionType(authenticated ? (data.customer?.type ?? null) : null)
        if (authenticated) loadNotifications(true)
        else setNotifications([])
      })
      .catch(() => {
        if (!cancelled) {
          setIsAuthenticated(false)
          setSessionType(null)
          setNotifications([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (notificationsOpen && isAuthenticated) loadNotifications()
  }, [loadNotifications, notificationsOpen, isAuthenticated])

  const isB2BSession = sessionType === "b2b_company" || sessionType === "b2b_market"
  const unreadCount = notifications.filter((n) => !n.is_read).length

  async function handleNotificationClick(notification: B2CNotification) {
    try {
      await fetch(`/api/b2c/notifications/${notification.id}/read`, { method: "PUT" })
    } catch {
      // Keep navigation working even if mark-as-read fails.
    }
    setNotifications((cur) =>
      cur.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)),
    )
    setNotificationsOpen(false)
    if (notification.productId) {
      router.push(`/B2C/products/${notification.productId}`)
      return
    }
    router.push("/B2C/products")
  }

  const NotificationsDropdown = (
    <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border bg-white shadow-xl">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <p className="text-sm font-semibold">Notifications</p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-muted-foreground">
          {unreadCount} unread
        </span>
      </div>
      {notificationsLoading ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">Loading...</p>
      ) : !isAuthenticated ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">Login to view notifications.</p>
      ) : notifications.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">No notifications yet.</p>
      ) : (
        <ul className="max-h-96 divide-y overflow-auto">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <button
                type="button"
                onClick={() => handleNotificationClick(notification)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${notification.is_read ? "" : "bg-blue-50/60"}`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-slate-50">
                  {notification.productImageUrl ? (
                    <Image
                      src={notification.productImageUrl}
                      alt={notification.productName || ""}
                      width={40}
                      height={40}
                      className="h-full w-full object-contain"
                      unoptimized
                    />
                  ) : (
                    <BellRing className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {notification.productName || "Product update"}
                  </p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {notification.message || "A new update is available."}
                  </p>
                  {notification.productPrice !== null && (
                    <p className="mt-0.5 text-xs font-medium text-emerald-700">
                      {notification.productPrice.toFixed(2)} DT
                    </p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  return (
    <header className="sticky top-0 z-50 h-16 border-b bg-white/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto w-full flex h-full max-w-8xl items-center gap-3 px-4 sm:px-10">
        {/* Brand */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-bold text-foreground transition-opacity hover:opacity-80"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
            <Target className="h-4 w-4" />
          </div>
          <span className="hidden text-base sm:block">ProductRadar</span>
        </Link>

        {/* Search */}
        <div ref={containerRef} className="relative min-w-0 flex-1">
          <form
            action="/B2C/products"
            method="get"
            className="relative"
            onSubmit={() => setIsOpen(false)}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              name="search"
              placeholder="Search products..."
              className="h-9 rounded-full border-slate-200 bg-slate-50 pl-9 pr-3 text-sm transition-colors focus:bg-white"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (trimmedQuery.length >= 2) setIsOpen(true)
              }}
            />
          </form>

          {isOpen && trimmedQuery.length >= 2 ? (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border bg-white shadow-xl">
              {isLoading ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">Searching...</p>
              ) : results.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">No products found.</p>
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
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-slate-50">
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              width={40}
                              height={40}
                              className="h-full w-full object-contain"
                              unoptimized
                            />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">No img</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatPrice(product.bestPrice)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-1 lg:flex">
          <div className="relative" ref={notificationsRef}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => {
                if (!isAuthenticated) {
                  openAuthDialog()
                  return
                }
                setNotificationsOpen((v) => !v)
              }}
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Button>
            {notificationsOpen && NotificationsDropdown}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => {
              if (isAuthenticated) {
                router.push("/B2C/profile/favorites")
              } else {
                openAuthDialog()
              }
            }}
          >
            <Heart className="h-4 w-4" />
            <span>Favorites</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => {
              if (isAuthenticated) {
                router.push("/B2C/profile/alerts")
              } else {
                openAuthDialog()
              }
            }}
          >
            <BellRing className="h-4 w-4" />
            <span>Alerts</span>
          </Button>

          {isB2BSession && (
            <Button asChild variant="ghost" size="sm" className="h-9 rounded-full">
              <Link href="/B2B/dashboard">B2B Dashboard</Link>
            </Button>
          )}

          <div className="ml-1 flex items-center gap-2">
            <B2CNavAuth />

            {!isB2BSession && (
              <Button asChild size="sm" className="h-9 rounded-full px-4">
                <Link href="/B2B">Become a Partner</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Mobile actions */}
        <div className="flex items-center gap-1 lg:hidden">
          <div className="relative" ref={notificationsRef}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 rounded-full"
              onClick={() => {
                if (!isAuthenticated) {
                  openAuthDialog()
                  return
                }
                setNotificationsOpen((v) => !v)
              }}
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Button>
            {notificationsOpen && NotificationsDropdown}
          </div>

          <B2CNavAuth />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile slide-down menu */}
      {mobileMenuOpen && (
        <div className="animate-in slide-in-from-top-2 fade-in duration-200 border-t bg-white px-4 pb-4 pt-2 sm:px-10 lg:hidden">
          <nav className="grid gap-1">
            <Link
              href="/B2C/products"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-slate-50"
            >
              Browse Products
            </Link>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false)
                if (isAuthenticated) {
                  router.push("/B2C/profile/favorites")
                } else {
                  openAuthDialog()
                }
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-slate-50"
            >
              <Heart className="h-4 w-4 text-muted-foreground" />
              Favorites
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false)
                if (isAuthenticated) {
                  router.push("/B2C/profile/alerts")
                } else {
                  openAuthDialog()
                }
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-slate-50"
            >
              <BellRing className="h-4 w-4 text-muted-foreground" />
              My Alerts
            </button>
            {isB2BSession ? (
              <Link
                href="/B2B/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-slate-50"
              >
                B2B Dashboard
              </Link>
            ) : (
              <Link
                href="/B2B"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-slate-50"
              >
                Become a Partner
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
