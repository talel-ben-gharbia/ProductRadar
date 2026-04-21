'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { batchModerationReviews } from '@/services/admin/enhanced-reviews';

interface BatchModerationPanelProps {
  selectedReviewIds: number[];
  onSuccess?: () => void;
}

export default function BatchModerationPanel({ selectedReviewIds, onSuccess }: BatchModerationPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [moderationNote, setModerationNote] = useState('');

  const handleBatchAction = async (status: 'APPROVED' | 'REJECTED') => {
    if (selectedReviewIds.length === 0) {
      setError('Please select at least one review');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await batchModerationReviews(
        selectedReviewIds,
        status,
        moderationNote || undefined
      );
      setSuccess(`${result.updated} reviews ${status.toLowerCase()}, ${result.failed} failed`);
      setModerationNote('');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to batch moderate reviews');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Moderation</CardTitle>
        <CardDescription>Moderate multiple reviews at once</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">Selected Reviews: {selectedReviewIds.length}</p>
          <p className="text-xs text-gray-500">IDs: {selectedReviewIds.slice(0, 5).join(', ')}{selectedReviewIds.length > 5 ? '...' : ''}</p>
        </div>

        <div>
          <label className="text-sm font-medium block mb-2">Moderation Note (Optional)</label>
          <textarea
            value={moderationNote}
            onChange={(e) => setModerationNote(e.target.value)}
            placeholder="Add a note explaining the moderation decision..."
            className="w-full p-2 border rounded text-sm"
            rows={3}
            disabled={loading}
          />
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}
        {success && <div className="text-sm text-green-600 bg-green-50 p-3 rounded">{success}</div>}

        <div className="flex gap-2">
          <Button
            onClick={() => handleBatchAction('APPROVED')}
            disabled={loading || selectedReviewIds.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? 'Processing...' : 'Approve All'}
          </Button>
          <Button
            onClick={() => handleBatchAction('REJECTED')}
            disabled={loading || selectedReviewIds.length === 0}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? 'Processing...' : 'Reject All'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
