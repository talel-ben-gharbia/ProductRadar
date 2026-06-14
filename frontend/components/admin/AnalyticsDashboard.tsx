'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReviewAnalytics, getReviewAnalytics } from '@/services/enhanced-reviews';

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<ReviewAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const data = await getReviewAnalytics();
        setAnalytics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  if (loading) {
    return <div className="p-6">Loading analytics...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">Error: {error}</div>;
  }

  if (!analytics) {
    return <div className="p-6">No analytics available</div>;
  }

  const { analytics: stats, rating_distribution, reviews_per_day } = analytics;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-gray-500">All reviews</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-gray-500">Approved reviews</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-xs text-gray-500">Rejected reviews</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.approval_rate.toFixed(1)}%</div>
            <p className="text-xs text-gray-500">Approval percentage</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Reviews</CardTitle>
          <CardDescription>Reviews awaiting moderation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-amber-600">{stats.pending}</div>
          <p className="text-sm text-gray-500 mt-2">Reviews in PENDING status</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Average Rating</CardTitle>
          <CardDescription>Customer review ratings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.average_rating.toFixed(1)} / 5.0</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rating Distribution</CardTitle>
          <CardDescription>Breakdown by stars</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rating_distribution.map((dist) => (
              <div key={dist.rating} className="flex items-center justify-between">
                <span className="font-medium">{dist.rating} ★</span>
                <div className="flex-1 mx-4 bg-gray-200 rounded h-2">
                  <div
                    className="bg-blue-600 h-2 rounded"
                    style={{
                      width: `${stats.total > 0 ? (dist.count / stats.total) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-sm text-gray-500">{dist.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reviews Per Day (Last 30 Days)</CardTitle>
          <CardDescription>Review submission trend</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {reviews_per_day.map((day) => (
              <div key={day.date} className="flex items-center justify-between">
                <span className="text-sm">{new Date(day.date).toLocaleDateString()}</span>
                <div className="flex-1 mx-4 bg-gray-200 rounded h-2">
                  <div
                    className="bg-green-600 h-2 rounded"
                    style={{
                      width: `${Math.max(5, (day.count / 20) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium">{day.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
