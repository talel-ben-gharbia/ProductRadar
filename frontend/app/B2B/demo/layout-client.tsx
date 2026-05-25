"use client"

import { useState, type ReactNode, createContext, useContext } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  AlertTriangle, BarChart3, Bell, Building2, ChevronsUpDown, Eye, FileText, Globe, Grid3x3, Home, Layers, LineChart,
  LogOut, Megaphone, MessageSquare, Package, Search, Settings, Shield, ShoppingBag, Star, TrendingUp, User, Zap,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { DEMO_SUMMARY } from "@/lib/demo-data"

type DemoContextValue = {
  companyName: string
  email: string
  planType: string
  isGold: boolean
  mode: "vendor" | "market"
  summary: typeof DEMO_SUMMARY
}

const DemoContext = createContext<DemoContextValue>({
  companyName: "Demo Retail Inc.",
  email: "demo@example.com",
  planType: "Gold",
  isGold: true,
  mode: "vendor",
  summary: DEMO_SUMMARY,
})

export function useDemo() {
  return useContext(DemoContext)
}

type NavItem = {
  href: string
  name: string
  icon: typeof Home
  gold?: boolean
}

const VENDOR_NAV: NavItem[] = [
  { href: "/B2B/demo", name: "Overview", icon: Home },
  { href: "/B2B/demo/listings", name: "My Listings", icon: Package },
  { href: "/B2B/demo/competitor-pricing", name: "Competitor Pricing", icon: TrendingUp, gold: true },
  { href: "/B2B/demo/stock-monitoring", name: "Stock Monitoring", icon: Shield },
  { href: "/B2B/demo/sponsored-products", name: "Sponsored Products", icon: Star },
  { href: "/B2B/demo/comparison", name: "Product Comparison", icon: Eye },
  { href: "/B2B/demo/watchlist", name: "Watchlist", icon: Star },
  { href: "/B2B/demo/alerts", name: "Alerts", icon: Bell },
  { href: "/B2B/demo/reports", name: "Reports", icon: FileText },
  { href: "/B2B/demo/ads-requests", name: "Ads Requests", icon: Megaphone },
  { href: "/B2B/demo/settings", name: "Settings", icon: Settings },
]

const MARKET_NAV: NavItem[] = [
  { href: "/B2B/demo", name: "Overview", icon: Home },
  { href: "/B2B/demo/brand-intelligence", name: "Brand Intelligence", icon: Shield, gold: true },
  { href: "/B2B/demo/product-compare", name: "Product Comparison", icon: ShoppingBag, gold: true },
  { href: "/B2B/demo/share-of-shelf", name: "Share of Shelf", icon: BarChart3, gold: true },
  { href: "/B2B/demo/price-dispersion", name: "Price Dispersion", icon: LineChart, gold: true },
  { href: "/B2B/demo/distribution-coverage", name: "Distribution", icon: Grid3x3 },
  { href: "/B2B/demo/watchlist", name: "Watchlist", icon: Star },
  { href: "/B2B/demo/reviews-sentiment", name: "Reviews & Sentiment", icon: MessageSquare, gold: true },
  { href: "/B2B/demo/alerts", name: "Alerts", icon: Bell },
  { href: "/B2B/demo/reports", name: "Reports", icon: FileText },
  { href: "/B2B/demo/settings", name: "Settings", icon: Settings },
]

function DemoNavbar() {
  const pathname = usePathname()
  const { companyName, planType, isGold, mode } = useDemo()

  const PAGE_TITLES: Record<string, string> = {
    "/B2B/demo": "Overview",
    "/B2B/demo/listings": "My Listings",
    "/B2B/demo/competitor-pricing": "Competitor Pricing",
    "/B2B/demo/stock-monitoring": "Stock Monitoring",
    "/B2B/demo/sponsored-products": "Sponsored Products",
    "/B2B/demo/alerts": "Alerts & Notifications",
    "/B2B/demo/reports": "Reports",
    "/B2B/demo/ads-requests": "Ads Requests",
    "/B2B/demo/settings": "Settings",
    "/B2B/demo/share-of-shelf": "Share of Shelf",
    "/B2B/demo/price-dispersion": "Price Dispersion",


    "/B2B/demo/reviews-sentiment": "Reviews & Sentiment",
  }

  const pageTitle = PAGE_TITLES[pathname] ?? pathname.split("/").filter(Boolean).at(-1)?.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) ?? "Demo"

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <Separator orientation="vertical" className="hidden h-5! sm:block" />
        <div className="hidden items-center gap-2 sm:flex">
          <Avatar size="default" className="bg-primary/10 text-primary after:border-primary/10">
            <AvatarFallback className="bg-transparent text-primary">
              <Building2 className="size-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold tracking-tight">{pageTitle}</p>
            <p className="text-xs text-muted-foreground">
              {mode === "market" ? "Market Intelligence" : "Seller Intelligence"} &bull; {companyName}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          <Star className="size-2.5" />
          {planType} plan
        </span>
      </div>
    </header>
  )
}

function DemoSidebar() {
  const pathname = usePathname()
  const { companyName, email, isGold, mode } = useDemo()
  const [menuOpen, setMenuOpen] = useState(false)

  const navItems = mode === "market" ? MARKET_NAV : VENDOR_NAV

  function isActive(href: string): boolean {
    if (href === "/B2B/demo") return pathname === "/B2B/demo"
    return pathname.startsWith(href)
  }

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="gap-3 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" variant="outline" tooltip="Product Radar B2B demo" className="h-auto gap-3 rounded-xl px-3 py-3">
              <Link href="/B2B/demo" className="items-start gap-3">
                <Avatar size="lg" className="rounded-xl bg-sidebar-primary text-sidebar-primary-foreground after:border-sidebar-primary/20">
                  <AvatarFallback className="rounded-xl bg-transparent text-sidebar-primary-foreground">
                    <Building2 className="size-5" />
                  </AvatarFallback>
                </Avatar>
                <span className="grid flex-1 text-left group-data-[collapsible=icon]:hidden">
                  <span className="text-sm font-semibold leading-none">Product Radar</span>
                  <span className="mt-1 text-xs text-sidebar-foreground/70">Demo workspace</span>
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
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
              <Star className="size-2.5" />
              Gold
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
                  <SidebarMenuButton asChild tooltip={item.name} isActive={active} data-active={active || undefined}>
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.name}</span>
                      {item.gold && !isGold && <Star className="ml-auto size-3 text-amber-500" />}
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
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Real Dashboard">
                <Link href="/B2B/dashboard">
                  <Building2 className="size-4" />
                  <span>Real Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="h-auto gap-3 rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/35 px-3 py-3 transition-all duration-200 hover:bg-sidebar-accent/60">
              <Avatar size="lg" className="rounded-full bg-sidebar-primary text-sidebar-primary-foreground after:border-sidebar-primary/20">
                <AvatarFallback className="bg-transparent text-white">
                  <User className="size-4" />
                </AvatarFallback>
              </Avatar>
              <span className="grid flex-1 text-left group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-medium">{companyName}</span>
                <span className="mt-0.5 truncate text-xs text-sidebar-foreground/70">{email}</span>
              </span>
              <ChevronsUpDown className="size-4 text-sidebar-foreground/60 transition-transform duration-200 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

export default function B2BDemoLayoutClient({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"vendor" | "market">("vendor")
  const companyName = DEMO_SUMMARY.user?.company_name ?? "Demo Retail Inc."
  const email = DEMO_SUMMARY.user?.email ?? "demo@example.com"
  const planType = "Gold"
  const isGold = true

  const toggleMode = () => setMode((m) => (m === "vendor" ? "market" : "vendor"))

  return (
    <DemoContext.Provider value={{ companyName, email, planType, isGold, mode, summary: DEMO_SUMMARY }}>
      <SidebarProvider>
        <div className="flex min-h-svh w-full bg-[#f4f7f9] dark:bg-[#020617] text-slate-900 dark:text-slate-100 selection:bg-indigo-500/30">
          <DemoSidebar />
          <div className="min-w-0 flex-1 flex flex-col relative z-0 overflow-hidden shadow-[-10px_0_30px_rgba(0,0,0,0.05)] dark:shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
            <DemoNavbar />
            <main className="relative flex-1 w-full overflow-y-auto overflow-x-hidden bg-transparent">
              <div className="pointer-events-none fixed inset-0 z-[-1] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] dark:opacity-[0.06] mix-blend-overlay" />
              <div className="pointer-events-none fixed -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-indigo-500/10 blur-[150px] dark:bg-indigo-500/15 animate-pulse-slow" />
              <div className="pointer-events-none fixed top-[40%] -left-[10%] h-[600px] w-[600px] rounded-full bg-violet-500/10 blur-[150px] dark:bg-violet-600/15" />
              <div className="pointer-events-none fixed -bottom-[20%] right-[20%] h-[700px] w-[700px] rounded-full bg-blue-500/5 blur-[150px] dark:bg-blue-500/10" />
              <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
                <div className="mb-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 shadow-sm backdrop-blur-sm"
                  >
                    <Building2 className="size-3" />
                    {mode === "vendor" ? "Vendor Mode" : "Market Mode"}
                    <span className="ml-1 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[9px] text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">toggle</span>
                  </button>
                </div>
                {children}
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </DemoContext.Provider>
  )
}
