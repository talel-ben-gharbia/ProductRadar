<?php

namespace App\Service;

use App\Entity\ProductListing;

/**
 * Trust Score Explanation Engine.
 *
 * Standardizes trust score breakdown into versioned components.
 * Allows transparent scoring and enables consistent evolution over time.
 *
 * CRITICAL: All breakdowns must follow this schema version.
 * When changing weights, must increment schema_version.
 */
final class TrustScoreExplainer
{
    // Schema version enables safe migrations when changing trust formula
    private const SCHEMA_VERSION = 1;

    /**
     * Generates standardized trust score breakdown.
     *
     * Returns:
     * {
     *   "schema_version": 1,
     *   "total_score": 87.5,
     *   "components": {
     *     "price_stability": {
     *       "score": 85,
     *       "weight": 0.20,
     *       "description": "Price changes infrequent",
     *       "evidence": "1 price change in 90 days"
     *     },
     *     "seller_reliability": {
     *       "score": 92,
     *       "weight": 0.25,
     *       "description": "High seller rating",
     *       "evidence": "4.8★ from 500 reviews"
     *     },
     *     "stock_consistency": {
     *       "score": 88,
     *       "weight": 0.20,
     *       "description": "Stock reliably available",
     *       "evidence": "In stock 95% of observations"
     *     },
     *     "data_freshness": {
     *       "score": 90,
     *       "weight": 0.15,
     *       "description": "Data updated recently",
     *       "evidence": "Updated 2 hours ago"
     *     },
     *     "anomaly_penalty": {
     *       "score": 75,
     *       "weight": 0.20,
     *       "description": "Anomalies detected",
     *       "evidence": "Price drop 30% detected"
     *     }
     *   },
     *   "calculation": "85*0.20 + 92*0.25 + 88*0.20 + 90*0.15 + 75*0.20 = 87.5"
     * }
     */
    public function generateBreakdown(ProductListing $listing): array
    {
        $priceStability = $this->scorePriceStability($listing);
        $sellerReliability = $this->scoreSellerReliability($listing);
        $stockConsistency = $this->scoreStockConsistency($listing);
        $dataFreshness = $this->scoreDataFreshness($listing);
        $anomalyPenalty = $this->scoreAnomalyPenalty($listing);

        // Calculate weighted total
        $weights = [
            'price_stability' => 0.20,
            'seller_reliability' => 0.25,
            'stock_consistency' => 0.20,
            'data_freshness' => 0.15,
            'anomaly_penalty' => 0.20,
        ];

        $totalScore = round(
            ($priceStability['score'] * $weights['price_stability']) +
            ($sellerReliability['score'] * $weights['seller_reliability']) +
            ($stockConsistency['score'] * $weights['stock_consistency']) +
            ($dataFreshness['score'] * $weights['data_freshness']) +
            ($anomalyPenalty['score'] * $weights['anomaly_penalty']),
            2
        );

        return [
            'schema_version' => self::SCHEMA_VERSION,
            'total_score' => $totalScore,
            'timestamp' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
            'components' => [
                'price_stability' => array_merge($priceStability, ['weight' => $weights['price_stability']]),
                'seller_reliability' => array_merge($sellerReliability, ['weight' => $weights['seller_reliability']]),
                'stock_consistency' => array_merge($stockConsistency, ['weight' => $weights['stock_consistency']]),
                'data_freshness' => array_merge($dataFreshness, ['weight' => $weights['data_freshness']]),
                'anomaly_penalty' => array_merge($anomalyPenalty, ['weight' => $weights['anomaly_penalty']]),
            ],
            'weights' => $weights,
        ];
    }

    /**
     * Migrates trust breakdown from previous schema version.
     * Called when loading old breakdowns with SCHEMA_VERSION < current.
     */
    public function migrateBreakdown(array $oldBreakdown, int $fromVersion, int $toVersion): array
    {
        if ($fromVersion === $toVersion) {
            return $oldBreakdown;
        }

        if ($fromVersion === 0 && $toVersion === 1) {
            // Migration example: v0 had no 'description' field
            foreach ($oldBreakdown['components'] as $key => &$component) {
                if (!isset($component['description'])) {
                    $component['description'] = $this->generateDescription($key, $component['score']);
                }
            }
            $oldBreakdown['schema_version'] = 1;

            return $oldBreakdown;
        }

        return $oldBreakdown;
    }

    /**
     * Explains why score changed (for audit trail).
     * Compares old vs new breakdown and describes deltas.
     */
    public function explainScoreChange(array $oldBreakdown, array $newBreakdown): array
    {
        $oldScore = $oldBreakdown['total_score'];
        $newScore = $newBreakdown['total_score'];
        $delta = $newScore - $oldScore;

        $componentChanges = [];
        foreach ($newBreakdown['components'] as $key => $newComponent) {
            $oldComponent = $oldBreakdown['components'][$key] ?? null;
            if ($oldComponent === null) {
                continue;
            }

            $componentDelta = $newComponent['score'] - $oldComponent['score'];
            if (abs($componentDelta) > 0.1) {
                $componentChanges[] = [
                    'component' => $key,
                    'old_score' => $oldComponent['score'],
                    'new_score' => $newComponent['score'],
                    'delta' => round($componentDelta, 2),
                    'direction' => $componentDelta > 0 ? 'IMPROVED' : 'DECLINED',
                    'old_evidence' => $oldComponent['evidence'] ?? null,
                    'new_evidence' => $newComponent['evidence'] ?? null,
                ];
            }
        }

        usort($componentChanges, fn ($a, $b) => abs($b['delta']) <=> abs($a['delta']));

        return [
            'overall_change' => [
                'old_score' => $oldScore,
                'new_score' => $newScore,
                'delta' => round($delta, 2),
                'direction' => $delta > 0 ? 'IMPROVED' : 'DECLINED',
            ],
            'component_changes' => $componentChanges,
            'primary_driver' => $componentChanges[0] ?? null,
        ];
    }

    private function scorePriceStability(ProductListing $listing): array
    {
        $priceHistoryCount = $listing->getPriceHistoryCount() ?? 0;

        // Score based on frequency of price changes in last 90 days
        if ($priceHistoryCount === 0) {
            return [
                'score' => 95,
                'description' => 'Extremely stable',
                'evidence' => 'No price changes recorded',
            ];
        }

        if ($priceHistoryCount <= 2) {
            return [
                'score' => 85,
                'description' => 'Price changes infrequent',
                'evidence' => "{$priceHistoryCount} price changes in 90 days",
            ];
        }

        if ($priceHistoryCount <= 5) {
            return [
                'score' => 70,
                'description' => 'Occasional price adjustments',
                'evidence' => "{$priceHistoryCount} price changes in 90 days",
            ];
        }

        return [
            'score' => 55,
            'description' => 'Frequent price changes',
            'evidence' => "{$priceHistoryCount}+ price changes in 90 days",
        ];
    }

    private function scoreSellerReliability(ProductListing $listing): array
    {
        // Simplified: would integrate with seller rating system
        // For now, use trust score as proxy (0-100)
        $sellerTrust = $listing->getSellerTrust() ?? 0;

        if ($sellerTrust >= 4.5) {
            return [
                'score' => 95,
                'description' => 'Highly rated seller',
                'evidence' => number_format($sellerTrust, 1) . '★',
            ];
        }

        if ($sellerTrust >= 4.0) {
            return [
                'score' => 85,
                'description' => 'Good seller reputation',
                'evidence' => number_format($sellerTrust, 1) . '★',
            ];
        }

        if ($sellerTrust >= 3.5) {
            return [
                'score' => 70,
                'description' => 'Average seller reputation',
                'evidence' => number_format($sellerTrust, 1) . '★',
            ];
        }

        return [
            'score' => 50,
            'description' => 'Below average reputation',
            'evidence' => number_format($sellerTrust, 1) . '★',
        ];
    }

    private function scoreStockConsistency(ProductListing $listing): array
    {
        $isInStock = $listing->getIsInStock() ?? false;
        $stockObservationCount = $listing->getStockObservationCount() ?? 0;

        if (!$isInStock) {
            return [
                'score' => 40,
                'description' => 'Currently out of stock',
                'evidence' => 'Last observed: out of stock',
            ];
        }

        if ($stockObservationCount === 0) {
            return [
                'score' => 60,
                'description' => 'No stock history',
                'evidence' => 'Insufficient observations',
            ];
        }

        $inStockPercentage = $listing->getInStockPercentage() ?? 0.5;

        if ($inStockPercentage >= 0.95) {
            return [
                'score' => 95,
                'description' => 'Stock reliably available',
                    'evidence' => 'In stock ' . round($inStockPercentage * 100, 1) . '% of observations',
            ];
        }

        if ($inStockPercentage >= 0.80) {
            return [
                'score' => 80,
                'description' => 'Usually in stock',
                    'evidence' => 'In stock ' . round($inStockPercentage * 100, 1) . '% of observations',
            ];
        }

        return [
            'score' => 65,
            'description' => 'Frequent stockouts',
                'evidence' => 'In stock ' . round($inStockPercentage * 100, 1) . '% of observations',
        ];
    }

    private function scoreDataFreshness(ProductListing $listing): array
    {
        $updatedAt = $listing->getUpdatedAt();
        if ($updatedAt === null) {
            return [
                'score' => 50,
                'description' => 'Data age unknown',
                'evidence' => 'No update timestamp',
            ];
        }

        $now = new \DateTimeImmutable();
        $hoursOld = (int) (($now->getTimestamp() - $updatedAt->getTimestamp()) / 3600);

        if ($hoursOld < 1) {
            return [
                'score' => 100,
                'description' => 'Data updated recently',
                'evidence' => "Updated {$hoursOld} hours ago",
            ];
        }

        if ($hoursOld < 24) {
            return [
                'score' => 90,
                'description' => 'Fresh data',
                'evidence' => "Updated {$hoursOld} hours ago",
            ];
        }

        if ($hoursOld < 168) {
            return [
                'score' => 75,
                'description' => 'Recent data',
                'evidence' => "Updated " . ceil($hoursOld / 24) . " days ago",
            ];
        }

        if ($hoursOld < 720) {
            return [
                'score' => 55,
                'description' => 'Aging data',
                'evidence' => "Updated " . ceil($hoursOld / 24) . " days ago",
            ];
        }

        return [
            'score' => 30,
            'description' => 'Stale data',
            'evidence' => "Updated " . ceil($hoursOld / 24) . " days ago",
        ];
    }

    private function scoreAnomalyPenalty(ProductListing $listing): array
    {
        $breakdown = $listing->getTrustScoreBreakdown() ?? [];
        $existingPenalty = (float) ($breakdown['components']['anomaly_penalty']['score'] ?? 100);

        // Anomalies reduce score significantly
        if ($existingPenalty <= 50) {
            return [
                'score' => 50,
                'description' => 'Major anomalies detected',
                'evidence' => 'Multiple data inconsistencies',
            ];
        }

        if ($existingPenalty <= 75) {
            return [
                'score' => 75,
                'description' => 'Minor anomalies detected',
                'evidence' => 'Some data inconsistencies',
            ];
        }

        return [
            'score' => 95,
            'description' => 'No anomalies detected',
            'evidence' => 'Data consistent',
        ];
    }

    private function generateDescription(string $component, float $score): string
    {
        return match ($component) {
            'price_stability' => match (true) {
                $score >= 85 => 'Price changes infrequent',
                $score >= 70 => 'Occasional price adjustments',
                default => 'Frequent price changes',
            },
            'seller_reliability' => match (true) {
                $score >= 85 => 'Good seller reputation',
                $score >= 70 => 'Average seller reputation',
                default => 'Below average reputation',
            },
            default => 'Score component',
        };
    }
}
