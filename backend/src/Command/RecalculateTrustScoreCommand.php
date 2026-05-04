<?php

namespace App\Command;

use App\Repository\PriceHistoryRepository;
use App\Repository\ProductListingRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:trust-score:recalculate',
    description: 'Recalculate trust score for all product listings using recent history signals.',
)]
final class RecalculateTrustScoreCommand extends Command
{
    public function __construct(
        private readonly ProductListingRepository $productListingRepository,
        private readonly PriceHistoryRepository $priceHistoryRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $listings = $this->productListingRepository->findAll();
        if ($listings === []) {
            $io->success('No product listings found.');

            return Command::SUCCESS;
        }

        $since = (new \DateTimeImmutable())->sub(new \DateInterval('P30D'));
        $rows = $this->priceHistoryRepository->findRecentRowsByListing($since);

        $rowsByListing = [];
        foreach ($rows as $row) {
            $listingId = isset($row['listingId']) ? (int) $row['listingId'] : 0;
            if ($listingId <= 0) {
                continue;
            }

            if (!isset($rowsByListing[$listingId])) {
                $rowsByListing[$listingId] = [];
            }

            $rowsByListing[$listingId][] = $row;
        }

        $priceStatsByProduct = [];
        foreach ($listings as $listing) {
            $productId = $listing->getProduct()?->getId();
            $price = $listing->getPrice();

            if (!is_int($productId) || $productId <= 0 || $price === null || $price <= 0) {
                continue;
            }

            if (!isset($priceStatsByProduct[$productId])) {
                $priceStatsByProduct[$productId] = [
                    'min' => $price,
                    'max' => $price,
                ];
                continue;
            }

            if ($price < $priceStatsByProduct[$productId]['min']) {
                $priceStatsByProduct[$productId]['min'] = $price;
            }

            if ($price > $priceStatsByProduct[$productId]['max']) {
                $priceStatsByProduct[$productId]['max'] = $price;
            }
        }

        $sellerSignals = [];
        foreach ($listings as $listing) {
            $listingId = $listing->getId();
            $sellerId = $listing->getSeller()?->getId();

            if (!is_int($listingId) || $listingId <= 0 || !is_int($sellerId) || $sellerId <= 0) {
                continue;
            }

            $listingRows = $rowsByListing[$listingId] ?? [];
            $historyCount = count($listingRows);

            $stockReliability = 0.6;
            $anomalyReliability = 0.6;
            if ($historyCount > 0) {
                $outOfStockCount = 0;
                $anomalyCount = 0;

                foreach ($listingRows as $row) {
                    if (($row['outOfStock'] ?? false) === true) {
                        ++$outOfStockCount;
                    }

                    if (($row['anomaly'] ?? false) === true) {
                        ++$anomalyCount;
                    }
                }

                $stockReliability = 1 - ($outOfStockCount / $historyCount);
                $anomalyReliability = 1 - ($anomalyCount / $historyCount);
            }

            if (!isset($sellerSignals[$sellerId])) {
                $sellerSignals[$sellerId] = [
                    'sum' => 0.0,
                    'count' => 0,
                ];
            }

            $sellerSignals[$sellerId]['sum'] += (0.6 * $stockReliability) + (0.4 * $anomalyReliability);
            ++$sellerSignals[$sellerId]['count'];
        }

        $sellerScoreById = [];
        foreach ($sellerSignals as $sellerId => $signal) {
            $count = (int) ($signal['count'] ?? 0);
            if ($count <= 0) {
                $sellerScoreById[$sellerId] = 0.5;
                continue;
            }

            $sellerScoreById[$sellerId] = (float) $signal['sum'] / $count;
        }

        $updated = 0;

        foreach ($listings as $listing) {
            $listingId = $listing->getId();
            if (!is_int($listingId) || $listingId <= 0) {
                continue;
            }

            $listingRows = $rowsByListing[$listingId] ?? [];

            $productId = $listing->getProduct()?->getId();
            $productPriceScore = 0.5;
            if (is_int($productId) && $productId > 0 && isset($priceStatsByProduct[$productId])) {
                $currentPrice = $listing->getPrice();
                $minPrice = (float) $priceStatsByProduct[$productId]['min'];
                $maxPrice = (float) $priceStatsByProduct[$productId]['max'];

                if ($currentPrice !== null && $maxPrice > 0) {
                    if (abs($maxPrice - $minPrice) < 0.00001) {
                        $productPriceScore = 0.5;
                    } else {
                        $relative = ((float) $currentPrice - $minPrice) / ($maxPrice - $minPrice);
                        $productPriceScore = 1 - max(0.0, min(1.0, $relative));
                    }
                }
            }

            $sellerId = $listing->getSeller()?->getId();
            $sellerScore = is_int($sellerId) && isset($sellerScoreById[$sellerId])
                ? (float) $sellerScoreById[$sellerId]
                : 0.5;

            $score = $this->calculateTrustScore(
                $listingRows,
                $listing->getOldPrice(),
                $listing->getPrice(),
                $listing->isAvailability(),
                $listing->getUpdatedAt(),
                $productPriceScore,
                $sellerScore,
            );

            $listing->setTrustScore($score);
            $listing->setTrustScoreBreakdown($this->buildTrustScoreBreakdown(
                $listingRows,
                $listing->getOldPrice(),
                $listing->getPrice(),
                $listing->isAvailability(),
                $listing->getUpdatedAt(),
                $productPriceScore,
                $sellerScore,
            ));
            ++$updated;
        }

        $this->entityManager->flush();

        $io->success(sprintf('Trust score recalculated for %d listings.', $updated));

        return Command::SUCCESS;
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     */
    private function calculateTrustScore(
        array $rows,
        ?float $oldPrice,
        ?float $currentPrice,
        ?bool $availability,
        ?\DateTimeImmutable $updatedAt,
        float $productPriceScore,
        float $sellerScore,
    ): float {
        $historyCount = count($rows);

        $outOfStockCount = 0;
        $anomalyCount = 0;
        $prices = [];

        foreach ($rows as $row) {
            if (($row['outOfStock'] ?? false) === true) {
                ++$outOfStockCount;
            }

            if (($row['anomaly'] ?? false) === true) {
                ++$anomalyCount;
            }

            $recordedPrice = $row['recordedPrice'] ?? null;
            if (is_numeric($recordedPrice)) {
                $prices[] = (float) $recordedPrice;
            }
        }

        $stockReliability = 0.6;
        $anomalyReliability = 0.6;

        if ($historyCount > 0) {
            $stockReliability = 1 - ($outOfStockCount / $historyCount);
            $anomalyReliability = 1 - ($anomalyCount / $historyCount);
        }

        $priceStability = 0.45;
        if (count($prices) >= 2) {
            $mean = array_sum($prices) / count($prices);
            if ($mean > 0) {
                $sumSquared = 0.0;
                foreach ($prices as $price) {
                    $delta = $price - $mean;
                    $sumSquared += $delta * $delta;
                }

                $variance = $sumSquared / count($prices);
                $stdDev = sqrt($variance);
                $cv = $stdDev / $mean;
                $priceStability = 1 - min(1.0, $cv / 0.4);
            }
        }

        $freshness = 0.35;
        if ($updatedAt instanceof \DateTimeImmutable) {
            $daysSinceUpdate = max(0, (int) floor((time() - $updatedAt->getTimestamp()) / 86400));
            $freshness = exp(-$daysSinceUpdate / 21);
        }

        $availabilityScore = 0.5;
        if ($availability === true) {
            $availabilityScore = 1.0;
        } elseif ($availability === false) {
            $availabilityScore = 0.2;
        }

        $discountHonesty = 0.45;
        if ($oldPrice !== null && $currentPrice !== null) {
            if ($oldPrice <= 0 || $currentPrice <= 0) {
                $discountHonesty = 0.35;
            } elseif ($oldPrice < $currentPrice) {
                $discountHonesty = 0.15;
            } else {
                $discountRatio = ($oldPrice - $currentPrice) / $oldPrice;
                $discountHonesty = min(1.0, 0.55 + (1.5 * $discountRatio));
            }
        }

        $historyScore =
            (0.50 * $stockReliability) +
            (0.30 * $anomalyReliability) +
            (0.20 * $priceStability);

        $listingScore =
            (0.30 * $freshness) +
            (0.20 * $availabilityScore) +
            (0.20 * $discountHonesty) +
            (0.20 * max(0.0, min(1.0, $productPriceScore))) +
            (0.10 * max(0.0, min(1.0, $sellerScore)));

        $dataQuality = min(1.0, $historyCount / 12);
        $historyWeight = 0.15 + (0.55 * $dataQuality);
        $listingWeight = 1 - $historyWeight;

        $raw = ($historyWeight * $historyScore) + ($listingWeight * $listingScore);

        // Stretch middle values so close raw scores do not collapse into near-identical trust scores.
        $stretched = 1 / (1 + exp(-8 * ($raw - 0.5)));
        $finalScore = 100 * $stretched;

        return round(max(0.0, min(100.0, $finalScore)), 2);
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     * @return array<string, mixed>
     */
    private function buildTrustScoreBreakdown(
        array $rows,
        ?float $oldPrice,
        ?float $currentPrice,
        ?bool $availability,
        ?\DateTimeImmutable $updatedAt,
        float $productPriceScore,
        float $sellerScore,
    ): array {
        $historyCount = count($rows);
        $outOfStockCount = 0;
        $anomalyCount = 0;
        $prices = [];

        foreach ($rows as $row) {
            if (($row['outOfStock'] ?? false) === true) {
                ++$outOfStockCount;
            }

            if (($row['anomaly'] ?? false) === true) {
                ++$anomalyCount;
            }

            $recordedPrice = $row['recordedPrice'] ?? null;
            if (is_numeric($recordedPrice)) {
                $prices[] = (float) $recordedPrice;
            }
        }

        $stockReliability = 0.6;
        $anomalyReliability = 0.6;
        if ($historyCount > 0) {
            $stockReliability = 1 - ($outOfStockCount / $historyCount);
            $anomalyReliability = 1 - ($anomalyCount / $historyCount);
        }

        $priceStability = 0.45;
        if (count($prices) >= 2) {
            $mean = array_sum($prices) / count($prices);
            if ($mean > 0) {
                $sumSquared = 0.0;
                foreach ($prices as $price) {
                    $delta = $price - $mean;
                    $sumSquared += $delta * $delta;
                }

                $variance = $sumSquared / count($prices);
                $stdDev = sqrt($variance);
                $cv = $stdDev / $mean;
                $priceStability = 1 - min(1.0, $cv / 0.4);
            }
        }

        $freshness = 0.35;
        if ($updatedAt instanceof \DateTimeImmutable) {
            $daysSinceUpdate = max(0, (int) floor((time() - $updatedAt->getTimestamp()) / 86400));
            $freshness = exp(-$daysSinceUpdate / 21);
        }

        $availabilityScore = 0.5;
        if ($availability === true) {
            $availabilityScore = 1.0;
        } elseif ($availability === false) {
            $availabilityScore = 0.2;
        }

        $discountHonesty = 0.45;
        if ($oldPrice !== null && $currentPrice !== null) {
            if ($oldPrice <= 0 || $currentPrice <= 0) {
                $discountHonesty = 0.35;
            } elseif ($oldPrice < $currentPrice) {
                $discountHonesty = 0.15;
            } else {
                $discountRatio = ($oldPrice - $currentPrice) / $oldPrice;
                $discountHonesty = min(1.0, 0.55 + (1.5 * $discountRatio));
            }
        }

        $dataQuality = min(1.0, $historyCount / 12);
        $historyWeight = 0.15 + (0.55 * $dataQuality);
        $listingWeight = 1 - $historyWeight;

        return [
            'history' => [
                'count' => $historyCount,
                'out_of_stock_count' => $outOfStockCount,
                'anomaly_count' => $anomalyCount,
                'stock_reliability' => round(max(0.0, min(1.0, $stockReliability)), 4),
                'anomaly_reliability' => round(max(0.0, min(1.0, $anomalyReliability)), 4),
                'price_stability' => round(max(0.0, min(1.0, $priceStability)), 4),
            ],
            'listing' => [
                'freshness' => round(max(0.0, min(1.0, $freshness)), 4),
                'availability_score' => round(max(0.0, min(1.0, $availabilityScore)), 4),
                'discount_honesty' => round(max(0.0, min(1.0, $discountHonesty)), 4),
                'product_price_score' => round(max(0.0, min(1.0, $productPriceScore)), 4),
                'seller_score' => round(max(0.0, min(1.0, $sellerScore)), 4),
            ],
            'weights' => [
                'history_weight' => round($historyWeight, 4),
                'listing_weight' => round($listingWeight, 4),
            ],
        ];
    }
}
