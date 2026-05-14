export interface ReviewAnalytics {
  analytics: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    approval_rate: number;
    average_rating: number;
  };
  rating_distribution: Array<{ rating: number; count: number }>;
  reviews_per_day: Array<{ date: string; count: number }>;
}

export interface AutoModerationSuggestion {
  review_id: number;
  suggestion?: {
    action: 'APPROVED' | 'REJECTED' | 'PENDING';
    reason: string;
  };
}

export interface SourceHealth {
  source_name: string;
  total_runs: number;
  success_count: number;
  failure_count: number;
  success_rate: number;
  last_status: string;
  consecutive_failures: number;
  avg_duration_ms: number;
  last_errors: Array<{ executed_at: string; error: string }>;
}

import { cachedFetch } from "@/lib/fetch-with-cache"

export async function getReviewAnalytics(): Promise<ReviewAnalytics> {
  return cachedFetch<ReviewAnalytics>('/api/admin/reviews/analytics', {
    cacheKey: 'reviews:analytics',
    cacheTtl: 300,
  });
}

export async function getAutoModerationSuggestion(
  reviewId: number,
): Promise<AutoModerationSuggestion> {
  return cachedFetch<AutoModerationSuggestion>(`/api/admin/reviews/${reviewId}/auto-moderate`, {
    cacheKey: `reviews:auto_moderate:${reviewId}`,
    cacheTtl: 300,
  });
}

export async function batchModerationReviews(
  reviewIds: number[],
  status: 'APPROVED' | 'REJECTED',
  moderationNote?: string,
): Promise<{ message: string; updated: number; failed: number }> {
  const res = await fetch('/api/admin/reviews/batch-status', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ review_ids: reviewIds, status, moderation_note: moderationNote }),
  });
  if (!res.ok) throw new Error('Failed to batch moderate');
  return res.json();
}

export async function getSourceHealth(sourceName: string): Promise<SourceHealth> {
  return cachedFetch<SourceHealth>(
    `/api/admin/scraping-logs/source/${encodeURIComponent(sourceName)}/health`,
    { cacheKey: `scraping_logs:health:${sourceName}`, cacheTtl: 300 },
  );
}
