import Link from "next/link"

import { Button } from "@/components/ui/button"

const BULK_ACTIONS = [
  {
    title: "Bulk Product Review",
    description: "Open products and quickly review large sets before edits.",
    href: "/admin/products",
    cta: "Open Products",
  },
  {
    title: "Bulk Listing Review",
    description: "Review listing status and pricing in one place.",
    href: "/admin/product-listings",
    cta: "Open Listings",
  },
  {
    title: "Category Audit",
    description: "Inspect category structure before moving products.",
    href: "/admin/categories",
    cta: "Open Categories",
  },
]

export default function BulkOperationsPage() {
  return (
    <section className="w-full max-w-none space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Bulk Operations</h1>
        <p className="text-sm text-muted-foreground">
          Run high-volume workflows using your existing product, listing, and category pages.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {BULK_ACTIONS.map((action) => (
          <div key={action.title} className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold">{action.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{action.description}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href={action.href}>{action.cta}</Link>
            </Button>
          </div>
        ))}
      </div>
    </section>
  )
}
