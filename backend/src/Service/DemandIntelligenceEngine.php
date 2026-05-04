<?php

namespace App\Service;

use App\Entity\B2BSearchLog;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Demand Intelligence Engine.
 *
 * Transforms raw search logs into actionable market clusters.
 *
 * Detects:
 * - High demand / no supply (opportunity)
 * - Rising query trends
 * - Demand seasonality
 * - Competitor gaps
 */
final class DemandIntelligenceEngine
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    /**
     * Generates demand intelligence from search logs.
     *
     * Returns:
     * {
     *   "top_opportunities": [
     *     {
     *       "query": "wireless earbuds",
     *       "search_volume": 1250,
     *       "zero_result_count": 180,
     *       "zero_result_rate": 14.4,
     *       "implied_demand": "HIGH",
     *       "risk_level": "HIGH_OPPORTUNITY"
     *     }
     *   ],
     *   "rising_trends": [...],
     *   "market_gaps": [...],
     *   "insights": [...]
     * }
     */
    public function generateMarketIntelligence(int $daysLookback = 90): array
    {
        $searchLogs = $this->fetchSearchLogs($daysLookback);

        if (empty($searchLogs)) {
            return ['error' => 'Insufficient search data'];
        }

        // Aggregate search patterns
        $patterns = $this->aggregateSearchPatterns($searchLogs);

        return [
            'top_opportunities' => $this->identifyOpportunities($patterns),
            'rising_trends' => $this->identifyRisingTrends($patterns),
            'market_gaps' => $this->identifyMarketGaps($patterns),
            'seasonality' => $this->detectSeasonality($patterns),
            'competitor_insights' => $this->deriveCompetitorInsights($patterns),
            'period' => "Last {$daysLookback} days",
            'total_searches' => array_sum(array_map(fn ($p) => $p['volume'], $patterns)),
            'unique_queries' => count($patterns),
        ];
    }

    /**
     * Detects zero-result queries that indicate demand without supply.
     *
     * Returns queries ranked by "unmet demand" score.
     */
    public function identifyOpportunities(array $patterns): array
    {
        $opportunities = [];

        foreach ($patterns as $query => $data) {
            $zeroResultRate = $data['volume'] > 0
                ? ($data['zero_results'] / $data['volume']) * 100
                : 0;

            // Opportunity: >5% zero-result rate AND >100 searches
            if ($zeroResultRate > 5 && $data['volume'] > 100) {
                $opportunities[] = [
                    'query' => $query,
                    'search_volume' => $data['volume'],
                    'zero_result_count' => $data['zero_results'],
                    'zero_result_rate' => round($zeroResultRate, 1),
                    'implied_demand' => $this->classifyDemand($data['volume']),
                    'risk_level' => 'HIGH_OPPORTUNITY',
                    'action' => "Add product or listing for '{$query}'",
                ];
            }
        }

        // Sort by unmet demand (volume * zero_result_rate)
        usort($opportunities, fn ($a, $b) =>
            (($b['search_volume'] * $b['zero_result_rate']) <=>
            ($a['search_volume'] * $a['zero_result_rate']))
        );

        return array_slice($opportunities, 0, 10);
    }

    /**
     * Identifies rising query trends (velocity-based).
     */
    public function identifyRisingTrends(array $patterns): array
    {
        $trends = [];

        foreach ($patterns as $query => $data) {
            if ($data['volume'] < 50) {
                continue; // Skip low-volume trends
            }

            $velocityScore = $this->calculateVelocity($data);
            if ($velocityScore > 0.20) { // 20% week-over-week growth
                $trends[] = [
                    'query' => $query,
                    'search_volume' => $data['volume'],
                    'velocity' => round($velocityScore * 100, 1) . '%',
                    'classification' => $this->classifyTrendMomentum($velocityScore),
                    'implication' => 'Demand is accelerating',
                ];
            }
        }

        usort($trends, fn ($a, $b) => floatval($b['velocity']) <=> floatval($a['velocity']));

        return array_slice($trends, 0, 10);
    }

    /**
     * Identifies market gaps via query clustering.
     * Groups similar queries to spot missing categories.
     */
    public function identifyMarketGaps(array $patterns): array
    {
        $clusters = $this->clusterSimilarQueries($patterns);
        $gaps = [];

        foreach ($clusters as $cluster) {
            $totalVolume = array_sum(array_map(fn ($q) => $patterns[$q]['volume'], $cluster['queries']));
            $totalZeroResults = array_sum(array_map(fn ($q) => $patterns[$q]['zero_results'], $cluster['queries']));

            if ($totalZeroResults / $totalVolume > 0.10) { // >10% zero results
                $gaps[] = [
                    'category' => $cluster['category'],
                    'queries' => array_slice($cluster['queries'], 0, 5),
                    'combined_volume' => $totalVolume,
                    'gap_severity' => round(($totalZeroResults / $totalVolume) * 100, 1) . '%',
                    'recommendation' => "Expand '{$cluster['category']}' category",
                ];
            }
        }

        return array_slice($gaps, 0, 5);
    }

    /**
     * Detects seasonality patterns in demand.
     */
    public function detectSeasonality(array $patterns): array
    {
        // Simplified: would need historical data by week/month
        return [
            'status' => 'Need historical data',
            'recommendation' => 'Track search volume weekly',
        ];
    }

    /**
     * Derives competitor insights from search patterns.
     */
    public function deriveCompetitorInsights(array $patterns): array
    {
        $insights = [];

        foreach ($patterns as $query => $data) {
            // If competitor product name appears in queries
            if (preg_match('/(?:brand|competitor|vs)/i', $query)) {
                $insights[] = [
                    'query' => $query,
                    'volume' => $data['volume'],
                    'insight' => 'Users comparing alternatives',
                    'implication' => 'Competitive positioning opportunity',
                ];
            }
        }

        return array_slice($insights, 0, 5);
    }

    private function fetchSearchLogs(int $daysLookback): array
    {
        $cutoffDate = (new \DateTimeImmutable())->modify("-{$daysLookback} days");

        $qb = $this->entityManager->createQueryBuilder()
            ->select('sl')
            ->from(B2BSearchLog::class, 'sl')
            ->where('sl.created_at >= :cutoff')
            ->setParameter('cutoff', $cutoffDate)
            ->orderBy('sl.created_at', 'DESC');

        return $qb->getQuery()->getResult();
    }

    private function aggregateSearchPatterns(array $searchLogs): array
    {
        $patterns = [];

        foreach ($searchLogs as $log) {
            $query = strtolower(trim($log->getQuery() ?? ''));
            if ($query === '') {
                continue;
            }

            if (!isset($patterns[$query])) {
                $patterns[$query] = [
                    'volume' => 0,
                    'zero_results' => 0,
                    'dates' => [],
                ];
            }

            $patterns[$query]['volume']++;
            if ($log->isZeroResults()) {
                $patterns[$query]['zero_results']++;
            }
            $patterns[$query]['dates'][] = $log->getCreatedAt();
        }

        // Sort by volume
        uasort($patterns, fn ($a, $b) => $b['volume'] <=> $a['volume']);

        return $patterns;
    }

    private function classifyDemand(int $volume): string
    {
        return match (true) {
            $volume > 500 => 'VERY_HIGH',
            $volume > 250 => 'HIGH',
            $volume > 100 => 'MEDIUM',
            default => 'LOW',
        };
    }

    private function classifyTrendMomentum(float $velocity): string
    {
        return match (true) {
            $velocity > 0.50 => 'EXPLOSIVE',
            $velocity > 0.30 => 'STRONG_RISE',
            $velocity > 0.15 => 'MODERATE_RISE',
            default => 'SLIGHT_RISE',
        };
    }

    private function calculateVelocity(array $data): float
    {
        // Simplified: would calculate week-over-week growth
        // For now, return a percentage based on recency
        if (empty($data['dates'])) {
            return 0;
        }

        // Sort dates descending (newest first)
        usort($data['dates'], fn ($a, $b) => $b->getTimestamp() <=> $a->getTimestamp());

        // Count searches in last 7 days vs previous 7 days
        $now = new \DateTimeImmutable();
        $week1Start = $now->modify('-7 days');
        $week2Start = $week1Start->modify('-7 days');

        $week1Count = count(array_filter(
            $data['dates'],
            fn ($d) => $d >= $week1Start
        ));
        $week2Count = count(array_filter(
            $data['dates'],
            fn ($d) => $d >= $week2Start && $d < $week1Start
        ));

        if ($week2Count === 0) {
            return 0;
        }

        return ($week1Count - $week2Count) / $week2Count;
    }

    private function clusterSimilarQueries(array $patterns): array
    {
        $clusters = [];

        foreach (array_keys($patterns) as $query) {
            $category = $this->inferCategory($query);

            if (!isset($clusters[$category])) {
                $clusters[$category] = ['category' => $category, 'queries' => []];
            }

            $clusters[$category]['queries'][] = $query;
        }

        return array_values($clusters);
    }

    private function inferCategory(string $query): string
    {
        // Simple keyword-based categorization
        if (preg_match('/electronics|phone|computer|laptop|tablet/i', $query)) {
            return 'Electronics';
        }
        if (preg_match('/clothing|shirt|pants|dress|jacket/i', $query)) {
            return 'Clothing';
        }
        if (preg_match('/home|furniture|chair|desk|lamp/i', $query)) {
            return 'Home & Garden';
        }
        if (preg_match('/food|drink|coffee|snack|beverage/i', $query)) {
            return 'Food & Beverage';
        }

        return 'Other';
    }
}
