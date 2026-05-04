"use client"

import Link from "next/link"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type B2BDashboardSummary = {
  user?: {
    company_name?: string | null
    company_market?: string | null
    company_country?: string | null
    company_website?: string | null
    b2b_status?: string | null
    type?: string | null
  }
  subscription?: Record<string, unknown>
  metrics?: {
    mode?: "vendor" | "market"
    products_count?: number
    listings_count?: number
    average_trust_score?: number | null
    in_stock_count?: number
    out_of_stock_count?: number
    notifications_count?: number
    brand_name?: string | null
    competitor_pricing?: Array<Record<string, unknown>>
    stock_monitoring?: Array<Record<string, unknown>>
    opportunities?: Array<Record<string, unknown>>
    top_listings?: Array<Record<string, unknown>>
    share_of_shelf?: Array<Record<string, unknown>>
    price_dispersion?: Array<Record<string, unknown>>
    competitor_ranking?: Array<Record<string, unknown>>
    reputation?: Record<string, unknown>
    demand_intelligence?: Record<string, unknown>
  }
  search_insights?: {
    top_queries?: Record<string, number>
    zero_result_queries?: Record<string, number>
  }
  notifications?: Array<{
    id?: number | null
    type?: string | null
    message?: string | null
    severity?: string | null
    is_read?: boolean | null
    created_at?: string | null
    product_listing_id?: number | null
  }>
}

type Props = {
  summary: B2BDashboardSummary
}

function formatNumber(value: unknown): string {
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)
  }

  return "-"
}

function formatCurrency(value: unknown): string {
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value)
  }

  return "-"
}

export default function B2BDashboard({ summary }: Props) {
  const metrics = summary.metrics
  const mode = metrics?.mode ?? "vendor"
  const chartData =
    mode === "market"
      ? (metrics?.share_of_shelf ?? []).slice(0, 6).map((item) => ({
          name: String(item.category ?? "Category"),
          value: Number(item.share_of_shelf ?? 0),
        }))
      : (metrics?.competitor_pricing ?? []).slice(0, 6).map((item) => ({
          name: String(item.product_name ?? item.product_id ?? "Product"),
          value: Number(item.gap_to_cheapest ?? 0),
        }))

  return (
    <div className="space-y-8" id="overview">
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white">
              {mode === "market" ? "Market Intelligence" : "Seller Intelligence"}
            </Badge>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                {summary.user?.company_name ?? "B2B Workspace"}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {summary.user?.company_market ?? summary.user?.company_country ?? "Live business intelligence workspace"}
              </p>
            </div>
          </div>
          <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2 lg:text-right">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Subscription</p>
              <p className="mt-1 font-medium">{String(summary.subscription?.plan_type ?? summary.subscription?.source ?? "-")}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Account status</p>
              <p className="mt-1 font-medium">{summary.user?.b2b_status ?? "-"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Products", value: metrics?.products_count ?? 0 },
          { label: "Listings", value: metrics?.listings_count ?? 0 },
          { label: "Avg trust score", value: metrics?.average_trust_score ?? null },
          { label: "Notifications", value: metrics?.notifications_count ?? 0 },
        ].map((item) => (
          <Card key={item.label} className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-3xl">{formatNumber(item.value)}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]" id="analytics">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>{mode === "market" ? "Share of Shelf / Dispersion" : "Competitor Pricing"}</CardTitle>
            <CardDescription>Live data from the catalog and listing history.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="#0f172a" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card id="alerts" className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Latest Alerts</CardTitle>
            <CardDescription>Business notifications generated for this workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(summary.notifications ?? []).slice(0, 5).map((notification) => (
              <div key={notification.id ?? notification.created_at} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">{notification.type ?? "Notification"}</p>
                  <Badge variant="outline">{notification.severity ?? "info"}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">{notification.message ?? "-"}</p>
              </div>
            ))}
            {(summary.notifications ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No B2B notifications yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section id="listings" className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Listings</h2>
          <p className="text-sm text-slate-600">Your operational view of prices, stock, and trust.</p>
        </div>
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Seller</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Trust</th>
                  <th className="px-4 py-3">Availability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {(metrics?.top_listings ?? []).slice(0, 12).map((listing) => (
                  <tr key={String(listing.id ?? listing.productId ?? listing.ref)}>
                    <td className="px-4 py-3 font-medium text-slate-900">{String(listing.productName ?? listing.ref ?? "-")}</td>
                    <td className="px-4 py-3 text-slate-600">{String(listing.categoryName ?? "-")}</td>
                    <td className="px-4 py-3 text-slate-600">{String(listing.sellerName ?? "-")}</td>
                    <td className="px-4 py-3 text-slate-600">{formatCurrency(listing.price)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatNumber(listing.trust_score)}</td>
                    <td className="px-4 py-3 text-slate-600">{listing.availability === true ? "In stock" : listing.availability === false ? "Out of stock" : "Unknown"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {mode === "vendor" ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <section id="competitor-pricing" className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-950">Competitor Pricing</h2>
            <div className="space-y-3">
              {(metrics?.competitor_pricing ?? []).slice(0, 6).map((item, index) => (
                <Card key={String(item.product_id ?? index)} className="border-slate-200 shadow-sm">
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <p className="font-medium text-slate-950">{String(item.product_name ?? "Product")}</p>
                      <p className="text-sm text-slate-600">{String(item.competitor_seller_name ?? "Competitor")}</p>
                    </div>
                    <div className="text-right text-sm text-slate-600">
                      <p>Gap: {formatCurrency(item.gap_to_cheapest)}</p>
                      <p>Market avg: {formatCurrency(item.market_average_price)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section id="stock-monitoring" className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-950">Stock Monitoring</h2>
            <div className="space-y-3">
              {(metrics?.stock_monitoring ?? []).slice(0, 6).map((item, index) => (
                <Card key={String(item.product_id ?? index)} className="border-slate-200 shadow-sm">
                  <CardContent className="p-4">
                    <p className="font-medium text-slate-950">{String(item.product_name ?? "Product")}</p>
                    <p className="text-sm text-slate-600">Out-of-stock rate: {formatNumber(item.out_of_stock_rate)}%</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <section id="share-of-shelf" className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-950">Share of Shelf</h2>
            <div className="space-y-3">
              {(metrics?.share_of_shelf ?? []).slice(0, 6).map((item, index) => (
                <Card key={String(item.category ?? index)} className="border-slate-200 shadow-sm">
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <p className="font-medium text-slate-950">{String(item.category ?? "Category")}</p>
                      <p className="text-sm text-slate-600">{formatNumber(item.brand_products)} brand products / {formatNumber(item.total_products)} total</p>
                    </div>
                    <Badge>{formatNumber(item.share_of_shelf)}%</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section id="competitors" className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-950">Competitor Ranking</h2>
            <div className="space-y-3">
              {(metrics?.competitor_ranking ?? []).slice(0, 6).map((item, index) => (
                <Card key={String(item.seller_name ?? index)} className="border-slate-200 shadow-sm">
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <p className="font-medium text-slate-950">#{String(item.rank ?? index + 1)} {String(item.seller_name ?? "Seller")}</p>
                      <p className="text-sm text-slate-600">{formatNumber(item.listing_count)} listings</p>
                    </div>
                    <Badge>{formatNumber(item.market_share_percentage)}%</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      )}

      <section id="requests" className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Ads Requests</CardTitle>
            <CardDescription>
              Request a banner, sponsored product, or sponsored article campaign.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            <Link href="#requests" className="font-medium text-slate-950 underline underline-offset-4">
              Open the request workflow
            </Link>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Scraping Requests</CardTitle>
            <CardDescription>
              Submit a new product or category URL to be tracked by the scraping workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            <Link href="#requests" className="font-medium text-slate-950 underline underline-offset-4">
              Open the scraping request workflow
            </Link>
          </CardContent>
        </Card>
      </section>

      <section id="reports" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">Reports</h2>
        <p className="mt-2 text-sm text-slate-600">
          Report history is pulled from the database and will be expanded with PDF generation workflows.
        </p>
      </section>

      <section id="settings" className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
        <h2 className="text-xl font-semibold">Workspace Settings</h2>
        <p className="mt-2 text-sm text-slate-300">
          Company profile, ownership binding, and subscription controls are managed here.
        </p>
      </section>
    </div>
  )
}
