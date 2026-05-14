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
    public function getBestTimeToBuy(
        Request $request,
        PriceHistoryRepository $priceHistoryRepository,
        ProductListingRepository $productListingRepository,
        UserRepository $userRepository,
        BestTimeToBuyApiClient $bestTimeToBuyApiClient,
    ): JsonResponse {
        $productId = $request->query->getInt('productId', 0);
        $listingId = $request->query->getInt('listingId', 0);
        $alerterId = $request->query->getInt('alerterId', 0);

        if ($alerterId <= 0 || ($productId <= 0 && $listingId <= 0)) {
            return $this->json(['error' => 'productId or listingId and alerterId are required.'], 400);
        }

        $user = $userRepository->find($alerterId);
        if (!$user instanceof User) {
            return $this->json(['error' => 'User not found.'], 404);
        }

        if (!$this->hasPremiumPriceInsightAccess($user)) {
            return $this->json([
                'error' => 'Premium plan required.',
                'message' => 'Best Time To Buy insights are available for premium users only.',
            ], 403);
        }

        $cacheKey = self::CACHE_KEY_BTTB_PREFIX . "p{$productId}l{$listingId}a{$alerterId}";

        $cacheItem = $this->cache->getItem($cacheKey);
        if ($cacheItem->isHit()) {
            return $this->json($cacheItem->get());
        }

        $listing = null;
        if ($listingId > 0) {
            $listing = $productListingRepository->find($listingId);
            if ($listing === null) {
                return $this->json(['error' => 'Listing not found.'], 404);
            }
        }

        $rows = $productId > 0
            ? $priceHistoryRepository->findHistoryRows($productId, null)
            : $priceHistoryRepository->findHistoryRows(null, $listingId);

        $modelRows = [];
        foreach ($rows as $row) {
            $recordedPrice = $row['recordedPrice'] ?? null;
            if (!is_numeric($recordedPrice) || (float) $recordedPrice <= 0) {
                continue;
            }

            $modelRows[] = [
                'recorded_price' => (float) $recordedPrice,
                'anomaly' => (bool) ($row['anomaly'] ?? false),
                'out_of_stock' => (bool) ($row['outOfStock'] ?? false),
                'trust_score' => $listing?->getTrustScore(),
            ];
        }

        if (count($modelRows) < 4) {
            return $this->json([
                'error' => 'Not enough history.',
                'message' => 'At least 4 valid history points are required to generate predictions.',
            ], 422);
        }

        try {
            $prediction = $bestTimeToBuyApiClient->predict($modelRows, $listing?->getTrustScore());
            $prediction['prediction_source'] = 'python';
        } catch (\Throwable $exception) {
            $prediction = $this->buildFallbackPrediction($modelRows, $listing?->getTrustScore());
            $prediction['prediction_source'] = 'fallback';
        }

        $data = [
            'listingId' => $listingId,
            'prediction' => $prediction,
        ];

        $cacheItem->set($data);
        $cacheItem->expiresAfter(300);
        $this->cache->save($cacheItem);

        return $this->json($data);
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
        $waitProbability = min(0.95, max(0.05, $dropPercent / 12));

        return [
            'action' => $bestDayOffset > 0 && $dropPercent >= 2.0 ? 'WAIT' : 'BUY_NOW',
            'wait_probability' => round($waitProbability, 4),
            'best_day_offset' => $bestDayOffset,
            'predicted_best_price' => round($bestPrice, 2),
            'current_price' => round($currentPrice, 2),
            'expected_drop_percent' => round($dropPercent, 2),
            'confidence' => round(min(1.0, max(0.25, (($trustScore ?? 50.0) / 100.0) * 0.7 + min(1.0, $count / 10) * 0.3)), 4),
            'horizon_days' => $horizonDays,
            'min_drop_ratio_to_wait' => 0.02,
        ];
    }
}
