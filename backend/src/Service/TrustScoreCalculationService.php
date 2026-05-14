<?php

namespace App\Service;

use App\Entity\ProductListing;
use App\Repository\PriceHistoryRepository;
use App\Repository\ProductListingRepository;
use Doctrine\DBAL\ArrayParameterType;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;

final class TrustScoreCalculationService
{
    private ?array $cachedWeights = null;

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ProductListingRepository $productListingRepository,
        private readonly PriceHistoryRepository $priceHistoryRepository,
    ) {}

    public function recalculateAllListings(): int
    {
        $conn = $this->entityManager->getConnection();
        $ids = $conn->fetchFirstColumn('SELECT id FROM product_listing WHERE is_active = true');
        return $this->batchRecalculateRaw(array_map('intval', $ids));
    }

    public function recalculateStaleListings(): int
    {
        $conn = $this->entityManager->getConnection();
        $ids = $conn->fetchFirstColumn('
            SELECT pl.id FROM product_listing pl
            WHERE pl.is_active = true
            AND (
                NOT EXISTS (
                    SELECT 1 FROM trust_score_history tsh
                    WHERE tsh.listing_id = pl.id
                )
                OR EXISTS (
                    SELECT 1 FROM price_history ph
                    WHERE ph.product_listing_id = pl.id
                    AND ph.recorded_at > (
                        SELECT COALESCE(MAX(tsh2.created_at), \'1970-01-01\')
                        FROM trust_score_history tsh2
                        WHERE tsh2.listing_id = pl.id
                    )
                )
            )
        ');
        if (empty($ids)) {
            return 0;
        }
        return $this->batchRecalculateRaw(array_map('intval', $ids));
    }

    public function recalculateForSeller(?int $sellerId): int
    {
        if ($sellerId === null) {
            return 0;
        }
        $conn = $this->entityManager->getConnection();
        $ids = $conn->fetchFirstColumn(
            'SELECT id FROM product_listing WHERE seller_id = ? AND is_active = true',
            [$sellerId]
        );
        return $this->batchRecalculateRaw(array_map('intval', $ids));
    }

    public function calculateAndUpdateListing(ProductListing $listing): array
    {
        $weights = $this->loadWeights();
        $oldScore = $this->loadLatestScore($listing->getId());
        $score = $this->calculateTrustScore($listing, $weights);
        $breakdown = $this->calculateBreakdown($listing, $weights);
        $now = new \DateTimeImmutable();

        $conn = $this->entityManager->getConnection();
        $conn->executeStatement(
            'INSERT INTO trust_score_history (listing_id, score, breakdown, created_at) VALUES (?, ?, ?::jsonb, ?)',
            [$listing->getId(), $score, json_encode($breakdown), $now->format('Y-m-d H:i:s')]
        );

        $breakdownChanges = [];
        if ($oldScore !== null) {
            $delta = $score - $oldScore;
        } else {
            $delta = 0.0;
        }

        return [
            'old_score' => $oldScore,
            'new_score' => $score,
            'delta' => $delta,
            'breakdown_changes' => $breakdownChanges,
            'listing' => $listing,
        ];
    }

    private function loadLatestScore(int $listingId): ?float
    {
        $conn = $this->entityManager->getConnection();
        $row = $conn->fetchOne(
            'SELECT score FROM trust_score_history WHERE listing_id = ? ORDER BY created_at DESC LIMIT 1',
            [$listingId]
        );
        return $row !== false ? (float) $row : null;
    }

    public function loadWeights(): array
    {
        if ($this->cachedWeights !== null) {
            return $this->cachedWeights;
        }

        $conn = $this->entityManager->getConnection();
        $rows = $conn->fetchAllAssociative('SELECT weight_key, weight_value FROM trust_score_weight ORDER BY sort_order');
        $weights = [];
        foreach ($rows as $row) {
            $weights[$row['weight_key']] = (float) $row['weight_value'];
        }
        $this->cachedWeights = $weights;

        return $weights;
    }

    public function clearWeightCache(): void
    {
        $this->cachedWeights = null;
    }

    private function batchRecalculateRaw(array $ids): int
    {
        if (empty($ids)) {
            return 0;
        }

        $conn = $this->entityManager->getConnection();
        $weights = $this->loadWeights();
        $now = (new \DateTimeImmutable())->format('Y-m-d H:i:s');

        $historyData = $this->fetchHistoryForIds($conn, $ids);
        $listingsRaw = $this->fetchListingsRaw($conn, $ids);
        $sellerScores = $this->computeSellerScoresRaw($historyData);
        $priceBounds = $this->computeProductPriceBoundsRaw($listingsRaw);

        $insertHistory = [];
        $updated = 0;

        $conn->beginTransaction();
        try {
            foreach ($listingsRaw as $listing) {
                $lid = (int) $listing['id'];
                $rows = $historyData[$lid] ?? [];
                $sellerId = $listing['seller_id'] !== null ? (int) $listing['seller_id'] : null;
                $sellerScore = $sellerScores[$sellerId] ?? 0.5;
                $pid = $listing['product_id'] !== null ? (int) $listing['product_id'] : null;
                $bounds = $pid !== null ? ($priceBounds[$pid] ?? null) : null;

                $score = $this->computeScoreRaw($listing, $rows, $sellerScore, $bounds, $weights);
                $breakdown = $this->computeBreakdownRaw($listing, $rows, $sellerScore, $bounds, $weights);

                $insertHistory[] = sprintf(
                    '(%d, %s, %s, \'%s\')',
                    $lid,
                    $score,
                    $conn->quote(json_encode($breakdown)),
                    $now
                );

                ++$updated;
            }

            if (!empty($insertHistory)) {
                $chunks = array_chunk($insertHistory, 500);
                foreach ($chunks as $chunk) {
                    $conn->executeStatement('
                        INSERT INTO trust_score_history (listing_id, score, breakdown, created_at) VALUES '
                        . implode(',', $chunk)
                    );
                }
            }

            $conn->commit();
        } catch (\Throwable $e) {
            $conn->rollBack();
            throw $e;
        }

        return $updated;
    }

    private function fetchHistoryForIds(Connection $conn, array $ids): array
    {
        $since = (new \DateTimeImmutable())->sub(new \DateInterval('P90D'))->format('Y-m-d H:i:s');
        $rows = $conn->fetchAllAssociative(
            'SELECT ph.product_listing_id AS listing_id, ph.out_of_stock, ph.anomaly, ph.recorded_price
             FROM price_history ph
             WHERE ph.product_listing_id IN (:ids) AND ph.recorded_at >= :since
             ORDER BY ph.product_listing_id, ph.recorded_at',
            ['ids' => $ids, 'since' => $since],
            ['ids' => ArrayParameterType::INTEGER]
        );

        $grouped = [];
        foreach ($rows as $row) {
            $lid = (int) $row['listing_id'];
            $grouped[$lid][] = $row;
        }

        return $grouped;
    }

    private function fetchListingsRaw(Connection $conn, array $ids): array
    {
        return $conn->fetchAllAssociative(
            'SELECT id, price, old_price, availability, product_id, seller_id, is_active,
                    created_at, updated_at
             FROM product_listing WHERE id IN (:ids)',
            ['ids' => $ids],
            ['ids' => ArrayParameterType::INTEGER]
        );
    }

    private function computeSellerScoresRaw(array $historyData): array
    {
        $sellerListingMap = [];
        $conn = $this->entityManager->getConnection();
        $allIds = array_keys($historyData);
        if (empty($allIds)) {
            return [];
        }

        $sellerMap = $conn->fetchAllKeyValue(
            'SELECT id, seller_id FROM product_listing WHERE id IN (:ids)',
            ['ids' => $allIds],
            ['ids' => ArrayParameterType::INTEGER]
        );

        foreach ($sellerMap as $listingId => $sellerId) {
            $sid = (int) $sellerId;
            if ($sid > 0) {
                $sellerListingMap[$sid][] = (int) $listingId;
            }
        }

        $sellerScores = [];
        foreach ($sellerListingMap as $sid => $sLisIds) {
            $totalCount = 0;
            $totalOutOfStock = 0;
            $totalAnomalies = 0;

            foreach ($sLisIds as $sLisId) {
                $rows = $historyData[$sLisId] ?? [];
                $count = count($rows);
                if ($count === 0) continue;

                $totalCount += $count;
                foreach ($rows as $row) {
                    if (($row['out_of_stock'] ?? false) === true || ($row['out_of_stock'] ?? 0) === 1 || ($row['out_of_stock'] ?? 'f') === 't') ++$totalOutOfStock;
                    if (($row['anomaly'] ?? false) === true || ($row['anomaly'] ?? 0) === 1 || ($row['anomaly'] ?? 'f') === 't') ++$totalAnomalies;
                }
            }

            if ($totalCount > 0) {
                $stockRel = 1 - ($totalOutOfStock / $totalCount);
                $anomRel = 1 - ($totalAnomalies / $totalCount);
                $sellerScores[$sid] = (0.6 * $stockRel) + (0.4 * $anomRel);
            }
        }

        return $sellerScores;
    }

    private function computeProductPriceBoundsRaw(array $listingsRaw): array
    {
        $bounds = [];
        foreach ($listingsRaw as $listing) {
            $pid = $listing['product_id'] !== null ? (int) $listing['product_id'] : null;
            $price = $listing['price'];
            if ($pid === null || $price === null || (float) $price <= 0) continue;

            if (!isset($bounds[$pid])) {
                $bounds[$pid] = ['min' => (float) $price, 'max' => (float) $price];
            } else {
                $bounds[$pid]['min'] = min($bounds[$pid]['min'], (float) $price);
                $bounds[$pid]['max'] = max($bounds[$pid]['max'], (float) $price);
            }
        }

        return $bounds;
    }

    private function computeScoreRaw(
        array $listing,
        array $rows,
        float $sellerScore,
        ?array $productBounds,
        array $w,
    ): float {
        $historyCount = count($rows);
        $outOfStockCount = 0;
        $anomalyCount = 0;
        $prices = [];

        foreach ($rows as $row) {
            $oos = $row['out_of_stock'] ?? false;
            if ($oos === true || $oos === 1 || $oos === 't' || $oos === '1') ++$outOfStockCount;
            $anom = $row['anomaly'] ?? false;
            if ($anom === true || $anom === 1 || $anom === 't' || $anom === '1') ++$anomalyCount;
            $rp = $row['recorded_price'] ?? null;
            if (is_numeric($rp)) {
                $prices[] = (float) $rp;
            }
        }

        $stockRel = $historyCount > 0 ? 1 - ($outOfStockCount / $historyCount) : 0.6;
        $anomRel = $historyCount > 0 ? 1 - ($anomalyCount / $historyCount) : 0.6;

        $priceStab = 0.45;
        if (count($prices) >= 2) {
            $mean = array_sum($prices) / count($prices);
            if ($mean > 0) {
                $variance = 0.0;
                foreach ($prices as $p) {
                    $delta = $p - $mean;
                    $variance += $delta * $delta;
                }
                $variance /= count($prices);
                $cv = sqrt($variance) / $mean;
                $priceStab = 1 - min(1.0, $cv / 0.4);
            }
        }

        $freshness = 0.35;
        $updatedAt = $listing['updated_at'] ?? $listing['created_at'];
        if ($updatedAt !== null) {
            $ts = is_numeric($updatedAt) ? (int) $updatedAt : strtotime((string) $updatedAt);
            if ($ts !== false && $ts > 0) {
                $days = max(0, (int) floor((time() - $ts) / 86400));
                $freshness = exp(-$days / 21);
            }
        }

        $avail = $listing['availability'];
        $availScore = $avail === true || $avail === 1 || $avail === 't' || $avail === '1' ? 1.0
            : ($avail === false || $avail === 0 || $avail === 'f' || $avail === '0' ? 0.2 : 0.5);

        $oldPrice = $listing['old_price'] !== null ? (float) $listing['old_price'] : null;
        $currentPrice = $listing['price'] !== null ? (float) $listing['price'] : null;
        $discount = 0.45;
        if ($oldPrice !== null && $currentPrice !== null) {
            if ($oldPrice <= 0 || $currentPrice <= 0) {
                $discount = 0.35;
            } elseif ($oldPrice < $currentPrice) {
                $discount = 0.15;
            } else {
                $ratio = ($oldPrice - $currentPrice) / $oldPrice;
                $discount = min(1.0, 0.55 + (1.5 * $ratio));
            }
        }

        $priceScore = 0.5;
        if ($productBounds !== null && $productBounds['max'] > 0) {
            $cp = $currentPrice;
            if ($cp !== null && abs($productBounds['max'] - $productBounds['min']) > 0.00001) {
                $relative = ($cp - $productBounds['min']) / ($productBounds['max'] - $productBounds['min']);
                $priceScore = 1 - max(0.0, min(1.0, $relative));
            }
        }

        $historyScore =
            ($w['history_stock_reliability'] ?? 0.50) * $stockRel +
            ($w['history_anomaly_reliability'] ?? 0.30) * $anomRel +
            ($w['history_price_stability'] ?? 0.20) * $priceStab;

        $listingScore =
            ($w['listing_freshness'] ?? 0.30) * $freshness +
            ($w['listing_availability'] ?? 0.20) * $availScore +
            ($w['listing_discount_honesty'] ?? 0.20) * $discount +
            ($w['listing_competitive_price'] ?? 0.20) * max(0.0, min(1.0, $priceScore)) +
            ($w['listing_seller_score'] ?? 0.10) * max(0.0, min(1.0, $sellerScore));

        $dataQuality = min(1.0, $historyCount / 12);
        $historyWeight = ($w['blend_history_base_weight'] ?? 0.15) + (($w['blend_history_data_quality'] ?? 0.55) * $dataQuality);
        $listingWeight = 1 - $historyWeight;

        $raw = ($historyWeight * $historyScore) + ($listingWeight * $listingScore);
        $stretch = $w['blend_sigmoid_stretch'] ?? 8.0;
        $stretched = 1 / (1 + exp(-$stretch * ($raw - 0.5)));

        return round(max(0.0, min(100.0, $stretched * 100)), 2);
    }

    private function computeBreakdownRaw(
        array $listing,
        array $rows,
        float $sellerScore,
        ?array $productBounds,
        array $w,
    ): array {
        $historyCount = count($rows);
        $outOfStockCount = 0;
        $anomalyCount = 0;
        $prices = [];

        foreach ($rows as $row) {
            $oos = $row['out_of_stock'] ?? false;
            if ($oos === true || $oos === 1 || $oos === 't' || $oos === '1') ++$outOfStockCount;
            $anom = $row['anomaly'] ?? false;
            if ($anom === true || $anom === 1 || $anom === 't' || $anom === '1') ++$anomalyCount;
            $rp = $row['recorded_price'] ?? null;
            if (is_numeric($rp)) {
                $prices[] = (float) $rp;
            }
        }

        $stockRel = $historyCount > 0 ? 1 - ($outOfStockCount / $historyCount) : 0.6;
        $anomRel = $historyCount > 0 ? 1 - ($anomalyCount / $historyCount) : 0.6;

        $priceStab = 0.45;
        if (count($prices) >= 2) {
            $mean = array_sum($prices) / count($prices);
            if ($mean > 0) {
                $variance = 0.0;
                foreach ($prices as $p) {
                    $delta = $p - $mean;
                    $variance += $delta * $delta;
                }
                $variance /= count($prices);
                $cv = sqrt($variance) / $mean;
                $priceStab = 1 - min(1.0, $cv / 0.4);
            }
        }

        $freshness = 0.35;
        $updatedAt = $listing['updated_at'] ?? $listing['created_at'];
        if ($updatedAt !== null) {
            $ts = is_numeric($updatedAt) ? (int) $updatedAt : strtotime((string) $updatedAt);
            if ($ts !== false && $ts > 0) {
                $days = max(0, (int) floor((time() - $ts) / 86400));
                $freshness = exp(-$days / 21);
            }
        }

        $avail = $listing['availability'];
        $availScore = $avail === true || $avail === 1 || $avail === 't' || $avail === '1' ? 1.0
            : ($avail === false || $avail === 0 || $avail === 'f' || $avail === '0' ? 0.2 : 0.5);

        $oldPrice = $listing['old_price'] !== null ? (float) $listing['old_price'] : null;
        $currentPrice = $listing['price'] !== null ? (float) $listing['price'] : null;
        $discount = 0.45;
        if ($oldPrice !== null && $currentPrice !== null) {
            if ($oldPrice <= 0 || $currentPrice <= 0) {
                $discount = 0.35;
            } elseif ($oldPrice < $currentPrice) {
                $discount = 0.15;
            } else {
                $ratio = ($oldPrice - $currentPrice) / $oldPrice;
                $discount = min(1.0, 0.55 + (1.5 * $ratio));
            }
        }

        $priceScore = 0.5;
        if ($productBounds !== null && $productBounds['max'] > 0) {
            $cp = $currentPrice;
            if ($cp !== null && abs($productBounds['max'] - $productBounds['min']) > 0.00001) {
                $relative = ($cp - $productBounds['min']) / ($productBounds['max'] - $productBounds['min']);
                $priceScore = 1 - max(0.0, min(1.0, $relative));
            }
        }

        $dataQuality = min(1.0, $historyCount / 12);
        $historyWeight = ($w['blend_history_base_weight'] ?? 0.15) + (($w['blend_history_data_quality'] ?? 0.55) * $dataQuality);

        return [
            'schema_version' => 3,
            'timestamp' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
            'history' => [
                'count' => $historyCount,
                'out_of_stock_count' => $outOfStockCount,
                'anomaly_count' => $anomalyCount,
                'stock_reliability' => round(max(0.0, min(1.0, $stockRel)), 4),
                'anomaly_reliability' => round(max(0.0, min(1.0, $anomRel)), 4),
                'price_stability' => round(max(0.0, min(1.0, $priceStab)), 4),
            ],
            'listing' => [
                'freshness' => round(max(0.0, min(1.0, $freshness)), 4),
                'availability_score' => round(max(0.0, min(1.0, $availScore)), 4),
                'discount_honesty' => round(max(0.0, min(1.0, $discount)), 4),
                'product_price_score' => round(max(0.0, min(1.0, $priceScore)), 4),
                'seller_score' => round(max(0.0, min(1.0, $sellerScore)), 4),
            ],
            'weights' => [
                'history_weight' => round($historyWeight, 4),
                'listing_weight' => round(1 - $historyWeight, 4),
            ],
        ];
    }

    private function calculateBreakdown(ProductListing $listing, array $weights): array
    {
        $rows = $this->fetchHistoryByListing([$listing]);
        $listingId = $listing->getId();
        $listingRows = $rows[$listingId] ?? [];

        $raw = [
            'id' => $listing->getId(),
            'price' => $listing->getPrice(),
            'old_price' => $listing->getOldPrice(),
            'availability' => $listing->isAvailability(),
            'product_id' => $listing->getProduct()?->getId(),
            'seller_id' => $listing->getSeller()?->getId(),
            'created_at' => $listing->getCreatedAt()?->format('Y-m-d H:i:s'),
            'updated_at' => $listing->getUpdatedAt()?->format('Y-m-d H:i:s'),
        ];
        $productBounds = $this->computeProductPriceBoundsRaw([$raw]);

        return $this->computeBreakdownRaw(
            $raw,
            $listingRows,
            0.5,
            $productBounds[$listing->getProduct()?->getId()] ?? null,
            $weights
        );
    }

    private function calculateTrustScore(ProductListing $listing, array $weights): float
    {
        $rows = $this->fetchHistoryByListing([$listing]);
        $listingId = $listing->getId();
        $listingRows = $rows[$listingId] ?? [];

        $raw = [
            'id' => $listing->getId(),
            'price' => $listing->getPrice(),
            'old_price' => $listing->getOldPrice(),
            'availability' => $listing->isAvailability(),
            'product_id' => $listing->getProduct()?->getId(),
            'seller_id' => $listing->getSeller()?->getId(),
            'created_at' => $listing->getCreatedAt()?->format('Y-m-d H:i:s'),
            'updated_at' => $listing->getUpdatedAt()?->format('Y-m-d H:i:s'),
        ];
        $productBounds = $this->computeProductPriceBoundsRaw([$raw]);

        return $this->computeScoreRaw(
            $raw,
            $listingRows,
            0.5,
            $productBounds[$listing->getProduct()?->getId()] ?? null,
            $weights
        );
    }

    private function fetchHistoryByListing(array $listings): array
    {
        $since = (new \DateTimeImmutable())->sub(new \DateInterval('P90D'));
        $rows = $this->priceHistoryRepository->findRecentRowsByListing($since);

        $grouped = [];
        foreach ($rows as $row) {
            $listingId = (int) ($row['listingId'] ?? 0);
            if ($listingId <= 0) continue;
            $grouped[$listingId][] = $row;
        }

        return $grouped;
    }
}
