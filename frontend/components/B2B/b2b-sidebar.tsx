"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  ChevronsUpDown,
  FileText,
  Globe,
  Home,
  Layers,
  LineChart,
  LogOut,
  Megaphone,
  MessageSquare,
  Package,
  Search,
  Settings,
  Shield,
  Star,
  TrendingUp,
  User,
  Zap,
} from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"

type NavItem = {
  href: string
  name: string
  icon: typeof Home
  gold?: boolean
}

const VENDOR_NAV: NavItem[] = [
  { href: "/B2B/dashboard", name: "Overview", icon: Home },
  { href: "/B2B/dashboard/listings", name: "My Listings", icon: Package },
  { href: "/B2B/dashboard/competitor-pricing", name: "Competitor Pricing", icon: TrendingUp, gold: true },
  { href: "/B2B/dashboard/stock-monitoring", name: "Stock Monitoring", icon: Shield },
  { href: "/B2B/dashboard/alerts", name: "Alerts", icon: Bell },
  { href: "/B2B/dashboard/reports", name: "Reports", icon: FileText },
  { href: "/B2B/dashboard/ads-requests", name: "Ads Requests", icon: Megaphone },
  { href: "/B2B/dashboard/scraping-requests", name: "Scraping Requests", icon: Search },
  { href: "/B2B/dashboard/settings", name: "Settings", icon: Settings },
]

const MARKET_NAV: NavItem[] = [
  { href: "/B2B/dashboard", name: "Overview", icon: Home },
  { href: "/B2B/dashboard/share-of-shelf", name: "Share of Shelf", icon: BarChart3 },
  { href: "/B2B/dashboard/price-dispersion", name: "Price Dispersion", icon: LineChart },
  { href: "/B2B/dashboard/competitors", name: "Competitors", icon: Layers },
  { href: "/B2B/dashboard/stock-intelligence", name: "Stock Intelligence", icon: AlertTriangle, gold: true },
  { href: "/B2B/dashboard/reviews-sentiment", name: "Reviews & Sentiment", icon: MessageSquare, gold: true },
  { href: "/B2B/dashboard/demand-intelligence", name: "Demand Intelligence", icon: Zap, gold: true },
  { href: "/B2B/dashboard/alerts", name: "Alerts", icon: Bell },
  { href: "/B2B/dashboard/reports", name: "Reports", icon: FileText },
  { href: "/B2B/dashboard/scraping-requests", name: "Scraping Requests", icon: Search },
  { href: "/B2B/dashboard/settings", name: "Settings", icon: Settings },
]

function B2BSidebar() {
  const pathname = usePathname()
  const { summary, mode, planType, isGold, logout } = useB2B()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const navItems = mode === "market" ? MARKET_NAV : VENDOR_NAV
  const companyName = summary?.user?.company_name ?? "B2B Workspace"
  const email = summary?.user?.email ?? ""

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [])

  function isActive(href: string): boolean {
    if (href === "/B2B/dashboard") return pathname === "/B2B/dashboard"
    return pathname.startsWith(href)
  }

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="gap-3 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              variant="outline"
              tooltip="Product Radar B2B workspace"
              className="h-auto gap-3 rounded-xl px-3 py-3"
            >
              <Link href="/B2B/dashboard" className="items-start gap-3">
                <Avatar
                  size="lg"
                  className="rounded-xl bg-sidebar-primary text-sidebar-primary-foreground after:border-sidebar-primary/20"
                >
                  <AvatarFallback className="rounded-xl bg-transparent text-sidebar-primary-foreground">
                    <Building2 className="size-5" />
                  </AvatarFallback>
                </Avatar>
                <span className="grid flex-1 text-left group-data-[collapsible=icon]:hidden">
                  <span className="text-sm font-semibold leading-none">Product Radar</span>
                  <span className="mt-1 text-xs text-sidebar-foreground/70">B2B workspace</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="rounded-xl border border-sidebar-border/70 bg-sidebar-accent/40 px-3 py-3 group-data-[collapsible=icon]:hidden">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-sidebar-foreground/55">
            {mode === "market" ? "Market Intelligence" : "Seller Intelligence"}
          </p>
          <p className="mt-2 text-sm font-medium text-sidebar-foreground">{companyName}</p>
          <div className="mt-2 flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              isGold
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}>
              <Star className="size-2.5" />
              {planType ?? "Free"}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup className="px-2 py-1">
          <SidebarGroupLabel className="px-2">Navigation</SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            {navItems.map((item) => {
              const active = isActive(item.href)

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.name}
                    isActive={active}
                    data-active={active || undefined}
                  >
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.name}</span>
                      {item.gold && !isGold && (
                        <Star className="ml-auto size-3 text-amber-500" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator className="mx-2 my-2" />

        <SidebarGroup className="px-2 py-1">
          <SidebarGroupLabel className="px-2">Quick Links</SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Back to homepage">
                <Link href="/">
                  <Globe className="size-4" />
                  <span>Homepage</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="p-2">
        <div className="relative" ref={menuRef}>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="h-auto gap-3 rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/35 px-3 py-3 transition-all duration-200 hover:bg-sidebar-accent/60"
                onClick={() => setMenuOpen((prev) => !prev)}
                data-active={menuOpen || undefined}
              >
                <Avatar size="lg" className="rounded-full bg-sidebar-primary text-sidebar-primary-foreground after:border-sidebar-primary/20">
                  <AvatarFallback className="bg-transparent text-white">
                    <User className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <span className="grid flex-1 text-left group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-sm font-medium">
                    {companyName}
                  </span>
                  <span className="mt-0.5 truncate text-xs text-sidebar-foreground/70">
                    {email || "Business account"}
                  </span>
                </span>
                <ChevronsUpDown
                  className={`size-4 text-sidebar-foreground/60 transition-transform duration-200 group-data-[collapsible=icon]:hidden ${
                    menuOpen ? "rotate-180" : "rotate-0"
                  }`}
                />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <div
            className={`absolute bottom-0 left-full z-50 ml-3 w-72 origin-left rounded-2xl border bg-popover p-1.5 text-popover-foreground shadow-2xl transition-all duration-250 ease-out group-data-[collapsible=icon]:hidden ${
              menuOpen
                ? "pointer-events-auto translate-x-0 scale-100 opacity-100"
                : "pointer-events-none translate-x-2 scale-95 opacity-0"
            }`}
          >
            <div className="flex items-center gap-3 rounded-xl px-3 py-3">
              <Avatar size="lg" className="bg-sidebar-primary text-sidebar-primary-foreground after:border-sidebar-primary/20">
                <AvatarFallback className="bg-transparent text-white">
                  <User className="size-5" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{companyName}</p>
                <p className="truncate text-xs text-muted-foreground">{email || "business@example.com"}</p>
              </div>
            </div>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut className="size-4" />
              Log out
            </button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

export default B2BSidebar