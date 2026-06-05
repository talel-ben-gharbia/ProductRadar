<?php

namespace App\Controller;

use App\Entity\Subscription;
use App\Entity\User;
use App\Repository\PriceHistoryRepository;
use App\Repository\ProductListingRepository;
use App\Repository\UserRepository;
use App\Security\AdminApiGuard;
use App\Service\BestTimeToBuyApiClient;
use Psr\Cache\CacheItemPoolInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class PriceHistoryController extends AbstractController
{
    use CachedResponseTrait;

    private const CACHE_KEY_HISTORY_PREFIX = 'price_history.';
    private const CACHE_KEY_BTTB_PREFIX = 'best_time_to_buy.';

    public function __construct(
        #[Autowire(service: 'general.cache')]
        private readonly CacheItemPoolInterface $cache,
    ) {
    }

    #[Route('/price-history', name: 'get_price_history', methods: ['GET'])]
    public function getPriceHistory(Request $request, PriceHistoryRepository $priceHistoryRepository, UserRepository $userRepository, AdminApiGuard $adminApiGuard): JsonResponse
    {
        $firebaseUid = trim((string) $request->headers->get('X-Firebase-Uid', ''));
        if ($firebaseUid === '') {
            $adminAuth = $adminApiGuard->assertAuthorized($request);
            if ($adminAuth !== null) {
                return $this->json(['error' => 'Authentication required.'], 401);
            }
        } else {
            $user = $userRepository->findOneBy(['firebase_uid' => $firebaseUid]);
            if (!$user instanceof User) {
                return $this->json(['error' => 'User not found.'], 401);
            }
        }

        $productId = $request->query->getInt('productId', 0);
        $listingId = $request->query->getInt('listingId', 0);

        $cacheKey = self::CACHE_KEY_HISTORY_PREFIX . "p{$productId}l{$listingId}";

        return $this->cachedGet($this->cache, $cacheKey, static function () use ($productId, $listingId, $priceHistoryRepository): array {
            $rows = $priceHistoryRepository->findHistoryRows(
                $productId > 0 ? $productId : null,
                $listingId > 0 ? $listingId : null,
            );

            return array_map(static function (array $row): array {
                $recordedAt = $row['recordedAt'] ?? null;
                $sellerFromHistory = $row['sellerFromHistory'] ?? null;
                $sellerFromListing = $row['sellerFromListing'] ?? null;
                $sellerFromListingName = $row['sellerFromListingName'] ?? null;

                return [
                    'id' => $row['id'] ?? null,
                    'recorded_price' => $row['recordedPrice'] ?? null,
                    'recorded_at' => $recordedAt instanceof \DateTimeInterface ? $recordedAt->format(DATE_ATOM) : $recordedAt,
                    'out_of_stock' => $row['outOfStock'] ?? null,
                    'anomaly' => $row['anomaly'] ?? null,
                    'productListingId' => $row['listingId'] ?? null,
                    'sellerId' => $sellerFromHistory !== null ? (int) $sellerFromHistory : ($sellerFromListing !== null ? (int) $sellerFromListing : null),
                    'sellerName' => is_string($sellerFromListingName) && trim($sellerFromListingName) !== '' ? $sellerFromListingName : null,
                ];
            }, $rows);
        });
    }

    #[Route('/best-time-to-buy', name: 'get_best_time_to_buy', methods: ['GET'])]
    public function getBestTimeToBuy(Request $request, PriceHistoryRepository $priceHistoryRepository, BestTimeToBuyApiClient $bestTimeToBuyApiClient): JsonResponse
    {
        $productId = $request->query->getInt('productId', 0);
        $alerterId = $request->query->getInt('alerterId', 0);

        if ($productId <= 0) {
            return $this->json(['error' => 'productId is required.'], 400);
        }

        $rows = $priceHistoryRepository->findHistoryRows($productId, null);
        if ($rows === []) {
            return $this->json(['error' => 'No price history found for this product.'], 404);
        }

        $cacheKey = self::CACHE_KEY_BTTB_PREFIX . "p{$productId}a{$alerterId}";

        return $this->cachedGet($this->cache, $cacheKey, function () use ($rows, $bestTimeToBuyApiClient): array {
            try {
                $predictionResponse = $bestTimeToBuyApiClient->predict($rows);

                if (isset($predictionResponse['prediction']) && is_array($predictionResponse['prediction'])) {
                    $predictionResponse['friendly_message'] = $this->buildFriendlyPredictionMessage($predictionResponse['prediction'], $predictionResponse['model_version'] ?? null);
                    $predictionResponse['ml_running'] = true;
                    return $predictionResponse;
                }

                return [
                    'prediction' => $predictionResponse,
                    'friendly_message' => $this->buildFriendlyPredictionMessage(is_array($predictionResponse) ? $predictionResponse : [], $predictionResponse['model_version'] ?? null),
                    'ml_running' => true,
                    'message' => 'Prediction generated successfully.',
                ];
            } catch (\Throwable $throwable) {
                $fallback = $this->buildFallbackPrediction($rows, null);
                return [
                    'prediction' => $fallback,
                    'friendly_message' => $this->buildFriendlyPredictionMessage($fallback, null, true),
                    'ml_running' => false,
                    'message' => 'Fallback prediction used because the ML API was unavailable.',
                    'error' => $throwable->getMessage(),
                ];
            }
        });
    }

    

    private function hasPremiumPriceInsightAccess(User $user): bool
    {
        $subscription = $user->getSubscription();
        if ($subscription === null || !$subscription instanceof Subscription || $subscription->isActive() !== true) {
            return false;
        }

        $endDate = $subscription->getEndDate();
        if (!$endDate instanceof \DateTimeImmutable || $endDate < new \DateTimeImmutable()) {
            return false;
        }

        return (int) ($subscription->getPriceHistoryAccess() ?? 0) > 0;
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     *
     * @return array<string, float|int|string>
     */
    private function buildFallbackPrediction(array $rows, ?float $trustScore): array
    {
        $prices = [];
        foreach ($rows as $row) {
            if (isset($row['recorded_price']) && is_numeric($row['recorded_price'])) {
                $prices[] = (float) $row['recorded_price'];
            }
        }

        $currentPrice = $prices !== [] ? (float) end($prices) : 0.0;
        $count = count($prices);

        $slope = 0.0;
        if ($count >= 2) {
            $x = range(0, $count - 1);
            $xMean = array_sum($x) / $count;
            $yMean = array_sum($prices) / $count;
            $numerator = 0.0;
            $denominator = 0.0;

            for ($i = 0; $i < $count; ++$i) {
                $xDelta = $x[$i] - $xMean;
                $yDelta = $prices[$i] - $yMean;
                $numerator += $xDelta * $yDelta;
                $denominator += $xDelta * $xDelta;
            }

            if ($denominator > 0.000001) {
                $slope = $numerator / $denominator;
            }
        }

        $horizonDays = 14;
        $bestPrice = $currentPrice;
        $bestDayOffset = 0;

        for ($day = 1; $day <= $horizonDays; ++$day) {
            $predicted = max(0.01, $currentPrice + ($slope * $day));
            if ($predicted < $bestPrice) {
                $bestPrice = $predicted;
                $bestDayOffset = $day;
            }
        }

        $dropPercent = $currentPrice > 0 ? max(0.0, (($currentPrice - $bestPrice) / $currentPrice) * 100) : 0.0;
        $action = $bestDayOffset > 0 && $dropPercent >= 2.0 ? 'WAIT' : 'BUY_NOW';

        return [
            'action' => $action,
            'current_price' => round($currentPrice, 2),
            'confidence' => round(min(1.0, max(0.0, ((($trustScore ?? 50.0) / 100.0) * 0.8 + min(1.0, $count / 10) * 0.2))), 4),
        ];
    }

        /**
         * Build a human-friendly one-line summary of the prediction including confidence and important details.
         *
         * @param array<string, mixed> $prediction
         */
        private function buildFriendlyPredictionMessage(array $prediction, ?string $modelVersion = null, bool $isFallback = false): string
        {
            $action = isset($prediction['action']) ? (string) $prediction['action'] : 'UNKNOWN';
            $currentPrice = isset($prediction['current_price']) ? (float) $prediction['current_price'] : null;
            $confidence = isset($prediction['confidence']) ? (float) $prediction['confidence'] * 100.0 : null;

            $parts = [];
            if ($action === 'WAIT') {
                $parts[] = 'Recommendation: WAIT — consider waiting before buying.';
            } elseif ($action === 'BUY_NOW') {
                $parts[] = 'Recommendation: BUY NOW.';
            } else {
                $parts[] = sprintf('Recommendation: %s.', $action);
            }

            if ($currentPrice !== null) {
                $parts[] = sprintf('Current price: %s.', number_format($currentPrice, 2));
            }

            if ($confidence !== null) {
                $parts[] = sprintf('Confidence: %.1f%%.', $confidence);
            }

            if ($modelVersion !== null) {
                $parts[] = sprintf('Model version: %s.', $modelVersion);
            }

            if ($isFallback) {
                $parts[] = 'Note: this prediction used fallback logic (model unavailable or failed).';
            }

            return implode(' ', $parts);
        }
}
