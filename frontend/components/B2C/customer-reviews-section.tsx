"use client"

import { useEffect, useMemo, useState } from "react"
import { Star } from "lucide-react"

<<<<<<< HEAD
=======
import { useApiUrl } from "@/lib/use-api-url"
import { useI18n } from "@/lib/i18n-context"
>>>>>>> 22ec7a01fddf8580f93bdad12bc6d92e41d4420e
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

type ReviewItem = {
  id: number
  rating: number
  comment: string | null
  created_at: string | null
  client: {
    id: number | null
    name: string
  }
}

type RatingBucket = {
  rating: number
  count: number
}

type ReviewsResponse = {
  summary: {
    average_rating: number
    total_reviews: number
    rating_distribution: RatingBucket[]
  }
  items: ReviewItem[]
}

type Props = {
  productId: number
  isAuthenticated: boolean
}

<<<<<<< HEAD
function formatRelativeDate(value: string | null): string {
=======
function formatRelativeDate(value: string | null, t?: (key: string) => string): string {
>>>>>>> 22ec7a01fddf8580f93bdad12bc6d92e41d4420e
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ""
  }

<<<<<<< HEAD
  const diffMs = Date.now() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return "today"
  if (diffDays === 1) return "1 day ago"
  if (diffDays < 30) return `${diffDays} days ago`

  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths <= 1) return "1 month ago"
  if (diffMonths < 12) return `${diffMonths} months ago`

  const diffYears = Math.floor(diffMonths / 12)
  return diffYears === 1 ? "1 year ago" : `${diffYears} years ago`
=======
  const L = t ?? ((s: string) => s)
  const diffMs = Date.now() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return L("review.today")
  if (diffDays === 1) return L("review.day_ago")
  if (diffDays < 30) return L("review.days_ago").replace("{n}", String(diffDays))

  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths <= 1) return L("review.month_ago")
  if (diffMonths < 12) return L("review.months_ago").replace("{n}", String(diffMonths))

  const diffYears = Math.floor(diffMonths / 12)
  if (diffYears === 1) return L("review.year_ago")
  return L("review.years_ago").replace("{n}", String(diffYears))
>>>>>>> 22ec7a01fddf8580f93bdad12bc6d92e41d4420e
}

function renderStars(rating: number, className = "h-4 w-4") {
  return Array.from({ length: 5 }, (_, index) => {
    const filled = index < rating
    return (
      <Star
        key={`star-${index}`}
        className={`${className} ${filled ? "fill-orange-400 text-orange-400" : "text-muted-foreground/40"}`}
      />
    )
  })
}

export function CustomerReviewsSection({ productId, isAuthenticated }: Props) {
<<<<<<< HEAD
=======
  const apiUrl = useApiUrl()
  const { t } = useI18n()
>>>>>>> 22ec7a01fddf8580f93bdad12bc6d92e41d4420e
  const [data, setData] = useState<ReviewsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)

  async function loadReviews() {
    setLoading(true)
    setError(null)

    try {
<<<<<<< HEAD
      const response = await fetch(`/api/b2c/reviews?productId=${productId}&limit=20&offset=0`, {
=======
      const response = await fetch(apiUrl(`/api/b2c/reviews?productId=${productId}&limit=20&offset=0`), {
>>>>>>> 22ec7a01fddf8580f93bdad12bc6d92e41d4420e
        cache: "no-store",
      })

      const payload = (await response.json().catch(() => ({}))) as ReviewsResponse & { error?: string }
      if (!response.ok) {
<<<<<<< HEAD
        throw new Error(payload.error || "Failed to load reviews.")
=======
        throw new Error(payload.error || t("review.failed_load"))
>>>>>>> 22ec7a01fddf8580f93bdad12bc6d92e41d4420e
      }

      setData(payload)
    } catch (err) {
<<<<<<< HEAD
      setError(err instanceof Error ? err.message : "Failed to load reviews.")
=======
      setError(err instanceof Error ? err.message : t("review.failed_load"))
>>>>>>> 22ec7a01fddf8580f93bdad12bc6d92e41d4420e
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadReviews()
  }, [productId])

  const distribution = useMemo(() => {
    const base = new Map<number, number>([
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
      [5, 0],
    ])

    for (const bucket of data?.summary.rating_distribution ?? []) {
      base.set(bucket.rating, bucket.count)
    }

    return [5, 4, 3, 2, 1].map((star) => ({
      rating: star,
      count: base.get(star) ?? 0,
    }))
  }, [data])

  const totalReviews = data?.summary.total_reviews ?? 0
  const averageRating = data?.summary.average_rating ?? 0

  async function handleSubmitReview() {
    if (!isAuthenticated) {
<<<<<<< HEAD
      setSubmitMessage("Please sign in first to submit a review.")
=======
      setSubmitMessage(t("review.sign_in_required"))
>>>>>>> 22ec7a01fddf8580f93bdad12bc6d92e41d4420e
      return
    }

    setSubmitting(true)
    setSubmitMessage(null)

    try {
      const response = await fetch("/api/b2c/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          rating,
          comment: comment.trim() || null,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        message?: string
      }

      if (!response.ok) {
<<<<<<< HEAD
        throw new Error(payload.error || "Failed to submit review.")
=======
        throw new Error(payload.error || t("review.failed_submit"))
>>>>>>> 22ec7a01fddf8580f93bdad12bc6d92e41d4420e
      }

      setComment("")
      setRating(5)
      setFormOpen(false)
<<<<<<< HEAD
      setSubmitMessage(payload.message || "Review submitted and pending approval.")
    } catch (err) {
      setSubmitMessage(err instanceof Error ? err.message : "Failed to submit review.")
=======
      setSubmitMessage(payload.message || t("review.pending_approval"))
    } catch (err) {
      setSubmitMessage(err instanceof Error ? err.message : t("review.failed_submit"))
>>>>>>> 22ec7a01fddf8580f93bdad12bc6d92e41d4420e
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="rounded-xl border-border/70">
      <CardHeader className="space-y-1">
<<<<<<< HEAD
        <CardTitle className="text-2xl">Customer Reviews</CardTitle>
        <p className="text-sm text-muted-foreground">See what customers are saying about this product</p>
=======
        <CardTitle className="text-2xl">{t("review.title")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("review.subtitle")}</p>
>>>>>>> 22ec7a01fddf8580f93bdad12bc6d92e41d4420e
      </CardHeader>

      <CardContent className="space-y-6">
        {loading ? (
<<<<<<< HEAD
          <div className="text-sm text-muted-foreground">Loading reviews...</div>
=======
          <div className="text-sm text-muted-foreground">{t("review.loading")}</div>
>>>>>>> 22ec7a01fddf8580f93bdad12bc6d92e41d4420e
        ) : error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
            <div className="rounded-lg border bg-muted/10 p-4 text-center">
              <p className="text-5xl font-semibold">{averageRating.toFixed(1)}</p>
              <div className="mt-2 flex items-center justify-center gap-1">{renderStars(Math.round(averageRating), "h-5 w-5")}</div>
<<<<<<< HEAD
              <p className="mt-2 text-sm text-muted-foreground">Based on {totalReviews} reviews</p>
=======
              <p className="mt-2 text-sm text-muted-foreground">{t("review.based_on", { total: totalReviews })}</p>
>>>>>>> 22ec7a01fddf8580f93bdad12bc6d92e41d4420e
            </div>

            <div className="space-y-3">
              {distribution.map((bucket) => {
                const percent = totalReviews > 0 ? (bucket.count / totalReviews) * 100 : 0
                return (
                  <div key={bucket.rating} className="grid grid-cols-[36px_1fr_24px] items-center gap-3 text-sm">
                    <span className="font-medium">{bucket.rating} ★</span>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-orange-400" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="text-right text-muted-foreground">{bucket.count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Button type="button" variant="secondary" onClick={() => setFormOpen((prev) => !prev)}>
<<<<<<< HEAD
            {formOpen ? "Cancel" : "Write a Review"}
=======
            {formOpen ? t("general.cancel") : t("review.write")}
>>>>>>> 22ec7a01fddf8580f93bdad12bc6d92e41d4420e
          </Button>

          {formOpen ? (
            <div className="space-y-4 rounded-lg border p-4">
              <div>
<<<<<<< HEAD
                <p className="mb-2 text-sm font-medium">Your rating</p>
=======
                <p className="mb-2 text-sm font-medium">{t("review.your_rating")}</p>
>>>>>>> 22ec7a01fddf8580f93bdad12bc6d92e41d4420e
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, index) => {
                    const star = index + 1
                    return (
                      <button
                        key={star}
                        type="button"
                        aria-label={`Set rating to ${star}`}
                        onClick={() => setRating(star)}
                        className="inline-flex"
                      >
                        <Star
                          className={`h-5 w-5 ${star <= rating ? "fill-orange-400 text-orange-400" : "text-muted-foreground/40"}`}
                        />
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
<<<<<<< HEAD
                <p className="mb-2 text-sm font-medium">Comment</p>
=======
                <p className="mb-2 text-sm font-medium">{t("review.comment")}</p>
>>>>>>> 22ec7a01fddf8580f93bdad12bc6d92e41d4420e
                <Textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={4}
<<<<<<< HEAD
                  placeholder="Share your experience with this product"
=======
                  placeholder={t("review.comment_placeholder")}
>>>>>>> 22ec7a01fddf8580f93bdad12bc6d92e41d4420e
                />
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" onClick={handleSubmitReview} disabled={submitting || !isAuthenticated}>
<<<<<<< HEAD
                  {submitting ? "Submitting..." : "Submit review"}
                </Button>
                {!isAuthenticated ? (
                  <Badge variant="outline">Sign in required</Badge>
=======
                  {submitting ? t("review.submitting") : t("review.submit")}
                </Button>
                {!isAuthenticated ? (
                  <Badge variant="outline">{t("review.sign_in_required")}</Badge>
>>>>>>> 22ec7a01fddf8580f93bdad12bc6d92e41d4420e
                ) : null}
              </div>

              <p className="text-xs text-muted-foreground">
<<<<<<< HEAD
                Your review will be published after admin approval.
=======
                {t("review.approval_notice")}
>>>>>>> 22ec7a01fddf8580f93bdad12bc6d92e41d4420e
              </p>
            </div>
          ) : null}

          {submitMessage ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {submitMessage}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
<<<<<<< HEAD
          <h3 className="text-xl font-semibold">All Reviews</h3>

          {(data?.items ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No approved reviews yet.</p>
=======
          <h3 className="text-xl font-semibold">{t("review.all")}</h3>

          {(data?.items ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("review.no_approved")}</p>
>>>>>>> 22ec7a01fddf8580f93bdad12bc6d92e41d4420e
          ) : (
            <div className="space-y-4">
              {(data?.items ?? []).map((review) => {
                const initials = review.client.name.slice(0, 2).toUpperCase()
<<<<<<< HEAD
                const dateLabel = formatRelativeDate(review.created_at)
=======
                const dateLabel = formatRelativeDate(review.created_at, t)
>>>>>>> 22ec7a01fddf8580f93bdad12bc6d92e41d4420e

                return (
                  <div key={review.id} className="border-t pt-4 first:border-t-0 first:pt-0">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9 border">
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium capitalize">{review.client.name.replace(/[._-]+/g, " ")}</p>
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
<<<<<<< HEAD
                            verified purchase
=======
                            {t("review.verified_purchase")}
>>>>>>> 22ec7a01fddf8580f93bdad12bc6d92e41d4420e
                          </Badge>
                          {dateLabel ? <span className="text-xs text-muted-foreground">{dateLabel}</span> : null}
                        </div>

                        <div className="flex items-center gap-1">{renderStars(review.rating)}</div>

                        {review.comment ? (
                          <p className="text-sm leading-6 text-muted-foreground">{review.comment}</p>
                        ) : (
<<<<<<< HEAD
                          <p className="text-sm text-muted-foreground">No comment provided.</p>
=======
                          <p className="text-sm text-muted-foreground">{t("review.no_comment")}</p>
>>>>>>> 22ec7a01fddf8580f93bdad12bc6d92e41d4420e
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
