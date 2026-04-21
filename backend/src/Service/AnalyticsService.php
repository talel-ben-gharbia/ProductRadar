<?php

namespace App\Service;

use App\Entity\Review;
use App\Repository\ReviewRepository;
use App\Repository\ScrapingLogRepository;

final class AnalyticsService
{
    public function __construct(
        private ReviewRepository $reviewRepository,
        private ScrapingLogRepository $scrapingLogRepository,
    ) {}

    public function getReviewAnalytics(): array
    {
        return $this->reviewRepository->getAnalytics();
    }

    public function getRatingDistribution(): array
    {
        return $this->reviewRepository->getRatingDistribution();
    }

    public function getReviewsPerDay(int $days = 30): array
    {
        return $this->reviewRepository->getReviewsPerDay($days);
    }

    public function getScrapingHealth(): array
    {
        $allLogs = $this->scrapingLogRepository->findRecent(100);

        if (empty($allLogs)) {
            return [
                'total_runs' => 0,
                'success_rate' => 0,
                'failed_runs' => 0,
                'avg_duration_ms' => 0,
                'sources' => [],
            ];
        }

        $totalRuns = count($allLogs);
        $successCount = count(array_filter($allLogs, fn($log) => $log->getStatus() === 'SUCCESS'));
        $failedRuns = count(array_filter($allLogs, fn($log) => $log->getStatus() !== 'SUCCESS'));

        $avgDuration = 0;
        $durationCount = 0;
        foreach ($allLogs as $log) {
            if ($log->getDurationMs() !== null) {
                $avgDuration += $log->getDurationMs();
                $durationCount++;
            }
        }
        $avgDuration = $durationCount > 0 ? round($avgDuration / $durationCount, 2) : 0;

        $bySource = [];
        foreach ($allLogs as $log) {
            $source = $log->getSourceName();
            if (!isset($bySource[$source])) {
                $bySource[$source] = [
                    'source_name' => $source,
                    'total' => 0,
                    'success' => 0,
                    'failed' => 0,
                    'success_rate' => 0,
                ];
            }
            $bySource[$source]['total']++;
            if ($log->getStatus() === 'SUCCESS') {
                $bySource[$source]['success']++;
            } else {
                $bySource[$source]['failed']++;
            }
        }

        foreach ($bySource as &$source) {
            $source['success_rate'] = $source['total'] > 0 ? round(($source['success'] / $source['total']) * 100, 2) : 0;
        }

        return [
            'total_runs' => $totalRuns,
            'success_rate' => round(($successCount / $totalRuns) * 100, 2),
            'failed_runs' => $failedRuns,
            'avg_duration_ms' => $avgDuration,
            'sources' => array_values($bySource),
        ];
    }
}
