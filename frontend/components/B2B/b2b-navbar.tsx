"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"
import { Building2, Star } from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

const PAGE_TITLES: Record<string, string> = {
  "/B2B/dashboard": "Overview",
  "/B2B/dashboard/listings": "My Listings",
  "/B2B/dashboard/competitor-pricing": "Competitor Pricing",
  "/B2B/dashboard/stock-monitoring": "Stock Monitoring",
  "/B2B/dashboard/alerts": "Alerts & Notifications",
  "/B2B/dashboard/reports": "Reports",
  "/B2B/dashboard/ads-requests": "Ads Requests",
  "/B2B/dashboard/scraping-requests": "Scraping Requests",
  "/B2B/dashboard/settings": "Settings",
  "/B2B/dashboard/share-of-shelf": "Share of Shelf",
  "/B2B/dashboard/price-dispersion": "Price Dispersion",
  "/B2B/dashboard/competitors": "Competitor Ranking",
  "/B2B/dashboard/stock-intelligence": "Stock Intelligence",
  "/B2B/dashboard/reviews-sentiment": "Reviews & Sentiment",
  "/B2B/dashboard/demand-intelligence": "Demand Intelligence",
}

function B2BNavbar() {
  const pathname = usePathname()
  const { summary, planType, isGold, mode } = useB2B()

  const pageTitle = useMemo(() => {
    return PAGE_TITLES[pathname] ?? pathname.split("/").filter(Boolean).at(-1)?.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) ?? "B2B"
  }, [pathname])

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
              {mode === "market" ? "Market Intelligence" : "Seller Intelligence"} • {summary?.user?.company_name ?? "Workspace"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {planType && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
            isGold
              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          }`}>
            <Star className="size-2.5" />
            {planType} plan
          </span>
        )}
      </div>
    </header>
  )
}

export default B2BNavbar