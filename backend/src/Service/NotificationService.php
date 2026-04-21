<?php

namespace App\Service;

use App\Entity\User;

final class NotificationService
{
    /**
     * Build a review moderation notification payload.
     */
    public function buildReviewModerationMessage(User $customer, string $status, ?string $note = null): array
    {
        $subject = sprintf('Your review has been %s', strtolower($status));
        $message = sprintf('Your product review has been reviewed and %s.', strtolower($status));

        if ($note) {
            $message .= sprintf(' Note from admin: %s', $note);
        }

        return [
            'recipient_id' => $customer->getId(),
            'subject' => $subject,
            'message' => $message,
        ];
    }

    /**
     * Build a scraping failure notification payload.
     */
    public function buildScrapingFailureMessage(User $admin, string $sourceName, string $errorMessage): array
    {
        return [
            'recipient_id' => $admin->getId(),
            'subject' => sprintf('Scraping failed: %s', $sourceName),
            'message' => sprintf("Data source '%s' failed: %s", $sourceName, $errorMessage),
        ];
    }
}
