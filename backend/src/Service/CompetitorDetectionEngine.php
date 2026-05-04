<?php

namespace App\Service;

use App\Entity\ProductListing;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Core competitor detection engine.
 *
 * For every product listing, computes:
 * - Lowest price competitor in category
 * - Most frequent seller competitor
 * - Fastest price drop competitor
 * - Market position index (rank within category by price)
 * - Visibility score (frequency in top 3 prices)
 *
 * THIS IS THE CORE INTELLIGENCE that makes B2B valuable.
 * Replaces manual competitor thinking.
 */
final class CompetitorDetectionEngine
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    /**
     * Analyzes a single product listing against its competitors.
     *
     * Returns comprehensive competitor intelligence:
     * {
     *   "lowest_price_competitor": {
     *     "seller": "CompetitorName",
     *     "price": 99.99,
     *     "gap": 15.50,
     *     "product_id": 123
     *   },
     *   "most_frequent_competitor": {
     *     "seller": "DomBrand",
     *     "frequency": 42,
     *     "avg_price": 105.00
     *   },
     *   "fastest_price_drop": {
     *     "seller": "PriceDumper",
     *     "previous_price": 150.00,
     *     "current_price": 89.99,
     *     "drop_percentage": 40.01
     *   },
     *   "market_position": {
     *     "rank": 3,
     *     "total_competitors": 47,
     *     "percentile": 0.94,
     *     "price_gap_to_cheapest": 15.50,
     *     "price_gap_to_expensive": 45.00
     *   },
     *   "visibility_score": 0.68,
     *   "category_avg_price": 115.00,
     *   "anomaly_risk": "PRICE_DROP_DETECTED|HIGH_ISOLATION|LOW_VISIBILITY|NONE"
     * }
     */
    public function analyzeCompetitors(ProductListing $listing): array
    {
        if ($listing->getCategory() === null) {
            return ['error' => 'Product has no category'];
        }

        // Fetch all competitors: same category, not same seller, active
        $competitors = $this->fetchCompetitors($listing);

        if (empty($competitors)) {
            return ['error' => 'No competitors found in category'];
        }

        return [
            'lowest_price_competitor' => $this->findLowestPriceCompetitor($listing, $competitors),
            'most_frequent_competitor' => $this->findMostFrequentCompetitor($competitors),
            'fastest_price_drop' => $this->findFastestPriceDrop($competitors),
            'market_position' => $this->computeMarketPosition($listing, $competitors),
            'visibility_score' => $this->computeVisibilityScore($listing, $competitors),
            'category_avg_price' => $this->computeCategoryAverage($competitors),
            'anomaly_risk' => $this->detectAnomalies($listing, $competitors),
            'competitor_count' => count($competitors),
        ];
    }

    /**
     * Batch analysis for dashboard.
     * Returns top opportunities and risks for vendor.
     *
     * {
     *   "opportunities": [
     *     {
     *       "type": "UNDERCUT_OPPORTUNITY",
     *       "product": "Smart Watch",
     *       "current_price": 199.99,
     *       "market_min": 149.99,
     *       "estimated_gain": 0.15,
     *       "action": "Lower price to 159.99"
     *     }
     *   ],
     *   "risks": [...]
     * }
     */
    public function generateVendorIntelligence(string $sellerName, string $category = null): array
    {
        $qb = $this->entityManager->createQueryBuilder()
            ->select('pl')
            ->from(ProductListing::class, 'pl')
            ->where('pl.seller = :seller')
            ->setParameter('seller', $sellerName);

        if ($category !== null) {
            $qb->andWhere('pl.category = :category')
                ->setParameter('category', $category);
        }

        $listings = $qb->getQuery()->getResult();

        $opportunities = [];
        $risks = [];

        foreach ($listings as $listing) {
            $analysis = $this->analyzeCompetitors($listing);
            if (isset($analysis['error'])) {
                continue;
            }

            // Detect opportunities
            if (isset($analysis['market_position']['price_gap_to_cheapest'])) {
                $gap = $analysis['market_position']['price_gap_to_cheapest'];
                if ($gap > 10 && $analysis['visibility_score'] < 0.5) {
                    $opportunities[] = [
                        'type' => 'UNDERCUT_OPPORTUNITY',
                        'product_id' => $listing->getId(),
                        'product_name' => $listing->getProductName(),
                        'current_price' => $listing->getPrice(),
                        'market_min' => $analysis['lowest_price_competitor']['price'],
                        'gap' => $gap,
                        'visibility_score' => $analysis['visibility_score'],
                        'action' => 'Lower price to ' . number_format(
                            $analysis['lowest_price_competitor']['price'] + 5,
                            2
                        ),
                    ];
                }
            }

            // Detect risks
            if ($analysis['anomaly_risk'] !== 'NONE') {
                $risks[] = [
                    'type' => $analysis['anomaly_risk'],
                    'product_id' => $listing->getId(),
                    'product_name' => $listing->getProductName(),
                    'severity' => $this->classifyRiskSeverity($analysis['anomaly_risk']),
                    'details' => $analysis,
                ];
            }
        }

        // Sort by impact
        usort($opportunities, fn ($a, $b) => $b['gap'] <=> $a['gap']);
        usort($risks, fn ($a, $b) => $this->riskSeverityValue($b['severity']) <=> $this->riskSeverityValue($a['severity']));

        return [
            'opportunities' => array_slice($opportunities, 0, 5),
            'risks' => array_slice($risks, 0, 5),
            'total_listings_analyzed' => count($listings),
            'opportunities_count' => count($opportunities),
            'risks_count' => count($risks),
        ];
    }

    private function fetchCompetitors(ProductListing $listing): array
    {
        $qb = $this->entityManager->createQueryBuilder()
            ->select('pl')
            ->from(ProductListing::class, 'pl')
            ->where('pl.category = :category')
            ->andWhere('pl.seller != :seller')
            ->andWhere('pl.price IS NOT NULL')
            ->setParameter('category', $listing->getCategory())
            ->setParameter('seller', $listing->getSeller() ?? '');

        return $qb->getQuery()->getResult();
    }

    private function findLowestPriceCompetitor(ProductListing $listing, array $competitors): array
    {
        $lowest = null;
        $lowestPrice = PHP_INT_MAX;

        foreach ($competitors as $competitor) {
            if ($competitor->getPrice() !== null && $competitor->getPrice() < $lowestPrice) {
                $lowestPrice = $competitor->getPrice();
                $lowest = $competitor;
            }
        }

        if ($lowest === null) {
            return [];
        }

        return [
            'seller' => $lowest->getSeller(),
            'price' => $lowest->getPrice(),
            'gap' => round($listing->getPrice() - $lowest->getPrice(), 2),
            'product_id' => $lowest->getId(),
            'product_name' => $lowest->getProductName(),
        ];
    }

    private function findMostFrequentCompetitor(array $competitors): array
    {
        $sellerFrequency = [];

        foreach ($competitors as $competitor) {
            $seller = $competitor->getSeller() ?? 'Unknown';
            if (!isset($sellerFrequency[$seller])) {
                $sellerFrequency[$seller] = ['count' => 0, 'prices' => [], 'products' => []];
            }
            $sellerFrequency[$seller]['count']++;
            $sellerFrequency[$seller]['prices'][] = $competitor->getPrice();
            $sellerFrequency[$seller]['products'][] = $competitor->getProductName();
        }

        arsort($sellerFrequency);
        $mostFrequent = array_key_first($sellerFrequency);
        $data = $sellerFrequency[$mostFrequent];

        return [
            'seller' => $mostFrequent,
            'frequency' => $data['count'],
            'avg_price' => round(array_sum($data['prices']) / count($data['prices']), 2),
            'sample_products' => array_slice(array_unique($data['products']), 0, 3),
        ];
    }

    private function findFastestPriceDrop(array $competitors): array
    {
        // Simplified: would need price_history table
        // For now, use trust_score_breakdown penalty as proxy
        $fastestDrop = null;
        $maxDrop = 0;

        foreach ($competitors as $competitor) {
            if ($competitor->getPriceHistoryCount() > 0) {
                // Estimate drop from penalty
                $breakdown = $competitor->getTrustScoreBreakdown() ?? [];
                $penalty = (float) ($breakdown['anomaly_penalty'] ?? 0);
                if ($penalty > $maxDrop) {
                    $maxDrop = $penalty;
                    $fastestDrop = $competitor;
                }
            }
        }

        if ($fastestDrop === null) {
            return ['status' => 'No price history available'];
        }

        return [
            'seller' => $fastestDrop->getSeller(),
            'current_price' => $fastestDrop->getPrice(),
            'anomaly_penalty' => $maxDrop,
            'product_name' => $fastestDrop->getProductName(),
        ];
    }

    private function computeMarketPosition(ProductListing $listing, array $competitors): array
    {
        $prices = array_map(fn ($c) => $c->getPrice(), $competitors);
        $prices[] = $listing->getPrice();
        sort($prices);

        $rank = array_search($listing->getPrice(), $prices, true) + 1;
        $total = count($prices);
        $percentile = round(($rank / $total) * 100, 2);

        $minPrice = min($prices);
        $maxPrice = max($prices);

        return [
            'rank' => $rank,
            'total_competitors' => $total - 1,
            'percentile' => $percentile,
            'price_gap_to_cheapest' => round($listing->getPrice() - $minPrice, 2),
            'price_gap_to_expensive' => round($maxPrice - $listing->getPrice(), 2),
            'position_description' => $this->describePosition($percentile),
        ];
    }

    private function computeVisibilityScore(ProductListing $listing, array $competitors): float
    {
        $topThreePrices = [];
        foreach ($competitors as $competitor) {
            $topThreePrices[] = $competitor->getPrice();
        }
        sort($topThreePrices);
        $topThreePrices = array_slice($topThreePrices, 0, 3);

        $isInTopThree = in_array($listing->getPrice(), $topThreePrices);

        return $isInTopThree ? 0.85 : (0.5 - (count($competitors) / 100));
    }

    private function computeCategoryAverage(array $competitors): float
    {
        if (empty($competitors)) {
            return 0;
        }

        $prices = array_map(fn ($c) => $c->getPrice(), $competitors);
        return round(array_sum($prices) / count($prices), 2);
    }

    private function detectAnomalies(ProductListing $listing, array $competitors): string
    {
        $prices = array_map(fn ($c) => $c->getPrice(), $competitors);
        $avgPrice = array_sum($prices) / count($prices);
        $stdDev = $this->calculateStdDev($prices, $avgPrice);

        // Detect price drop
        $breakdown = $listing->getTrustScoreBreakdown() ?? [];
        $anomalyPenalty = (float) ($breakdown['anomaly_penalty'] ?? 0);
        if ($anomalyPenalty > 10) {
            return 'PRICE_DROP_DETECTED';
        }

        // Detect isolation (price too far from average)
        if (abs($listing->getPrice() - $avgPrice) > 2 * $stdDev) {
            return 'HIGH_ISOLATION';
        }

        // Detect low visibility
        if ($this->computeVisibilityScore($listing, $competitors) < 0.3) {
            return 'LOW_VISIBILITY';
        }

        return 'NONE';
    }

    private function classifyRiskSeverity(string $risk): string
    {
        return match ($risk) {
            'PRICE_DROP_DETECTED' => 'HIGH',
            'HIGH_ISOLATION' => 'MEDIUM',
            'LOW_VISIBILITY' => 'MEDIUM',
            default => 'LOW',
        };
    }

    private function riskSeverityValue(string $severity): int
    {
        return match ($severity) {
            'HIGH' => 3,
            'MEDIUM' => 2,
            'LOW' => 1,
            default => 0,
        };
    }

    private function describePosition(float $percentile): string
    {
        if ($percentile < 25) {
            return 'Budget Leader (cheapest)';
        }
        if ($percentile < 50) {
            return 'Competitive Pricing';
        }
        if ($percentile < 75) {
            return 'Premium Positioned';
        }

        return 'Luxury Tier';
    }

    private function calculateStdDev(array $prices, float $mean): float
    {
        $variance = array_reduce(
            $prices,
            fn ($carry, $price) => $carry + pow($price - $mean, 2),
            0
        ) / count($prices);

        return sqrt($variance);
    }
}
