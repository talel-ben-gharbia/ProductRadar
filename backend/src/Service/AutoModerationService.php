<?php

namespace App\Service;

use App\Entity\Review;

final class AutoModerationService
{
    private const HIGH_RATING_THRESHOLD = 4;
    private const LOW_RATING_THRESHOLD = 2;
    private const MIN_COMMENT_LENGTH = 10;
    private const FLAGGED_KEYWORDS = ['scam', 'fake', 'spam', 'fraud'];

    /**
     * Apply auto-moderation rules to a review and return suggested action
     */
    public function getAutoModerationSuggestion(Review $review): ?array
    {
        if ($review->getRating() >= self::HIGH_RATING_THRESHOLD) {
            return [
                'action' => 'APPROVED',
                'reason' => sprintf('Auto-approved: rating %d >= %d', $review->getRating(), self::HIGH_RATING_THRESHOLD),
            ];
        }

        if ($review->getRating() <= self::LOW_RATING_THRESHOLD) {
            return [
                'action' => 'REJECTED',
                'reason' => sprintf('Auto-rejected: rating %d <= %d', $review->getRating(), self::LOW_RATING_THRESHOLD),
            ];
        }

        $comment = mb_strtolower($review->getComment() ?? '');
        foreach (self::FLAGGED_KEYWORDS as $keyword) {
            if ($comment !== '' && mb_stripos($comment, $keyword) !== false) {
                return [
                    'action' => 'REJECTED',
                    'reason' => 'Auto-rejected: flagged keyword detected',
                ];
            }
        }

        $commentLength = mb_strlen(trim($review->getComment() ?? ''));
        if ($commentLength > 0 && $commentLength < self::MIN_COMMENT_LENGTH) {
            return [
                'action' => 'REJECTED',
                'reason' => sprintf('Auto-rejected: comment too short (%d < %d)', $commentLength, self::MIN_COMMENT_LENGTH),
            ];
        }

        return null;
    }
}
