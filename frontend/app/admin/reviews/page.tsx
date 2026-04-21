import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard"
import ReviewsDataTable from "@/components/admin/reviews-data-table"

export default function ReviewsPage() {
  return (
    <section className="w-full max-w-none space-y-4">
      <h1 className="text-2xl font-bold">Reviews Moderation</h1>
      <p className="text-sm text-muted-foreground">
        Moderate incoming customer reviews and enforce anti-fake policies.
      </p>
      <AnalyticsDashboard />
      <ReviewsDataTable />
    </section>
  )
}
