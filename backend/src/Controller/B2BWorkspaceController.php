<?php

namespace App\Controller;

use App\Entity\B2BAdsCampaign;
use App\Entity\B2BAdsRequest;
use App\Entity\B2BCompany;
use App\Entity\B2BMarket;
use App\Entity\B2BReport;
use App\Entity\B2BScrapingRequest;
use App\Entity\B2BSearchLog;
use App\Entity\B2BWatchlist;
use App\Entity\Subscription;
use App\Entity\Notification;
use App\Entity\Product;
use App\Entity\ProductListing;
use App\Entity\Seller;
use App\Entity\User;
use App\Repository\ProductListingRepository;
use App\Repository\UserRepository;
use App\Service\B2BNotificationService;
use App\Service\B2BPlanGatingService;
use App\Service\B2BAdsQuotaService;
use App\Service\CacheVersionManager;
use App\Service\SubscriptionContextResolver;
use App\Service\TrustScoreCalculationService;
use App\Service\B2BIdentityService;
use App\Service\URLDuplicateDetector;
use Doctrine\DBAL\ArrayParameterType;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Cache\CacheItemPoolInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/b2b/workspace')]
final class B2BWorkspaceController extends AbstractController
{
    use CachedResponseTrait;

    private const CACHE_KEY_SUMMARY_PREFIX = 'workspace.summary.';
    private const CACHE_KEY_HEALTH_PREFIX = 'workspace.health.';
    private const CACHE_KEY_TRUST_HISTORY_PREFIX = 'workspace.trust_history.';
    private const CACHE_KEY_LISTINGS_PREFIX = 'workspace.listings.';
    private const CACHE_KEY_NOTIFICATIONS_PREFIX = 'workspace.notifications.';
    private const CACHE_KEY_ADS_PREFIX = 'workspace.ads.';
    private const CACHE_KEY_REPORTS_PREFIX = 'workspace.reports.';
    private const CACHE_KEY_WATCHLIST_PREFIX = 'workspace.watchlist.';
    private const CACHE_KEY_WATCHLIST_SEARCH_PREFIX = 'workspace.watchlist_search.';
    private const CACHE_KEY_COMPARE_LISTING_PREFIX = 'workspace.compare.listing.';
    private const CACHE_KEY_COMPARE_PRODUCT_PREFIX = 'workspace.compare.product.';
    private const CACHE_KEY_SCRAPING_PREFIX = 'workspace.scraping.';
    private const CACHE_KEY_EXPORT_PREFIX = 'workspace.export.';

    public function __construct(
        private readonly B2BNotificationService $b2bNotificationService,
        private readonly B2BPlanGatingService $gatingService,
        private readonly B2BIdentityService $b2bIdentityService,
        private readonly SubscriptionContextResolver $subscriptionResolver,
        private readonly URLDuplicateDetector $urlDuplicateDetector,
        private readonly CacheVersionManager $cacheVersionManager,
        #[Autowire(service: 'general.cache')]
        private readonly CacheItemPoolInterface $cache,
    ) {
    }

    #[Route('/{firebaseUid}/summary', name: 'b2b_workspace_summary', methods: ['GET'])]
    public function summary(
        string $firebaseUid,
        UserRepository $userRepository,
        ProductListingRepository $productListingRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->resolveWorkspaceUser($firebaseUid, $userRepository);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $this->firePlanExpiryWarning($user, $entityManager);

        return $this->cachedGet($this->cache, $this->buildUserCacheKey($this->cacheVersionManager, $firebaseUid, self::CACHE_KEY_SUMMARY_PREFIX), function () use ($user, $productListingRepository, $entityManager): array {
            $subscription = $this->resolveWorkspaceSubscription($user, $entityManager);
            $notifications = $this->fetchWorkspaceNotifications($user, $entityManager, 5);
            $searchInsights = $this->fetchSearchInsights($user, $entityManager);

            $listings = $this->fetchWorkspaceListings($user, $productListingRepository, $entityManager);
            $metrics = $this->buildWorkspaceMetrics($user, $listings, $entityManager, $searchInsights);

            return [
                'user' => $this->serializeWorkspaceUser($user),
                'subscription' => $this->serializeWorkspaceSubscription($subscription),
                'metrics' => $metrics,
                'search_insights' => $searchInsights,
                'notifications' => $notifications,
            ];
        });
    }

    #[Route('/{firebaseUid}/health-score', name: 'b2b_workspace_health_score', methods: ['GET'])]
    public function healthScore(
        string $firebaseUid,
        UserRepository $userRepository,
        ProductListingRepository $productListingRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->resolveWorkspaceUser($firebaseUid, $userRepository);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        if ($user instanceof B2BMarket || !($user instanceof B2BCompany)) {
            return $this->json([
                'overall' => null,
                'trust_dimension' => null,
                'pricing_dimension' => null,
                'stock_dimension' => null,
                'trend' => null,
            ]);
        }

        return $this->cachedGet($this->cache, $this->buildUserCacheKey($this->cacheVersionManager, $firebaseUid, self::CACHE_KEY_HEALTH_PREFIX), function () use ($user, $productListingRepository, $entityManager): array {
            $listings = $this->fetchWorkspaceListings($user, $productListingRepository, $entityManager);

            if (empty($listings)) {
                return [
                    'overall' => null,
                    'trust_dimension' => null,
                    'pricing_dimension' => null,
                    'stock_dimension' => null,
                    'trend' => null,
                ];
            }

            $trustScores = array_filter(array_map(static fn (array $l) => $l['trust_score'] ?? null, $listings), static fn ($value) => is_numeric($value));
            $avgTrust = !empty($trustScores) ? array_sum(array_map('floatval', $trustScores)) / count($trustScores) : 0.0;
            $trustDimension = (int) round(min(100, max(0, $avgTrust)));

            $total = count($listings);
            $inStock = count(array_filter($listings, static fn (array $l) => ($l['availability'] ?? null) === true));
            $stockDimension = $total > 0 ? (int) round(($inStock / $total) * 100) : 0;

            $pricingScores = [];
            foreach ($listings as $listing) {
                $price = isset($listing['price']) && is_numeric($listing['price']) ? (float) $listing['price'] : null;
                $cheapestPrice = isset($listing['cheapest_price']) && is_numeric($listing['cheapest_price']) ? (float) $listing['cheapest_price'] : null;
                $vendorRank = isset($listing['vendor_rank']) && is_numeric($listing['vendor_rank']) ? (int) $listing['vendor_rank'] : null;

                if ($price === null || $price <= 0 || $cheapestPrice === null || $cheapestPrice <= 0) {
                    continue;
                }

                $gapRatio = max(0.0, ($price - $cheapestPrice) / $price);
                $listingScore = 100 - min(100.0, $gapRatio * 180.0);
                if ($vendorRank !== null && $vendorRank === 1) {
                    $listingScore = min(100.0, $listingScore + 8.0);
                }

                $pricingScores[] = $listingScore;
            }

            $pricingDimension = !empty($pricingScores)
                ? (int) round(array_sum($pricingScores) / count($pricingScores))
                : 50;

            $overall = (int) round(
                $trustDimension * 0.40 + $pricingDimension * 0.30 + $stockDimension * 0.30
            );

            return [
                'overall' => $overall,
                'trust_dimension' => $trustDimension,
                'pricing_dimension' => $pricingDimension,
                'stock_dimension' => $stockDimension,
                'trend' => null,
            ];
        }, 60);
    }

    #[Route('/{firebaseUid}/trust-score-history', name: 'b2b_workspace_trust_score_history', methods: ['GET'])]
    public function trustScoreHistory(
        string $firebaseUid,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->resolveWorkspaceUser($firebaseUid, $userRepository);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        return $this->cachedGet($this->cache, $this->buildUserCacheKey($this->cacheVersionManager, $firebaseUid, self::CACHE_KEY_TRUST_HISTORY_PREFIX), function () use ($user, $entityManager): array {
            $conn = $entityManager->getConnection();

            if ($user instanceof B2BCompany) {
                $sellerId = $user->getSeller()?->getId();
                if ($sellerId === null) {
                    return ['items' => []];
                }

                $since = (new \DateTimeImmutable())->modify('-90 days')->format('Y-m-d');
                $rows = $conn->fetchAllAssociative('
                    SELECT DATE(h.created_at) AS date,
                           ROUND(AVG(h.score)::numeric, 2) AS avg_score,
                           COUNT(DISTINCT h.listing_id) AS listing_count
                    FROM trust_score_history h
                    JOIN product_listing pl ON pl.id = h.listing_id
                    WHERE pl.seller_id = :sellerId
                      AND h.created_at >= :since
                    GROUP BY DATE(h.created_at)
                    ORDER BY date ASC
                ', ['sellerId' => $sellerId, 'since' => $since]);

                return ['items' => $rows];
            }

            if ($user instanceof B2BMarket) {
                $marketSellerId = $user->getSeller()?->getId();
                $marketNames = array_filter([
                    mb_strtolower((string) $user->getCompanyName()),
                    mb_strtolower((string) $user->getCompanyMarket()),
                ]);

                $since = (new \DateTimeImmutable())->modify('-90 days')->format('Y-m-d');
                $rows = $conn->fetchAllAssociative('
                    SELECT DATE(h.created_at) AS date,
                           ROUND(AVG(h.score)::numeric, 2) AS avg_score,
                           COUNT(DISTINCT h.listing_id) AS listing_count
                    FROM trust_score_history h
                    JOIN product_listing pl ON pl.id = h.listing_id
                    JOIN product p ON p.id = pl.product_id
                    WHERE (pl.seller_id = :sellerId OR LOWER(p.brand) IN (:marketNames))
                      AND h.created_at >= :since
                    GROUP BY DATE(h.created_at)
                    ORDER BY date ASC
                ', [
                    'sellerId' => $marketSellerId ?? 0,
                    'marketNames' => $marketNames,
                    'since' => $since,
                ], [
                    'marketNames' => \Doctrine\DBAL\ArrayParameterType::STRING,
                ]);

                return ['items' => $rows];
            }

            return ['items' => []];
        }, 120);
    }

    #[Route('/{firebaseUid}/listings', name: 'b2b_workspace_listings', methods: ['GET'])]
    public function listings(
        string $firebaseUid,
        Request $request,
        UserRepository $userRepository,
        ProductListingRepository $productListingRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->resolveWorkspaceUser($firebaseUid, $userRepository);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $cacheKey = $this->buildUserCacheKey($this->cacheVersionManager, $firebaseUid, self::CACHE_KEY_LISTINGS_PREFIX);
        $cacheItem = $this->cache->getItem($cacheKey);
        if ($cacheItem->isHit()) {
            $filtered = $this->applyListingFilters($cacheItem->get(), $request);
            $paginated = $this->paginateArray($filtered, max(1, $request->query->getInt('limit', 25)), max(0, $request->query->getInt('offset', 0)));
            return $this->json($paginated);
        }

        $rows = $this->fetchWorkspaceListings($user, $productListingRepository, $entityManager);

        $cacheItem->set($rows);
        $cacheItem->expiresAfter(60);
        $this->cache->save($cacheItem);

        $filtered = $this->applyListingFilters($rows, $request);
        $paginated = $this->paginateArray($filtered, max(1, $request->query->getInt('limit', 25)), max(0, $request->query->getInt('offset', 0)));

        return $this->json($paginated);
    }

    #[Route('/{firebaseUid}/notifications', name: 'b2b_workspace_notifications', methods: ['GET', 'POST'])]
    public function notifications(
        string $firebaseUid,
        Request $request,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->resolveWorkspaceUser($firebaseUid, $userRepository);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        if ($request->isMethod('POST')) {
            $body = json_decode((string) $request->getContent(), true);
            if (!is_array($body)) {
                return $this->json(['error' => 'Invalid request body.'], 400);
            }

            $notificationId = (int) ($body['id'] ?? 0);
            if ($notificationId <= 0) {
                return $this->json(['error' => 'Notification ID is required.'], 422);
            }

            $notification = $entityManager->find(Notification::class, $notificationId);
            if (!$notification instanceof Notification) {
                return $this->json(['error' => 'Notification not found.'], 404);
            }

            $notifOwner = $user instanceof B2BCompany ? $notification->getCompany() : $notification->getMarket();
            if ($notifOwner?->getId() !== $user->getId()) {
                return $this->json(['error' => 'Notification not found.'], 404);
            }

            $notification->setIsRead(true);
            $entityManager->flush();

            $this->cacheVersionManager->bumpVersion($firebaseUid);

            return $this->json(['id' => $notification->getId(), 'is_read' => true]);
        }

        return $this->cachedGet($this->cache, $this->buildUserCacheKey($this->cacheVersionManager, $firebaseUid, self::CACHE_KEY_NOTIFICATIONS_PREFIX), function () use ($user, $entityManager, $request): array {
            $limit = max(1, min(100, $request->query->getInt('limit', 25)));
            $offset = max(0, $request->query->getInt('offset', 0));
            $items = $this->fetchWorkspaceNotifications($user, $entityManager, $limit + $offset);

            return $this->paginateArray($items, $limit, $offset);
        }, 60);
    }

    #[Route('/{firebaseUid}/ads-requests', name: 'b2b_workspace_ads_requests', methods: ['GET', 'POST'])]
    public function adsRequests(
        string $firebaseUid,
        Request $request,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
        B2BAdsQuotaService $quotaService,
    ): JsonResponse {
        $user = $this->resolveWorkspaceUser($firebaseUid, $userRepository);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        if ($request->isMethod('GET')) {
            return $this->cachedGet($this->cache, $this->buildUserCacheKey($this->cacheVersionManager, $firebaseUid, self::CACHE_KEY_ADS_PREFIX), function () use ($user, $entityManager, $quotaService): array {
                $items = $entityManager->getRepository(B2BAdsRequest::class)->findBy(
                    $user instanceof B2BCompany ? ['company' => $user] : ['market' => $user],
                    ['created_at' => 'DESC', 'id' => 'DESC'],
                    100,
                );

                $quota = $quotaService->getQuotaUsage($user);

                $campaignRepo = $entityManager->getRepository(B2BAdsCampaign::class);

                return [
                    'items' => array_map(function (B2BAdsRequest $item) use ($campaignRepo) {
                        $data = $this->serializeAdsRequest($item);

                        // Attach campaign details for approved requests
                        if (strtoupper((string) $item->getStatus()) === 'APPROVED') {
                            $campaign = $campaignRepo->findOneBy(['adsRequest' => $item]);
                            if ($campaign) {
                                $data['campaign'] = [
                                    'id' => $campaign->getId(),
                                    'status' => $campaign->getStatus(),
                                    'width' => $campaign->getWidth(),
                                    'height' => $campaign->getHeight(),
                                    'starts_at' => $campaign->getStartsAt()?->format(\DateTimeInterface::ATOM),
                                    'ends_at' => $campaign->getEndsAt()?->format(\DateTimeInterface::ATOM),
                                    'active' => $campaign->isActive(),
                                ];
                            }
                        }

                        return $data;
                    }, $items),
                    'quota' => $quota,
                ];
            });
        }

        $body = json_decode((string) $request->getContent(), true);
        if (!is_array($body)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        // Quota check via SubscriptionContextResolver (intelligence layer)
        $quotaCheck = $this->subscriptionResolver->checkQuota($user, 'ads_requests', 1);
        if (!$quotaCheck['allowed']) {
            return $this->json([
                'error' => $quotaCheck['reason'] ?? 'Request quota exceeded.',
                'usage' => $quotaCheck['usage'],
            ], 429);
        }

        // Quota check via B2BAdsQuotaService (legacy)
        $legacyQuotaCheck = $quotaService->canCreateAdsRequest($user);
        if (!$legacyQuotaCheck['allowed']) {
            return $this->json(['error' => $legacyQuotaCheck['message']], 429);
        }

        $imageUrl = $this->normalizeNullableString($body['imageUrl'] ?? null);
        $linkUrl = $this->normalizeNullableString($body['linkUrl'] ?? null);

        if (empty($imageUrl)) {
            return $this->json(['error' => 'Banner image URL is required.'], 400);
        }
        if (empty($linkUrl)) {
            return $this->json(['error' => 'Link URL is required.'], 400);
        }

        // Check if imageUrl references a prior upload stored as DRAFT
        if (preg_match('#^/banner/image/(\d+)$#', $imageUrl, $m)) {
            $adsRequest = $entityManager->find(B2BAdsRequest::class, (int) $m[1]);
            if (!$adsRequest || strtoupper((string) $adsRequest->getStatus()) !== 'DRAFT') {
                return $this->json(['error' => 'Invalid or expired banner upload.'], 400);
            }
            $adsRequest->setImageUrl($imageUrl);
            $adsRequest->setLinkUrl($linkUrl);
            $adsRequest->setStatus('PENDING');
            $adsRequest->setUpdatedAt(new \DateTimeImmutable());
        } else {
            $adsRequest = new B2BAdsRequest();
            $adsRequest->setOwnerType($user instanceof B2BMarket ? 'B2B_MARKET' : 'B2B_COMPANY');
            if ($user instanceof B2BCompany) {
                $adsRequest->setCompany($user);
            } elseif ($user instanceof B2BMarket) {
                $adsRequest->setMarket($user);
            }
            $adsRequest->setRequestType('BANNER');
            $adsRequest->setImageUrl($imageUrl);
            $adsRequest->setLinkUrl($linkUrl);
            $adsRequest->setStatus('PENDING');
            $adsRequest->setCreatedAt(new \DateTimeImmutable());
            $adsRequest->setUpdatedAt(new \DateTimeImmutable());
            $entityManager->persist($adsRequest);
        }

        $entityManager->flush();

        $this->subscriptionResolver->recordUsage($user, 'ads_requests');
        $this->cacheVersionManager->bumpVersion($firebaseUid);

        return $this->json($this->serializeAdsRequest($adsRequest), 201);
    }

    #[Route('/{firebaseUid}/ads-requests/{id}', name: 'b2b_workspace_ads_request_get', methods: ['GET'])]
    public function getAdsRequest(
        string $firebaseUid,
        int $id,
        Request $request,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->resolveWorkspaceUser($firebaseUid, $userRepository);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $adsRequest = $entityManager->getRepository(B2BAdsRequest::class)->find($id);
        if (!$adsRequest instanceof B2BAdsRequest) {
            return $this->json(['error' => 'Ads request not found.'], 404);
        }

        if (!$this->isOwner($adsRequest, $user)) {
            return $this->json(['error' => 'Forbidden.'], 403);
        }

        $data = $this->serializeAdsRequest($adsRequest);

        if (strtoupper((string) $adsRequest->getStatus()) === 'APPROVED') {
            $campaign = $entityManager->getRepository(B2BAdsCampaign::class)
                ->findOneBy(['adsRequest' => $adsRequest]);
            if ($campaign) {
                $data['campaign'] = [
                    'id' => $campaign->getId(),
                    'status' => $campaign->getStatus(),
                    'width' => $campaign->getWidth(),
                    'height' => $campaign->getHeight(),
                    'starts_at' => $campaign->getStartsAt()?->format(\DateTimeInterface::ATOM),
                    'ends_at' => $campaign->getEndsAt()?->format(\DateTimeInterface::ATOM),
                    'active' => $campaign->isActive(),
                ];
            }
        }

        return $this->json($data);
    }

    #[Route('/{firebaseUid}/ads-requests/{id}', name: 'b2b_workspace_ads_request_update', methods: ['PUT'])]
    public function updateAdsRequest(
        string $firebaseUid,
        int $id,
        Request $request,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
        B2BNotificationService $b2bNotificationService,
    ): JsonResponse {
        $user = $this->resolveWorkspaceUser($firebaseUid, $userRepository);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $adsRequest = $entityManager->getRepository(B2BAdsRequest::class)->find($id);
        if (!$adsRequest instanceof B2BAdsRequest) {
            return $this->json(['error' => 'Ads request not found.'], 404);
        }

        if (!$this->isOwner($adsRequest, $user)) {
            return $this->json(['error' => 'Forbidden.'], 403);
        }

        $currentStatus = strtoupper((string) $adsRequest->getStatus());
        if ($currentStatus === 'DRAFT') {
            return $this->json(['error' => 'Cannot edit a draft upload.'], 400);
        }

        $body = json_decode((string) $request->getContent(), true);
        if (!is_array($body)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        $imageUrl = $this->normalizeNullableString($body['imageUrl'] ?? null);
        $linkUrl = $this->normalizeNullableString($body['linkUrl'] ?? null);

        if (empty($imageUrl)) {
            return $this->json(['error' => 'Banner image URL is required.'], 400);
        }
        if (empty($linkUrl)) {
            return $this->json(['error' => 'Link URL is required.'], 400);
        }

        // If it's a new upload (DRAFT reference), update the reference
        if (preg_match('#^/banner/image/(\d+)$#', $imageUrl, $m)) {
            $upload = $entityManager->find(B2BAdsRequest::class, (int) $m[1]);
            if ($upload && strtoupper((string) $upload->getStatus()) === 'DRAFT') {
                $adsRequest->setImageData($upload->getImageData());
                $adsRequest->setImageMimeType($upload->getImageMimeType());
            }
        }

        $adsRequest->setImageUrl($imageUrl);
        $adsRequest->setLinkUrl($linkUrl);
        $adsRequest->setStatus('PENDING');
        $adsRequest->setUpdatedAt(new \DateTimeImmutable());

        $entityManager->flush();

        $this->cacheVersionManager->bumpVersion($firebaseUid);

        return $this->json($this->serializeAdsRequest($adsRequest));
    }

    #[Route('/{firebaseUid}/ads-requests/{id}', name: 'b2b_workspace_ads_request_delete', methods: ['DELETE'])]
    public function deleteAdsRequest(
        string $firebaseUid,
        int $id,
        Request $request,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->resolveWorkspaceUser($firebaseUid, $userRepository);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $adsRequest = $entityManager->getRepository(B2BAdsRequest::class)->find($id);
        if (!$adsRequest instanceof B2BAdsRequest) {
            return $this->json(['error' => 'Ads request not found.'], 404);
        }

        if (!$this->isOwner($adsRequest, $user)) {
            return $this->json(['error' => 'Forbidden.'], 403);
        }

        $currentStatus = strtoupper((string) $adsRequest->getStatus());
        if ($currentStatus === 'DRAFT') {
            return $this->json(['error' => 'Cannot delete a draft upload.'], 400);
        }

        // Deactivate or remove associated campaign
        $campaign = $entityManager->getRepository(B2BAdsCampaign::class)
            ->findOneBy(['adsRequest' => $adsRequest]);
        if ($campaign) {
            $campaign->setActive(false);
            $campaign->setStatus('CANCELLED');
            $campaign->setUpdatedAt(new \DateTimeImmutable());
        }

        $entityManager->remove($adsRequest);
        $entityManager->flush();

        $this->cacheVersionManager->bumpVersion($firebaseUid);

        return $this->json(['status' => 'DELETED']);
    }

    private function isOwner(B2BAdsRequest $adsRequest, B2BCompany|B2BMarket $user): bool
    {
        if ($user instanceof B2BCompany) {
            return $adsRequest->getCompany()?->getId() === $user->getId();
        }
        return $adsRequest->getMarket()?->getId() === $user->getId();
    }

    #[Route('/{firebaseUid}/upload-banner', name: 'b2b_workspace_upload_banner', methods: ['POST'])]
    public function uploadBanner(
        string $firebaseUid,
        Request $request,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->resolveWorkspaceUser($firebaseUid, $userRepository);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $file = $request->files->get('image');
        if (!$file instanceof \Symfony\Component\HttpFoundation\File\UploadedFile) {
            return $this->json(['error' => 'No image file uploaded.'], 400);
        }

        if (!$file->isValid()) {
            return $this->json(['error' => 'Uploaded file is not valid.'], 400);
        }

        $allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        $mimeType = $file->getMimeType();
        if (!in_array($mimeType, $allowedMimeTypes, true)) {
            return $this->json(['error' => 'Invalid file type. Allowed: JPG, PNG, WebP, GIF.'], 400);
        }

        if ($file->getSize() > 5 * 1024 * 1024) {
            return $this->json(['error' => 'File size exceeds 5MB limit.'], 400);
        }

        $compressed = $this->compressImage($file->getPathname(), $mimeType);
        if ($compressed === null) {
            return $this->json(['error' => 'Failed to process image.'], 500);
        }

        $adsRequest = new B2BAdsRequest();
        $adsRequest->setOwnerType($user instanceof B2BMarket ? 'B2B_MARKET' : 'B2B_COMPANY');
        if ($user instanceof B2BCompany) {
            $adsRequest->setCompany($user);
        } elseif ($user instanceof B2BMarket) {
            $adsRequest->setMarket($user);
        }
        $adsRequest->setRequestType('BANNER');
        $adsRequest->setStatus('DRAFT');
        $adsRequest->setImageData($compressed);
        $adsRequest->setImageMimeType($mimeType);
        $adsRequest->setCreatedAt(new \DateTimeImmutable());
        $adsRequest->setUpdatedAt(new \DateTimeImmutable());

        $entityManager->persist($adsRequest);
        $entityManager->flush();

        $imageUrl = '/banner/image/' . $adsRequest->getId();
        $adsRequest->setImageUrl($imageUrl);
        $entityManager->flush();

        return $this->json(['url' => $imageUrl], 201);
    }

    private function compressImage(string $filePath, string $mimeType): ?string
    {
        $image = match ($mimeType) {
            'image/jpeg' => @imagecreatefromjpeg($filePath),
            'image/png' => @imagecreatefrompng($filePath),
            'image/webp' => @imagecreatefromwebp($filePath),
            'image/gif' => @imagecreatefromgif($filePath),
            default => null,
        };

        if (!$image) {
            return null;
        }

        $maxWidth = 1920;
        $width = imagesx($image);
        $height = imagesy($image);
        $quality = 75;

        if ($width > $maxWidth) {
            $newWidth = $maxWidth;
            $newHeight = (int) ($height * ($maxWidth / $width));
            $newImage = imagecreatetruecolor($newWidth, $newHeight);
            imagecopyresampled($newImage, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
            imagedestroy($image);
            $image = $newImage;
        }

        ob_start();
        imagejpeg($image, null, $quality);
        $data = ob_get_clean();
        imagedestroy($image);

        return $data !== false && $data !== '' ? $data : null;
    }

    #[Route('/{firebaseUid}/reports', name: 'b2b_workspace_reports', methods: ['GET', 'POST'])]
    public function reports(
        string $firebaseUid,
        Request $request,
        UserRepository $userRepository,
        ProductListingRepository $productListingRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->resolveWorkspaceUser($firebaseUid, $userRepository);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        if ($request->isMethod('GET')) {
            return $this->cachedGet($this->cache, $this->buildUserCacheKey($this->cacheVersionManager, $firebaseUid, self::CACHE_KEY_REPORTS_PREFIX), function () use ($user, $entityManager): array {
                $items = $entityManager->getRepository(B2BReport::class)->findBy(
                    $user instanceof B2BCompany ? ['company' => $user] : ['market' => $user],
                    ['created_at' => 'DESC', 'id' => 'DESC'],
                    100,
                );

                return [
                    'items' => array_map(fn (B2BReport $item) => [
                        'id' => $item->getId(),
                        'report_type' => $item->getReportType(),
                        'status' => $item->getStatus(),
                        'file_path' => $item->getFilePath(),
                        'generated_at' => $item->getGeneratedAt()?->format(\DateTimeInterface::ATOM),
                        'created_at' => $item->getCreatedAt()?->format(\DateTimeInterface::ATOM),
                    ], $items),
                ];
            });
        }

        $body = json_decode((string) $request->getContent(), true);
        if (!is_array($body)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        $reportType = strtoupper((string) ($body['reportType'] ?? 'COMPETITOR_PRICING'));

        // Quota check via SubscriptionContextResolver
        $quotaCheck = $this->subscriptionResolver->checkQuota($user, 'reports', 1);
        if (!$quotaCheck['allowed']) {
            return $this->json([
                'error' => $quotaCheck['reason'] ?? 'Report quota exceeded.',
                'usage' => $quotaCheck['usage'],
            ], 429);
        }

        $listings = $this->fetchWorkspaceListings($user, $productListingRepository, $entityManager);
        $searchInsights = $this->fetchSearchInsights($user, $entityManager);
        $reportData = $this->buildReportCsvData($user, $reportType, $listings, $entityManager, $searchInsights);

        if ($reportData === null) {
            return $this->json(['error' => 'Unknown or unsupported report type.'], 422);
        }

        $reportDir = dirname(__DIR__, 2) . '/var/b2b/reports';
        if (!is_dir($reportDir)) {
            mkdir($reportDir, 0775, true);
        }

        $safeType = strtolower(preg_replace('/[^a-z0-9_]+/i', '_', $reportType));
        $timestamp = (new \DateTimeImmutable())->format('Ymd_His');
        $fileName = sprintf('%s_%s.csv', $safeType, $timestamp);
        $filePath = $reportDir . '/' . $fileName;

        $handle = fopen($filePath, 'wb');
        if ($handle === false) {
            return $this->json(['error' => 'Unable to create report file.'], 500);
        }

        try {
            $this->writeCsvRows($handle, $reportData['headers'], $reportData['rows']);
        } finally {
            fclose($handle);
        }

        $report = new B2BReport();
        if ($user instanceof B2BCompany) {
            $report->setCompany($user);
            $report->setOwnerType('COMPANY');
        } else {
            $report->setMarket($user);
            $report->setOwnerType('MARKET');
        }
        $report->setReportType($reportType);
        $report->setStatus('GENERATED');
        $report->setFilePath('var/b2b/reports/' . $fileName);
        $report->setGeneratedAt(new \DateTimeImmutable());
        $report->setCreatedAt(new \DateTimeImmutable());

        $entityManager->persist($report);
        $entityManager->flush();

        $this->subscriptionResolver->recordUsage($user, 'reports');
        $this->cacheVersionManager->bumpVersion($firebaseUid);

        return $this->json(['id' => $report->getId(), 'status' => 'GENERATED', 'file_path' => $report->getFilePath()], 201);
    }

    #[Route('/{firebaseUid}/reports/export/{reportType}', name: 'b2b_workspace_export_report', methods: ['GET'])]
    public function exportReport(
        string $firebaseUid,
        string $reportType,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): Response {
        $user = $this->resolveWorkspaceUser($firebaseUid, $userRepository);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $upperType = strtoupper($reportType);
        $cacheKey = $this->buildUserCacheKey($this->cacheVersionManager, $firebaseUid, self::CACHE_KEY_EXPORT_PREFIX . $upperType);
        $cacheItem = $this->cache->getItem($cacheKey);
        if ($cacheItem->isHit()) {
            $reportData = $cacheItem->get();
        } else {
            $listings = $this->fetchWorkspaceListings($user, $entityManager->getRepository(\App\Entity\ProductListing::class), $entityManager);
            $searchInsights = $this->fetchSearchInsights($user, $entityManager);
            $reportData = $this->buildReportCsvData($user, $upperType, $listings, $entityManager, $searchInsights);

            if ($reportData === null) {
                return $this->json(['error' => 'Unknown report type.'], 422);
            }

            $cacheItem->set($reportData);
            $cacheItem->expiresAfter(300);
            $this->cache->save($cacheItem);
        }

        $response = new StreamedResponse(function () use ($reportData) {
            $output = fopen('php://output', 'wb');
            $this->writeCsvRows($output, $reportData['headers'], $reportData['rows']);

            fclose($output);
        });

        $response->headers->set('Content-Type', 'text/csv; charset=utf-8');
        $response->headers->set('Content-Disposition', 'attachment; filename="' . strtolower($reportType) . '_report_' . date('Y-m-d') . '.csv"');

        return $response;
    }

    #[Route('/{firebaseUid}/listings/export', name: 'b2b_workspace_listings_export', methods: ['GET'])]
    public function exportListingsCsv(
        string $firebaseUid,
        UserRepository $userRepository,
        ProductListingRepository $productListingRepository,
        EntityManagerInterface $entityManager,
    ): Response {
        $user = $this->resolveWorkspaceUser($firebaseUid, $userRepository);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $listings = $this->fetchWorkspaceListings($user, $productListingRepository, $entityManager);

        $headers = ['Product Name', 'Brand', 'Category', 'Price (DT)', 'Market Rank', 'Trust Score', 'Stock Status', 'Last Updated'];
        $rows = array_map(function (array $row): array {
            $rank = isset($row['vendor_rank'], $row['total_sellers'])
                ? $row['vendor_rank'] . ' of ' . $row['total_sellers']
                : '-';
            return [
                $row['productName'] ?? '-',
                $row['productBrand'] ?? '-',
                $row['categoryName'] ?? '-',
                isset($row['price']) && is_numeric($row['price']) ? number_format((float) $row['price'], 2) : '-',
                $rank,
                isset($row['trust_score']) && is_numeric($row['trust_score']) ? number_format((float) $row['trust_score'], 1) : '-',
                ($row['availability'] ?? null) === true ? 'In Stock' : 'Out of Stock',
                $row['updated_at'] ?? '-',
            ];
        }, $listings);

        $response = new StreamedResponse(function () use ($headers, $rows) {
            $output = fopen('php://output', 'wb');
            fputcsv($output, $headers);
            foreach ($rows as $row) {
                fputcsv($output, $row);
            }
            fclose($output);
        });

        $response->headers->set('Content-Type', 'text/csv; charset=utf-8');
        $response->headers->set('Content-Disposition', 'attachment; filename="listings_' . date('Y-m-d') . '.csv"');

        return $response;
    }

    #[Route('/{firebaseUid}/subscription/renew', name: 'b2b_workspace_subscription_renew', methods: ['POST'])]
    public function renewSubscription(
        string $firebaseUid,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->resolveWorkspaceUser($firebaseUid, $userRepository);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $currentSub = $entityManager->getRepository(Subscription::class)->findOneBy(
            ['owner_type' => $user instanceof B2BCompany ? 'COMPANY' : 'MARKET', 'owner_id' => $user->getId(), 'active' => true],
            ['created_at' => 'DESC', 'id' => 'DESC']
        );

        if (!$currentSub instanceof Subscription) {
            return $this->json(['error' => 'No active subscription to renew.'], 404);
        }

        $newSub = new Subscription();
        $newSub->setOwnerType($currentSub->getOwnerType() ?? ($user instanceof B2BCompany ? 'COMPANY' : 'MARKET'));
        $newSub->setOwnerId((int) $user->getId());
        $newSub->setPlanType($currentSub->getPlanType() ?? 'B2B_SILVER');
        $newSub->setDurationMonths($currentSub->getDurationMonths());
        $newSub->setStartDate(new \DateTimeImmutable());
        $newSub->setEndDate((new \DateTimeImmutable())->modify('+' . ($currentSub->getDurationMonths() ?? 12) . ' months'));
        $newSub->setActive(false);
        $newSub->setCreatedAt(new \DateTimeImmutable());

        $entityManager->persist($newSub);
        $entityManager->flush();

        $this->cacheVersionManager->bumpVersion($firebaseUid);

        $notification = new Notification();
        $notification->setType('SUBSCRIPTION_RENEWAL_REQUESTED');
        $notification->setMessage(sprintf('Renewal requested for %s plan (%d months). Awaiting admin approval.', $currentSub->getPlanType(), $currentSub->getDurationMonths() ?? 12));
        $notification->setSeverity('INFO');
        $notification->setIsRead(false);
        $notification->setCreatedAt(new \DateTimeImmutable());
        if ($user instanceof B2BCompany) $notification->setCompany($user);
        if ($user instanceof B2BMarket) $notification->setMarket($user);
        $entityManager->persist($notification);
        $entityManager->flush();

        return $this->json(['id' => $newSub->getId(), 'status' => 'PENDING', 'message' => 'Renewal request submitted. Awaiting admin approval.'], 201);
    }

    #[Route('/{firebaseUid}/subscription/upgrade', name: 'b2b_workspace_subscription_upgrade', methods: ['POST'])]
    public function upgradeSubscription(
        string $firebaseUid,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->resolveWorkspaceUser($firebaseUid, $userRepository);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        if ($this->gatingService->isGoldPlan($user)) {
            return $this->json(['error' => 'You are already on a Gold plan.'], 409);
        }

        $newSub = new Subscription();
        $newSub->setOwnerType($user instanceof B2BMarket ? 'MARKET' : 'COMPANY');
        $newSub->setOwnerId((int) $user->getId());
        $newSub->setPlanType('B2B_GOLD');
        $newSub->setDurationMonths(12);
        $newSub->setStartDate(new \DateTimeImmutable());
        $newSub->setEndDate((new \DateTimeImmutable())->modify('+12 months'));
        $newSub->setActive(false);
        $newSub->setCreatedAt(new \DateTimeImmutable());

        $entityManager->persist($newSub);

        $this->cacheVersionManager->bumpVersion($firebaseUid);

        // Notify
        $notification = new Notification();
        $notification->setType('SUBSCRIPTION_UPGRADE_REQUESTED');
        $notification->setMessage('Upgrade to Gold plan requested. Awaiting admin approval.');
        $notification->setSeverity('INFO');
        $notification->setIsRead(false);
        $notification->setCreatedAt(new \DateTimeImmutable());
        if ($user instanceof B2BCompany) $notification->setCompany($user);
        if ($user instanceof B2BMarket) $notification->setMarket($user);
        $entityManager->persist($notification);
        $entityManager->flush();

        return $this->json(['id' => $newSub->getId(), 'status' => 'PENDING', 'message' => 'Upgrade request submitted. Awaiting admin approval.'], 201);
    }

    #[Route('/{firebaseUid}/profile', name: 'b2b_workspace_profile_update', methods: ['PUT'])]
    public function updateProfile(
        string $firebaseUid,
        Request $request,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->resolveWorkspaceUser($firebaseUid, $userRepository);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        if (!$user instanceof B2BCompany) {
            return $this->json(['error' => 'Profile updates are only available for B2B companies.'], 403);
        }

        $body = json_decode((string) $request->getContent(), true);
        if (!is_array($body)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        if (isset($body['fullName'])) $user->setFullName((string) $body['fullName']);
        if (isset($body['companyName'])) $user->setCompanyName((string) $body['companyName']);
        if (isset($body['companyWebsite'])) $user->setCompanyWebsite((string) $body['companyWebsite']);
        if (isset($body['companyCountry'])) $user->setCompanyCountry((string) $body['companyCountry']);
        if (isset($body['companyMarket'])) $user->setCompanyMarket((string) $body['companyMarket']);

        $entityManager->flush();
        $this->cacheVersionManager->bumpVersion($firebaseUid);

        return $this->json(['success' => true]);
    }

    #[Route('/{firebaseUid}/watchlist/search', name: 'b2b_workspace_watchlist_search', methods: ['GET'])]
    public function watchlistSearch(
        string $firebaseUid,
        Request $request,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->resolveWorkspaceUser($firebaseUid, $userRepository);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $q = trim((string) $request->query->get('q', ''));
        if (mb_strlen($q) < 2) {
            return $this->json(['items' => []]);
        }

        return $this->cachedGet($this->cache, $this->buildUserCacheKey($this->cacheVersionManager, $firebaseUid, self::CACHE_KEY_WATCHLIST_SEARCH_PREFIX . md5($q)), static function () use ($entityManager, $q): array {
            $qb = $entityManager->getRepository(Product::class)->createQueryBuilder('p')
                ->select('p.id, p.name, p.brand')
                ->where('LOWER(p.name) LIKE LOWER(:q)')
                ->orWhere('LOWER(p.brand) LIKE LOWER(:q)')
                ->setParameter('q', '%' . $q . '%')
                ->setMaxResults(20)
                ->orderBy('p.name', 'ASC');

            $results = $qb->getQuery()->getResult();

            return [
                'items' => array_map(static fn (array $r) => [
                    'id' => (int) $r['id'],
                    'name' => $r['name'],
                    'brand' => $r['brand'],
                ], $results),
            ];
        }, 60);
    }

    #[Route('/{firebaseUid}/watchlist', name: 'b2b_workspace_watchlist_list', methods: ['GET'])]
    public function watchlistList(
        string $firebaseUid,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->resolveWorkspaceUser($firebaseUid, $userRepository);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        return $this->cachedGet($this->cache, $this->buildUserCacheKey($this->cacheVersionManager, $firebaseUid, self::CACHE_KEY_WATCHLIST_PREFIX), function () use ($user, $entityManager): array {
            $criteria = $user instanceof B2BCompany ? ['company' => $user] : ['market' => $user];
            $items = $entityManager->getRepository(B2BWatchlist::class)->findBy(
                $criteria,
                ['created_at' => 'DESC'],
                100
            );

            $productIds = array_filter(array_map(static fn (B2BWatchlist $w) => $w->getProduct()?->getId(), $items));
            $productData = [];
            if (!empty($productIds)) {
                $listings = $entityManager->createQueryBuilder()
                    ->select('IDENTITY(pl.product) AS pid, MIN(pl.price) AS min_price, MAX(pl.price) AS max_price, COUNT(pl.id) AS total_sellers')
                    ->from(ProductListing::class, 'pl')
                    ->where('pl.product IN (:pids)')
                    ->andWhere('pl.is_active = true')
                    ->andWhere('pl.price IS NOT NULL')
                    ->setParameter('pids', $productIds)
                    ->groupBy('pl.product')
                    ->getQuery()
                    ->getResult();

                foreach ($listings as $row) {
                    $pid = (int) $row['pid'];
                    $productData[$pid] = [
                        'cheapest_price' => (float) $row['min_price'],
                        'highest_price' => (float) $row['max_price'],
                        'total_sellers' => (int) $row['total_sellers'],
                    ];
                }
            }

            return [
                'items' => array_map(function (B2BWatchlist $w) use ($productData) {
                    $product = $w->getProduct();
                    $pid = $product?->getId();
                    $current = $productData[$pid] ?? null;
                    $cheapestPrice = $current['cheapest_price'] ?? null;
                    $baselinePrice = $w->getBaselinePrice();
                    $priceDelta = null;
                    if ($cheapestPrice !== null && $baselinePrice !== null) {
                        $priceDelta = $cheapestPrice - $baselinePrice;
                    }
                    return [
                        'id' => $w->getId(),
                        'product_id' => $pid,
                        'product_name' => $product?->getName() ?? 'Unknown',
                        'product_image' => $product?->getImageUrl(),
                        'product_brand' => $product?->getBrand(),
                        'followed_at' => $w->getCreatedAt()?->format(\DateTimeInterface::ATOM),
                        'cheapest_price' => $cheapestPrice,
                        'highest_price' => $current['highest_price'] ?? null,
                        'total_sellers' => $current['total_sellers'] ?? 0,
                        'baseline_price' => $baselinePrice,
                        'price_delta' => $priceDelta,
                    ];
                }, $items),
            ];
        }, 60);
    }

    #[Route('/{firebaseUid}/watchlist', name: 'b2b_workspace_watchlist_add', methods: ['POST'])]
    public function watchlistAdd(
        string $firebaseUid,
        Request $request,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->resolveWorkspaceUser($firebaseUid, $userRepository);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $body = json_decode((string) $request->getContent(), true);
        if (!is_array($body) || empty($body['product_id'])) {
            return $this->json(['error' => 'product_id is required.'], 422);
        }

        $productId = (int) $body['product_id'];
        $product = $entityManager->find(Product::class, $productId);
        if (!$product instanceof Product) {
            return $this->json(['error' => 'Product not found.'], 404);
        }

        // Check limit
        $isGold = $this->gatingService->isGoldPlan($user);
        $maxItems = $isGold ? 15 : 5;
        $criteria = $user instanceof B2BCompany ? ['company' => $user] : ['market' => $user];
        $currentCount = (int) $entityManager->getRepository(B2BWatchlist::class)->count($criteria);
        if ($currentCount >= $maxItems) {
            return $this->json(['error' => sprintf('Watchlist limit reached (%d). Upgrade to Gold for up to 15 items.', $maxItems)], 403);
        }

        // Check duplicate
        $existing = $entityManager->getRepository(B2BWatchlist::class)->findOneBy([
            'company' => $user instanceof B2BCompany ? $user : null,
            'market' => $user instanceof B2BMarket ? $user : null,
            'product' => $product,
        ]);
        if ($existing instanceof B2BWatchlist) {
            return $this->json(['error' => 'Product already in watchlist.', 'id' => $existing->getId()], 409);
        }

        $watchlist = new B2BWatchlist();
        $watchlist->setOwnerType($user instanceof B2BMarket ? 'B2B_MARKET' : 'B2B_COMPANY');
        if ($user instanceof B2BCompany) {
            $watchlist->setCompany($user);
        }
        $watchlist->setProduct($product);
        $watchlist->setItemType('PRODUCT');
        $watchlist->setCreatedAt(new \DateTimeImmutable());
        $watchlist->setUpdatedAt(new \DateTimeImmutable());

        // Capture current cheapest price as baseline
        $cheapest = $entityManager->createQueryBuilder()
            ->select('MIN(pl.price)')
            ->from(ProductListing::class, 'pl')
            ->where('pl.product = :product')
            ->andWhere('pl.is_active = true')
            ->andWhere('pl.price IS NOT NULL')
            ->setParameter('product', $product)
            ->getQuery()
            ->getSingleScalarResult();

        if ($cheapest !== null) {
            $watchlist->setBaselinePrice((float) $cheapest);
        }

        $entityManager->persist($watchlist);
        $entityManager->flush();

        $this->cacheVersionManager->bumpVersion($firebaseUid);

        return $this->json(['id' => $watchlist->getId(), 'status' => 'added'], 201);
    }

    #[Route('/{firebaseUid}/watchlist/{id}', name: 'b2b_workspace_watchlist_remove', methods: ['DELETE'])]
    public function watchlistRemove(
        string $firebaseUid,
        int $id,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->resolveWorkspaceUser($firebaseUid, $userRepository);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $watchlist = $entityManager->find(B2BWatchlist::class, $id);
        if (!$watchlist instanceof B2BWatchlist) {
            return $this->json(['error' => 'Watchlist item not found.'], 404);
        }

        $owner = $user instanceof B2BCompany ? $watchlist->getCompany() : $watchlist->getMarket();
        if ($owner?->getId() !== $user->getId()) {
            return $this->json(['error' => 'Watchlist item not found.'], 404);
        }

        $entityManager->remove($watchlist);
        $entityManager->flush();

        $this->cacheVersionManager->bumpVersion($firebaseUid);

        return $this->json(['status' => 'removed']);
    }

    #[Route('/{firebaseUid}/listings/{listingId}/compare', name: 'b2b_workspace_listing_compare', methods: ['GET'])]
    public function compareListing(
        string $firebaseUid,
        int $listingId,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->resolveWorkspaceUser($firebaseUid, $userRepository);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $listing = $entityManager->find(\App\Entity\ProductListing::class, $listingId);
        if (!$listing instanceof \App\Entity\ProductListing) {
            return $this->json(['error' => 'Listing not found.'], 404);
        }

        $product = $listing->getProduct();
        if (!$product instanceof \App\Entity\Product) {
            return $this->json(['error' => 'Listing has no product.'], 404);
        }

        return $this->cachedGet($this->cache, $this->buildUserCacheKey($this->cacheVersionManager, $firebaseUid, self::CACHE_KEY_COMPARE_LISTING_PREFIX . $listingId), function () use ($product, $user, $entityManager): array {
            $response = $this->compareByProduct($product, $user, $entityManager);
            $data = json_decode($response->getContent(), true);
            return is_array($data) ? $data : [];
        }, 60);
    }

    #[Route('/{firebaseUid}/products/{productId}/compare', name: 'b2b_workspace_product_compare', methods: ['GET'])]
    public function compareProduct(
        string $firebaseUid,
        int $productId,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->resolveWorkspaceUser($firebaseUid, $userRepository);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $product = $entityManager->find(\App\Entity\Product::class, $productId);
        if (!$product instanceof \App\Entity\Product) {
            return $this->json(['error' => 'Product not found.'], 404);
        }

        return $this->cachedGet($this->cache, $this->buildUserCacheKey($this->cacheVersionManager, $firebaseUid, self::CACHE_KEY_COMPARE_PRODUCT_PREFIX . $productId), function () use ($product, $user, $entityManager): array {
            $response = $this->compareByProduct($product, $user, $entityManager);
            $data = json_decode($response->getContent(), true);
            return is_array($data) ? $data : [];
        }, 60);
    }

    private function compareByProduct(\App\Entity\Product $product, B2BCompany|B2BMarket $user, EntityManagerInterface $entityManager): JsonResponse
    {
        $sellerId = $user instanceof B2BCompany ? $user->getSeller()?->getId() : null;

        // Fetch all active listings for the same product
        $allListings = $entityManager->createQueryBuilder()
            ->select('pl, s.name as sellerName, s.id as sellerId')
            ->from(\App\Entity\ProductListing::class, 'pl')
            ->join('pl.seller', 's')
            ->join('pl.product', 'p')
            ->where('p.id = :pid')
            ->andWhere('pl.is_active = true')
            ->setParameter('pid', $product->getId())
            ->orderBy('pl.price', 'ASC')
            ->getQuery()
            ->getResult();

        $rows = [];
        $vendorListing = null;
        foreach ($allListings as $row) {
            $pl = $row[0];
            $rowSellerId = (int) $row['sellerId'];
            $isVendor = $sellerId !== null && $rowSellerId === $sellerId;
            $entry = [
                'listing_id' => $pl->getId(),
                'seller_id' => $rowSellerId,
                'seller_name' => $pl->getSeller()?->getName() ?? $row['sellerName'] ?? 'Unknown',
                'price' => $pl->getPrice(),
                'old_price' => $pl->getOldPrice(),
                'availability' => $pl->isAvailability(),
                'trust_score' => $pl->getTrustScore(),
                'trust_score_breakdown' => $pl->getTrustScoreBreakdown(),
                'product_url' => $pl->getProductUrl(),
                'is_vendor' => $isVendor,
                'updated_at' => $pl->getUpdatedAt()?->format(\DateTimeInterface::ATOM),
            ];

            if ($isVendor) {
                $vendorListing = $entry;
            }
            $rows[] = $entry;
        }

        // Fetch price history for the chart
        $priceHistory = $entityManager->getConnection()->fetchAllAssociative(
            'SELECT plh.product_listing_id AS listing_id, plh.recorded_price AS price, plh.recorded_at
             FROM price_history plh
             WHERE plh.product_listing_id IN (
                 SELECT pl2.id FROM product_listing pl2 WHERE pl2.product_id = :pid AND pl2.is_active = true
             )
             ORDER BY plh.recorded_at ASC',
            ['pid' => $product->getId()]
        );

        $priceHistoryByListing = [];
        foreach ($priceHistory as $ph) {
            $lid = (int) $ph['listing_id'];
            $priceHistoryByListing[$lid][] = [
                'price' => (float) $ph['price'],
                'recorded_at' => $ph['recorded_at'],
            ];
        }

        return $this->json([
            'product' => [
                'id' => $product->getId(),
                'name' => $product->getName(),
                'brand' => $product->getBrand(),
                'image' => $product->getImageUrl(),
            ],
            'vendor_listing' => $vendorListing,
            'competitors' => $rows,
            'price_history' => $priceHistoryByListing,
            'stats' => [
                'total_sellers' => count($rows),
                'cheapest_price' => count($rows) > 0 ? min(array_column($rows, 'price')) : null,
                'highest_price' => count($rows) > 0 ? max(array_column($rows, 'price')) : null,
                'vendor_rank' => $vendorListing !== null ? array_search($vendorListing['listing_id'], array_column($rows, 'listing_id')) + 1 : null,
            ],
        ]);
    }

    #[Route('/{firebaseUid}/scraping-requests', name: 'b2b_workspace_scraping_requests', methods: ['GET', 'POST'])]
    public function scrapingRequests(
        string $firebaseUid,
        Request $request,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->resolveWorkspaceUser($firebaseUid, $userRepository);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        if ($request->isMethod('GET')) {
            return $this->cachedGet($this->cache, $this->buildUserCacheKey($this->cacheVersionManager, $firebaseUid, self::CACHE_KEY_SCRAPING_PREFIX), function () use ($user, $entityManager): array {
                $criteria = match (true) {
                    $user instanceof B2BCompany => ['company' => $user],
                    $user instanceof B2BMarket => ['market' => $user],
                    default => ['company' => -1], // return nothing for unknown types
                };
                $items = $entityManager->getRepository(B2BScrapingRequest::class)->findBy(
                    $criteria,
                    ['created_at' => 'DESC', 'id' => 'DESC'],
                    100,
                );

                return [
                    'items' => array_map(fn (B2BScrapingRequest $item) => $this->serializeScrapingRequest($item), $items),
                ];
            });
        }

        $body = json_decode((string) $request->getContent(), true);
        if (!is_array($body)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        $targetUrl = trim((string) ($body['targetUrl'] ?? ''));
        $targetType = $this->normalizeString($body['targetType'] ?? 'PRODUCT');
        if ($targetUrl === '') {
            return $this->json(['error' => 'Target URL is required.'], 422);
        }

        // Quota check via SubscriptionContextResolver
        $quotaCheck = $this->subscriptionResolver->checkQuota($user, 'scraping_requests', 1);
        if (!$quotaCheck['allowed']) {
            return $this->json([
                'error' => $quotaCheck['reason'] ?? 'Scraping quota exceeded.',
                'usage' => $quotaCheck['usage'],
            ], 429);
        }

        $normalizedUrl = mb_strtolower($targetUrl);

        // Primary check: existing DB-level duplicate detection
        $duplicateReason = $this->detectScrapingDuplicateReason($normalizedUrl, $entityManager);

        // Secondary check: intelligent URL normalization + domain clustering
        $similarityWarning = null;
        $similarUrls = [];
        if ($duplicateReason === null) {
            $detection = $this->urlDuplicateDetector->detectDuplicate($targetUrl);
            if ($detection['is_duplicate']) {
                // HIGH similarity → reject
                $duplicateReason = $detection['duplicate_reason']
                    ?? ($detection['suggestion'] ?? 'URL already tracked (similar match).');
            } elseif (($detection['similarity_level'] ?? null) === 'MEDIUM') {
                // MEDIUM similarity → warn but don't reject
                $similarityWarning = $detection['warning'] ?? 'URL appears similar to existing tracked URLs';
                $similarUrls = $detection['similar_urls'] ?? [];
            }
        }

        $scrapingRequest = new B2BScrapingRequest();
        $scrapingRequest->setOwnerType($user instanceof B2BMarket ? 'B2B_MARKET' : 'B2B_COMPANY');
        if ($user instanceof B2BCompany) {
            $scrapingRequest->setCompany($user);
        }
        $scrapingRequest->setTargetType($targetType);
        $scrapingRequest->setTargetUrl($targetUrl);
        $scrapingRequest->setNotes($this->normalizeNullableString($body['notes'] ?? null));
        $scrapingRequest->setCreatedAt(new \DateTimeImmutable());
        $scrapingRequest->setUpdatedAt(new \DateTimeImmutable());

        if ($duplicateReason !== null) {
            $scrapingRequest->setStatus('REJECTED');
            $scrapingRequest->setIsDuplicate(true);
            $scrapingRequest->setDuplicateReason($duplicateReason);
        } else {
            $scrapingRequest->setStatus('PENDING');
            $scrapingRequest->setIsDuplicate(false);
        }

        $entityManager->persist($scrapingRequest);
        $entityManager->flush();

        if ($duplicateReason === null) {
            $this->subscriptionResolver->recordUsage($user, 'scraping_requests');
        }

        $this->cacheVersionManager->bumpVersion($firebaseUid);

        $response = $this->serializeScrapingRequest($scrapingRequest);
        if ($similarityWarning !== null) {
            $response['warning'] = $similarityWarning;
            $response['similar_urls'] = $similarUrls;
        }

        return $this->json($response, 201);
    }


    private function resolveWorkspaceUser(string $firebaseUid, UserRepository $userRepository): B2BCompany|B2BMarket|JsonResponse
    {
        // Primary: ownership-based resolution via B2BIdentityService
        $company = $this->b2bIdentityService->resolveB2BCompanyByOwnership($firebaseUid);
        if ($company instanceof B2BCompany) {
            return $company;
        }

        $market = $this->b2bIdentityService->resolveB2BMarketByOwnership($firebaseUid);
        if ($market instanceof B2BMarket) {
            return $market;
        }

        // If ownership resolution returned 403 (ownership mismatch), reject — don't fall back
        $error = $company instanceof JsonResponse ? $company : $market;
        if ($error->getStatusCode() === 403) {
            return $error;
        }

        // Legacy fallback: firebase_uid lookup only (backward compatibility)
        $user = $userRepository->findOneBy(['firebase_uid' => $firebaseUid]);
        if (!$user instanceof B2BCompany && !$user instanceof B2BMarket) {
            return $this->json(['error' => 'B2B user not found.'], 404);
        }

        if ($user->isVerified() !== true) {
            return $this->json(['error' => 'B2B account is not verified.'], 403);
        }

        return $user;
    }

    private function firePlanExpiryWarning(B2BCompany|B2BMarket $user, EntityManagerInterface $entityManager): void
    {
        $ownerType = $user instanceof B2BCompany ? 'COMPANY' : 'MARKET';
        $current = $entityManager->getRepository(Subscription::class)->findOneBy(
            ['owner_type' => $ownerType, 'owner_id' => $user->getId()],
            ['created_at' => 'DESC', 'id' => 'DESC']
        );

        if (!$current instanceof Subscription || !$current->isActive()) {
            return;
        }

        $endDate = $current->getEndDate();
        if (!$endDate) return;

        $daysLeft = (int) (new \DateTimeImmutable())->diff($endDate)->days;
        if ($daysLeft > 30 || $daysLeft < 0) return;

        $notifCriteria = $user instanceof B2BCompany
            ? ['company' => $user, 'type' => 'SUBSCRIPTION_EXPIRY_WARNING', 'is_read' => false]
            : ['market' => $user, 'type' => 'SUBSCRIPTION_EXPIRY_WARNING', 'is_read' => false];

        $existing = $entityManager->getRepository(Notification::class)->findOneBy(
            $notifCriteria,
            ['created_at' => 'DESC']
        );

        if ($existing instanceof Notification) return;

        $this->b2bNotificationService->notifySubscriptionExpiryWarning($current, $daysLeft);
    }

    private function resolveWorkspaceSubscription(B2BCompany|B2BMarket $user, EntityManagerInterface $entityManager): array
    {
        $ownerType = $user instanceof B2BCompany ? 'COMPANY' : 'MARKET';
        $current = $entityManager->getRepository(Subscription::class)->findOneBy(
            ['owner_type' => $ownerType, 'owner_id' => $user->getId()],
            ['created_at' => 'DESC', 'id' => 'DESC']
        );

        if (!$current instanceof Subscription) {
            return [
                'source'         => 'none',
                'plan_type'      => null,
                'active'         => false,
                'duration_months' => null,
                'start_date'     => null,
                'end_date'       => null,
                'days_remaining' => null,
            ];
        }

        $now = new \DateTimeImmutable();
        $endDate = $current->getEndDate();
        $daysRemaining = $endDate !== null ? max(0, (int) $now->diff($endDate)->days) : null;
        if ($current->isActive() && $endDate !== null && $endDate <= $now) {
            $current->setActive(false);
            $entityManager->flush();
        }
        $isStillActive = $current->isActive();

        return [
            'source'          => 'b2b',
            'owner_type'      => $current->getOwnerType(),
            'plan_type'       => $current->getPlanType(),
            'active'          => $isStillActive,
            'duration_months' => $current->getDurationMonths(),
            'start_date'      => $current->getStartDate()?->format(\DateTimeInterface::ATOM),
            'end_date'        => $endDate?->format(\DateTimeInterface::ATOM),
            'days_remaining'  => $daysRemaining,
            'activated_at'    => $current->getActivatedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }

    private function fetchWorkspaceListings(B2BCompany|B2BMarket $user, ProductListingRepository $productListingRepository, EntityManagerInterface $entityManager): array
    {
        if ($user instanceof B2BCompany) {
            $sellerId = $user->getSeller()?->getId();
            if ($sellerId === null) {
                return [];
            }
            $rows = $productListingRepository->findListingRows(null, $sellerId);
            $listings = array_values(array_map(fn (array $row) => $this->normalizeListingRow($row), $rows));
            return $this->enrichListingsWithRank($listings, $entityManager);
        }

        $marketNames = array_filter([
            mb_strtolower((string) $user->getCompanyName()),
            mb_strtolower((string) $user->getCompanyMarket()),
        ]);
        
        $marketSellerId = $user->getSeller()?->getId();
        $rows = $productListingRepository->findListingRows(null, null);

        $filtered = array_filter($rows, static function (array $row) use ($marketNames, $marketSellerId): bool {
            if ($marketSellerId !== null && isset($row['sellerId']) && (int) $row['sellerId'] === $marketSellerId) {
                return true;
            }

            $brand = mb_strtolower(trim((string) ($row['productBrand'] ?? '')));
            return $brand !== '' && in_array($brand, $marketNames, true);
        });

        return array_values(array_map(fn (array $row) => $this->normalizeListingRow($row), $filtered));
    }

    private function enrichListingsWithRank(array $listings, EntityManagerInterface $entityManager): array
    {
        $listingIds = array_values(array_unique(array_filter(array_map(static fn (array $l) => $l['id'], $listings))));
        if (empty($listingIds)) {
            return $listings;
        }

        $conn = $entityManager->getConnection();
        $rows = $conn->fetchAllAssociative(
            'SELECT sq.id, sq.vendor_rank, sq.total_sellers, sq.min_price, sq.max_price
             FROM (
                 SELECT pl.id,
                        RANK() OVER (PARTITION BY pl.product_id ORDER BY pl.price ASC) AS vendor_rank,
                        COUNT(*) OVER (PARTITION BY pl.product_id) AS total_sellers,
                        MIN(pl.price) OVER (PARTITION BY pl.product_id) AS min_price,
                        MAX(pl.price) OVER (PARTITION BY pl.product_id) AS max_price
                 FROM product_listing pl
                 WHERE pl.product_id IN (
                     SELECT DISTINCT pl2.product_id FROM product_listing pl2 WHERE pl2.id IN (:ids)
                 ) AND pl.is_active = true AND pl.price IS NOT NULL
             ) sq
             WHERE sq.id IN (:ids)',
            ['ids' => $listingIds],
            ['ids' => ArrayParameterType::INTEGER]
        );

        $rankMap = [];
        foreach ($rows as $row) {
            $rankMap[(int) $row['id']] = [
                'vendor_rank' => (int) $row['vendor_rank'],
                'total_sellers' => (int) $row['total_sellers'],
                'cheapest_price' => (float) $row['min_price'],
                'max_price' => isset($row['max_price']) ? (float) $row['max_price'] : null,
            ];
        }

        return array_map(function (array $listing) use ($rankMap) {
            $id = $listing['id'];
            if ($id !== null && isset($rankMap[$id])) {
                $listing['vendor_rank'] = $rankMap[$id]['vendor_rank'];
                $listing['total_sellers'] = $rankMap[$id]['total_sellers'];
                $listing['cheapest_price'] = $rankMap[$id]['cheapest_price'];
                $listing['max_price'] = $rankMap[$id]['max_price'];
            } else {
                $listing['vendor_rank'] = null;
                $listing['total_sellers'] = null;
                $listing['cheapest_price'] = null;
                $listing['max_price'] = null;
            }
            return $listing;
        }, $listings);
    }

    private function buildWorkspaceMetrics(B2BCompany|B2BMarket $user, array $rows, EntityManagerInterface $entityManager, array $searchInsights): array
    {
        $trustScores = array_values(array_filter(array_map(static fn (array $row): ?float => is_numeric($row['trust_score'] ?? null) ? (float) $row['trust_score'] : null, $rows)));
        $averageTrustScore = count($trustScores) > 0 ? round(array_sum($trustScores) / count($trustScores), 2) : null;
        $inStockCount = count(array_filter($rows, static fn (array $row): bool => ($row['availability'] ?? null) === true));
        $outOfStockCount = count(array_filter($rows, static fn (array $row): bool => ($row['availability'] ?? null) === false));
        $notificationsCount = count($this->fetchWorkspaceNotifications($user, $entityManager, 1000));

        $sevenDaysAgo = (new \DateTimeImmutable())->modify('-7 days');
        $sevenDaysStr = $sevenDaysAgo->format(\DateTimeInterface::ATOM);
        $newThisWeek = 0;
        foreach ($rows as $row) {
            $created = $row['created_at'] ?? null;
            if ($created instanceof \DateTimeInterface) {
                if ($created >= $sevenDaysAgo) {
                    ++$newThisWeek;
                }
            } elseif (is_string($created) && $created >= $sevenDaysStr) {
                ++$newThisWeek;
            }
        }

        $gatingService = $this->gatingService;
        $isGold = $gatingService->canAccessFeature($user, B2BPlanGatingService::FEATURE_COMPETITOR_PRICING);

        if ($user instanceof B2BCompany) {
            $vendorSellerId = $user->getSeller()?->getId();
            // Fallback: derive seller ID from the vendor's own listings if not set on the entity
            if ($vendorSellerId === null) {
                $sellerIdsFromListings = array_unique(array_filter(array_map(static fn (array $row): ?int => isset($row['sellerId']) ? (int) $row['sellerId'] : null, $rows)));
                if (count($sellerIdsFromListings) === 1) {
                    $vendorSellerId = (int) reset($sellerIdsFromListings);
                }
            }

            $productsCount = count(array_unique(array_filter(array_map(static fn (array $row): ?int => isset($row['productId']) ? (int) $row['productId'] : null, $rows))));
            $trackingLimit = str_contains(strtoupper((string) $this->resolveWorkspaceSubscription($user, $entityManager)['plan_type'] ?? ''), 'GOLD') ? 50 : 20;

            // Fetch tracked product IDs from the vendor's watchlist
            $trackedProductIds = [];
            $watchlistItems = $entityManager->getRepository(\App\Entity\B2BWatchlist::class)->findBy(
                $user instanceof B2BCompany ? ['company' => $user] : ['market' => $user]
            );
            foreach ($watchlistItems as $w) {
                $pid = $w->getProduct()?->getId();
                if ($pid !== null) {
                    $trackedProductIds[] = $pid;
                }
            }

            $competitorPricing = $isGold && $vendorSellerId !== null && $productsCount > 0
                ? $this->buildVendorCompetitorPricing($rows, $entityManager, $vendorSellerId, $trackingLimit, $trackedProductIds)
                : [];

            $cheapestCount = 0;
            foreach ($competitorPricing as $cp) {
                if (isset($cp['vendor_rank']) && (int) $cp['vendor_rank'] === 1) {
                    ++$cheapestCount;
                }
            }

            // Count unread competitive events from notifications
            $competitiveTypes = ['COMPETITOR_UNDERCUT', 'COMPETITOR_OOS', 'NEW_COMPETITOR', 'STOCK_OPPORTUNITY', 'COMPETITOR_TRUST_DROP', 'STOCK_SHORTAGE', 'TRUST_DROP'];
            $unreadCompetitive = 0;
            foreach ($this->fetchWorkspaceNotifications($user, $entityManager, 50) as $n) {
                if (!$n['is_read'] && in_array($n['type'], $competitiveTypes, true)) {
                    ++$unreadCompetitive;
                }
            }

            $stockMonitoring = $this->enrichStockMonitoringWithSellers(
                $this->buildStockMonitoring($rows),
                $rows,
                $entityManager,
            );

            $metrics = [
                'mode' => 'vendor',
                'products_count' => $productsCount,
                'new_products_this_week' => $newThisWeek,
                'listings_count' => count($rows),
                'average_trust_score' => $averageTrustScore,
                'in_stock_count' => $inStockCount,
                'out_of_stock_count' => $outOfStockCount,
                'notifications_count' => $notificationsCount,
                'cheapest_count' => $cheapestCount,
                'total_compared' => count($competitorPricing),
                'unread_competitive_events' => $unreadCompetitive,
                'stock_monitoring' => $stockMonitoring,
                'competitor_reliability' => $this->buildOOSReliability($entityManager),
                'top_listings' => array_slice($rows, 0, $trackingLimit),
                'tracking_limit' => $trackingLimit,
                'tracked_product_ids' => $trackedProductIds,
                'competitor_pricing' => $competitorPricing,
                'opportunities' => $isGold && $vendorSellerId !== null && $productsCount > 0
                    ? $this->buildVendorOpportunities($rows, $entityManager)
                    : [],
            ];

            return $metrics;
        }

        $competitorRanking = $this->buildCompetitorRanking($rows);
        $stockIntelligence = $this->buildMarketStockIntelligence($rows, $entityManager);

        $metrics = [
            'mode' => 'market',
            'brand_name' => $user->getCompanyName(),
            'products_count' => count(array_unique(array_filter(array_map(static fn (array $row): ?int => isset($row['productId']) ? (int) $row['productId'] : null, $rows)))),
            'listings_count' => count($rows),
            'average_trust_score' => $averageTrustScore,
            'in_stock_count' => $inStockCount,
            'out_of_stock_count' => $outOfStockCount,
            'notifications_count' => $notificationsCount,
            'share_of_shelf' => $this->buildShareOfShelf($user, $rows, $entityManager),
            'price_dispersion' => $this->buildPriceDispersion($rows),
            'competitor_ranking' => $competitorRanking,
            'competitor_brands' => $competitorRanking,
            'stock_intelligence' => $stockIntelligence,
            'stock_by_seller' => $stockIntelligence,
            'competitor_reliability' => $this->buildOOSReliability($entityManager),
        ];

        if ($isGold) {
            $reputation = $this->buildReputationIntelligence($rows, $entityManager);
            $metrics['reputation'] = $reputation;
            $metrics['reviews_sentiment'] = $reputation;
            $metrics['reviews'] = $reputation;
            $metrics['demand_intelligence'] = $this->buildDemandIntelligence($searchInsights);
        } else {
            $empty = ['average_rating' => null, 'positive_keywords' => [], 'negative_keywords' => []];
            $metrics['reputation'] = $empty;
            $metrics['reviews_sentiment'] = $empty;
            $metrics['reviews'] = $empty;
            $metrics['demand_intelligence'] = ['top_queries' => [], 'zero_result_queries' => []];
        }

        return $metrics;
    }

    private function fetchWorkspaceNotifications(B2BCompany|B2BMarket $user, EntityManagerInterface $entityManager, int $limit): array
    {
        $qb = $entityManager->createQueryBuilder()
            ->select('n')
            ->from(Notification::class, 'n')
            ->orderBy('n.created_at', 'DESC')
            ->setMaxResults($limit);

        if ($user instanceof B2BCompany) {
            $qb->andWhere('n.company = :company OR n.client = :client')
                ->setParameter('company', $user)
                ->setParameter('client', $user);
        } else {
            $qb->andWhere('n.market = :market OR n.client = :client')
                ->setParameter('market', $user)
                ->setParameter('client', $user);
        }

        $items = $qb->getQuery()->getResult();

        return array_map(static fn (Notification $notification): array => [
            'id' => $notification->getId(),
            'type' => $notification->getType(),
            'message' => $notification->getMessage(),
            'severity' => $notification->getSeverity(),
            'is_read' => $notification->isRead(),
            'created_at' => $notification->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            'product_listing_id' => $notification->getProductListing()?->getId(),
        ], $items);
    }

    private function fetchSearchInsights(B2BCompany|B2BMarket $user, EntityManagerInterface $entityManager): array
    {
        $repo = $entityManager->getRepository(B2BSearchLog::class);

        // 1. Fetch user-specific logs (if any)
        $criteria = $user instanceof B2BCompany ? ['company' => $user] : ['market' => $user];
        $userLogs = $repo->findBy($criteria, ['created_at' => 'DESC'], 100);

        // 2. Fetch global B2C search logs to provide "Market Demand Intelligence"
        $globalLogs = $repo->findBy(['owner_type' => 'GLOBAL'], ['created_at' => 'DESC'], 200);

        // Merge them
        $items = array_merge($userLogs, $globalLogs);

        $topQueries = [];
        $zeroResults = [];
        foreach ($items as $item) {
            if (!$item instanceof B2BSearchLog) {
                continue;
            }
            $query = $item->getQuery();
            if ($query === null || trim($query) === '') {
                continue;
            }
            $lower = mb_strtolower(trim($query));
            $topQueries[$lower] = ($topQueries[$lower] ?? 0) + 1;
            if ($item->isZeroResults() === true) {
                $zeroResults[$lower] = ($zeroResults[$lower] ?? 0) + 1;
            }
        }

        arsort($topQueries);
        arsort($zeroResults);

        // Compute trending: queries with most growth (last 7 days vs previous 7 days)
        $trending = [];
        $trendThreshold = (new \DateTimeImmutable())->modify('-7 days');
        $recentQueries = [];
        $olderQueries = [];
        foreach ($items as $item) {
            if (!$item instanceof B2BSearchLog || ($q = $item->getQuery()) === null || trim($q) === '') continue;
            $lower = mb_strtolower(trim($q));
            $createdAt = $item->getCreatedAt();
            if ($createdAt !== null && $createdAt >= $trendThreshold) {
                $recentQueries[$lower] = ($recentQueries[$lower] ?? 0) + 1;
            } elseif ($createdAt !== null) {
                $olderQueries[$lower] = ($olderQueries[$lower] ?? 0) + 1;
            }
        }
        foreach ($recentQueries as $query => $recentCount) {
            $olderCount = $olderQueries[$query] ?? 0;
            if ($olderCount > 0 && $recentCount > $olderCount) {
                $trending[$query] = [
                    'query' => $query,
                    'current' => $recentCount,
                    'previous' => $olderCount,
                    'growth' => round((($recentCount - $olderCount) / $olderCount) * 100),
                ];
            }
        }
        usort($trending, fn ($a, $b) => $b['growth'] <=> $a['growth']);

        return [
            'top_queries' => array_slice($topQueries, 0, 10, true),
            'zero_result_queries' => array_slice($zeroResults, 0, 10, true),
            'trending' => array_slice($trending, 0, 5),
        ];
    }

    private function buildVendorCompetitorPricing(array $rows, EntityManagerInterface $entityManager, ?int $vendorSellerId, int $maxResults = 20, array $trackedProductIds = []): array
    {
        $allProductIds = array_values(array_unique(array_filter(array_map(static fn (array $row): ?int => isset($row['productId']) ? (int) $row['productId'] : null, $rows))));
        if ($allProductIds === [] || $vendorSellerId === null) {
            return [];
        }

        // If vendor has explicitly tracked products, only show those; otherwise show all
        $productIds = !empty($trackedProductIds)
            ? array_values(array_intersect($allProductIds, $trackedProductIds))
            : $allProductIds;

        if ($productIds === []) {
            return [];
        }

        // Fetch all listings for these products from the database
        $qb = $entityManager->createQueryBuilder()
            ->select('pl.price, s.name as sellerName, p.id as productId, p.name as productName, s.id as sellerId')
            ->from(\App\Entity\ProductListing::class, 'pl')
            ->join('pl.seller', 's')
            ->join('pl.product', 'p')
            ->where('p.id IN (:productIds)')
            ->setParameter('productIds', $productIds);

        $allListings = $qb->getQuery()->getResult();

        $grouped = [];
        foreach ($allListings as $listing) {
            $pid = (int) $listing['productId'];
            $price = is_numeric($listing['price']) ? (float) $listing['price'] : null;
            if ($price !== null) {
                $grouped[$pid][] = [
                    'price' => $price,
                    'sellerName' => $listing['sellerName'],
                    'sellerId' => (int) $listing['sellerId'],
                    'productName' => $listing['productName']
                ];
            }
        }

        $results = [];
        foreach ($grouped as $pid => $productRows) {
            usort($productRows, static fn (array $a, array $b): int => $a['price'] <=> $b['price']);

            $vendorRow = null;
            $vendorRank = 1;
            foreach ($productRows as $index => $row) {
                if ($row['sellerId'] === $vendorSellerId && $vendorRow === null) {
                    $vendorRow = $row;
                    $vendorRank = $index + 1;
                }
            }

            if ($vendorRow === null) {
                continue;
            }

            $cheapestCompetitor = null;
            foreach ($productRows as $row) {
                if ($row['sellerId'] !== $vendorSellerId) {
                    $cheapestCompetitor = $row;
                    break;
                }
            }

            $marketAverage = count($productRows) > 0 ? round(array_sum(array_column($productRows, 'price')) / count($productRows), 2) : $vendorRow['price'];

            $results[] = [
                'product_id' => $pid,
                'product_name' => $vendorRow['productName'],
                'vendor_price' => $vendorRow['price'],
                'cheapest_competitor_price' => $cheapestCompetitor['price'] ?? null,
                'competitor_seller_name' => $cheapestCompetitor['sellerName'] ?? null,
                'vendor_rank' => $vendorRank,
                'gap_to_cheapest' => $cheapestCompetitor !== null ? round($vendorRow['price'] - $cheapestCompetitor['price'], 2) : 0,
                'market_average_price' => $marketAverage,
            ];
        }

        return array_slice($results, 0, $maxResults);
    }

    private function buildStockMonitoring(array $rows): array
    {
        $items = [];
        foreach ($rows as $row) {
            $updatedAt = $row['updated_at'] ?? null;
            $items[] = [
                'product_id' => $row['productId'] ?? null,
                'product_name' => $row['productName'] ?? null,
                'category' => $row['categoryName'] ?? null,
                'out_of_stock_rate' => ($row['availability'] ?? null) === false ? 100 : 0,
                'trust_score' => $row['trust_score'] ?? null,
                'listing_url' => $row['product_url'] ?? null,
                'updated_at' => $updatedAt instanceof \DateTimeInterface ? $updatedAt->format(\DateTimeInterface::ATOM) : (is_string($updatedAt) ? $updatedAt : null),
            ];
        }

        return $items;
    }

    private function enrichStockMonitoringWithSellers(array $stockItems, array $rows, EntityManagerInterface $entityManager): array
    {
        $productIds = array_values(array_unique(array_filter(array_map(static fn (array $row): ?int => isset($row['productId']) ? (int) $row['productId'] : null, $rows))));
        if ($productIds === []) {
            return $stockItems;
        }

        $conn = $entityManager->getConnection();
        $allListings = $conn->fetchAllAssociative(
            'SELECT pl.id, pl.product_id, pl.price, pl.availability,
                    (SELECT tsh.score FROM trust_score_history tsh WHERE tsh.listing_id = pl.id ORDER BY tsh.created_at DESC LIMIT 1) AS trust_score,
                    pl.product_url,
                    s.name AS seller_name, s.id AS seller_id
             FROM product_listing pl
             JOIN seller s ON s.id = pl.seller_id
             WHERE pl.product_id IN (:ids) AND pl.is_active = true
             ORDER BY pl.product_id, pl.price ASC',
            ['ids' => $productIds],
            ['ids' => ArrayParameterType::INTEGER]
        );

        $grouped = [];
        foreach ($allListings as $listing) {
            $pid = (int) $listing['product_id'];
            $grouped[$pid][] = $listing;
        }

        $idMap = [];
        foreach ($stockItems as $i => $item) {
            $pid = $item['product_id'];
            if ($pid !== null) {
                $idMap[$pid] = $i;
            }
        }

        $vendorSellerIds = array_unique(array_filter(array_map(static fn (array $row): ?int => isset($row['sellerId']) ? (int) $row['sellerId'] : null, $rows)));

        foreach ($grouped as $pid => $listings) {
            if (!isset($idMap[$pid])) continue;
            $idx = $idMap[$pid];
            $stockItems[$idx]['sellers'] = array_map(fn (array $l) => [
                'seller_id' => (int) $l['seller_id'],
                'seller_name' => $l['seller_name'],
                'in_stock' => ($l['availability'] ?? null) === true || $l['availability'] === '1',
                'price' => $l['price'] !== null ? (float) $l['price'] : null,
                'trust_score' => $l['trust_score'] !== null ? (float) $l['trust_score'] : null,
                'is_vendor' => in_array((int) $l['seller_id'], $vendorSellerIds, true),
            ], $listings);
        }

        return $stockItems;
    }

    private function buildOOSReliability(EntityManagerInterface $entityManager): array
    {
        $thirtyDaysAgo = (new \DateTimeImmutable())->modify('-30 days');

        $rows = $entityManager->getConnection()->fetchAllAssociative(
            'SELECT s.id AS seller_id, s.name AS seller_name,
                    COUNT(ph.id) AS total_records,
                    SUM(CASE WHEN ph.out_of_stock = true THEN 1 ELSE 0 END) AS out_of_stock_count
             FROM price_history ph
             JOIN product_listing pl ON pl.id = ph.product_listing_id
             JOIN seller s ON s.id = pl.seller_id
             WHERE ph.recorded_at >= :since
             GROUP BY s.id, s.name
             HAVING COUNT(ph.id) >= 5
             ORDER BY out_of_stock_count DESC',
            ['since' => $thirtyDaysAgo->format('Y-m-d H:i:s')]
        );

        $results = [];
        foreach ($rows as $row) {
            $total = (int) $row['total_records'];
            $oosCount = (int) $row['out_of_stock_count'];
            $results[] = [
                'seller_id' => (int) $row['seller_id'],
                'seller_name' => $row['seller_name'],
                'total_records' => $total,
                'out_of_stock_count' => $oosCount,
                'oos_rate_30d' => $total > 0 ? round(($oosCount / $total) * 100, 1) : 0,
            ];
        }

        return $results;
    }

    private function buildVendorOpportunities(array $rows, EntityManagerInterface $entityManager): array
    {
        $opportunities = [];
        $productIds = array_unique(array_filter(array_map(static fn (array $row): ?int => isset($row['productId']) ? (int) $row['productId'] : null, $rows)));

        if (empty($productIds)) {
            return [];
        }

        // Get all active listings for the vendor's products with competitor context
        $allListings = $entityManager->createQueryBuilder()
            ->select('pl.price, s.name as sellerName, pl.availability, p.id as productId, p.name as productName, s.id as sellerId')
            ->from(\App\Entity\ProductListing::class, 'pl')
            ->join('pl.seller', 's')
            ->join('pl.product', 'p')
            ->where('p.id IN (:pids)')
            ->andWhere('pl.is_active = true')
            ->setParameter('pids', $productIds)
            ->getQuery()
            ->getResult();

        $grouped = [];
        foreach ($allListings as $l) {
            $pid = (int) $l['productId'];
            $grouped[$pid][] = $l;
        }

        // Find the vendor's seller IDs from the rows
        $vendorSellerIds = array_unique(array_filter(array_map(static fn (array $r): ?int => isset($r['sellerId']) ? (int) $r['sellerId'] : null, $rows)));

        foreach ($rows as $row) {
            $pid = $row['productId'] ?? null;
            $pname = $row['productName'] ?? 'Product';
            $vendorInStock = ($row['availability'] ?? null) === true;
            $vendorPrice = $row['price'] ?? null;

            if ($pid === null || !isset($grouped[$pid])) continue;

            $competitors = array_filter($grouped[$pid], static fn (array $l) => !in_array((int) $l['sellerId'], $vendorSellerIds, true));
            $oosCompetitors = array_filter($competitors, static fn (array $l) => ($l['availability'] ?? true) === false);
            $inStockCompetitors = array_filter($competitors, static fn (array $l) => ($l['availability'] ?? true) !== false);
            $oosCount = count($oosCompetitors);
            $inStockCount = count($inStockCompetitors);

            // Opportunity 1: Vendor is in stock, competitors are OOS
            if ($vendorInStock && $oosCount > 0 && count($competitors) > 0) {
                $oosNames = implode(', ', array_map(static fn (array $l) => $l['sellerName'], array_slice($oosCompetitors, 0, 2)));
                $remaining = $oosCount > 2 ? $oosCount - 2 : 0;
                $suffix = $remaining > 0 ? " and {$remaining} more" : '';
                $opportunities[] = [
                    'product_id' => $pid,
                    'product_name' => $pname,
                    'type' => 'STOCK_OPPORTUNITY',
                    'reason' => sprintf('%s %s OOS — you\'re the only seller in stock%s.', $oosNames, $oosCount === 1 ? 'is' : 'are', $suffix),
                ];
            }

            // Opportunity 2: Price gap — vendor can lower price to become cheapest
            if ($vendorPrice !== null && $vendorInStock && count($inStockCompetitors) > 0) {
                $cheapestCompetitor = null;
                foreach ($inStockCompetitors as $c) {
                    if ($cheapestCompetitor === null || $c['price'] < $cheapestCompetitor['price']) {
                        $cheapestCompetitor = $c;
                    }
                }
                if ($cheapestCompetitor !== null && $cheapestCompetitor['price'] < $vendorPrice) {
                    $gap = round($vendorPrice - $cheapestCompetitor['price'], 2);
                    $total = count($competitors) + 1;
                    $opportunities[] = [
                        'product_id' => $pid,
                        'product_name' => $pname,
                        'type' => 'PRICE_OPPORTUNITY',
                        'reason' => sprintf('Lower price by %s DT to become cheapest of %d sellers (currently undercut by %s).', number_format($gap, 2), $total, $cheapestCompetitor['sellerName']),
                    ];
                }
            }

            // Opportunity 3: Trust score anomaly detected
            if (isset($row['trust_score']) && is_numeric($row['trust_score']) && (float) $row['trust_score'] < 60) {
                $opportunities[] = [
                    'product_id' => $pid,
                    'product_name' => $pname,
                    'type' => 'TRUST_ALERT',
                    'reason' => sprintf('Trust score is low (%s). Check the breakdown for anomaly penalties dragging it down.', number_format((float) $row['trust_score'], 0)),
                ];
            }

            if (count($opportunities) >= 10) break;
        }

        return array_slice($opportunities, 0, 10);
    }

    private function buildShareOfShelf(B2BCompany|B2BMarket $user, array $rows, EntityManagerInterface $entityManager): array
    {
        $categories = [];
        $categoryIds = [];
        $isMarket = $user instanceof B2BMarket;

        foreach ($rows as $row) {
            $categoryId = isset($row['categoryId']) ? (int) $row['categoryId'] : 0;
            $categoryName = trim((string) ($row['categoryName'] ?? 'Uncategorized'));

            if ($categoryId <= 0) {
                continue;
            }

            if (!isset($categories[$categoryId])) {
                $categories[$categoryId] = [
                    'category_id' => $categoryId,
                    'category' => $categoryName,
                    'brand_products' => 0,
                    'total_products' => 0,
                    'competitors' => [],
                ];
                $categoryIds[] = $categoryId;
            }
            ++$categories[$categoryId]['brand_products'];
        }

        if (empty($categoryIds)) {
            return [];
        }

        if ($isMarket) {
            // Compare Market Sellers (Listings)
            $qb = $entityManager->createQueryBuilder()
                ->select('c.id as categoryId, s.name as competitorName, COUNT(pl.id) as itemCount')
                ->from(\App\Entity\ProductListing::class, 'pl')
                ->join('pl.product', 'p')
                ->join('p.category', 'c')
                ->join('pl.seller', 's')
                ->where('c.id IN (:categoryIds)')
                ->setParameter('categoryIds', $categoryIds)
                ->groupBy('c.id, s.name');
        } else {
            // Compare Brands (Base Products)
            $qb = $entityManager->createQueryBuilder()
                ->select('c.id as categoryId, p.brand as competitorName, COUNT(p.id) as itemCount')
                ->from(\App\Entity\Product::class, 'p')
                ->join('p.category', 'c')
                ->where('c.id IN (:categoryIds)')
                ->setParameter('categoryIds', $categoryIds)
                ->groupBy('c.id, p.brand');
        }

        $categoryStats = $qb->getQuery()->getResult();

        foreach ($categoryStats as $stat) {
            $cid = (int) $stat['categoryId'];
            $competitorName = trim((string) ($stat['competitorName'] ?? 'Unknown'));
            $count = (int) $stat['itemCount'];

            if (isset($categories[$cid])) {
                $categories[$cid]['total_products'] += $count;
                if ($competitorName !== '' && !isset($categories[$cid]['competitors'][$competitorName])) {
                    $categories[$cid]['competitors'][$competitorName] = $count;
                } else if ($competitorName !== '') {
                    $categories[$cid]['competitors'][$competitorName] += $count;
                }
            }
        }

        foreach ($categories as &$category) {
            $category['share_of_shelf'] = $category['total_products'] > 0 ? round(($category['brand_products'] / $category['total_products']) * 100, 2) : 0;
            $category['percentage'] = $category['share_of_shelf']; // added for frontend compatibility if needed
            arsort($category['competitors']);
            
            // Convert competitors to list for frontend
            $compList = [];
            foreach (array_slice($category['competitors'], 0, 5) as $name => $c) {
                $compList[] = ['name' => $name, 'count' => $c];
            }
            $category['top_competitors'] = $compList;
            unset($category['competitors']);
        }
        
        usort($categories, static fn(array $a, array $b): int => $b['share_of_shelf'] <=> $a['share_of_shelf']);

        return array_values($categories);
    }

    private function buildMarketStockIntelligence(array $rows, EntityManagerInterface $entityManager): array
    {
        $productIds = array_values(array_unique(array_filter(array_map(static fn (array $row): ?int => isset($row['productId']) ? (int) $row['productId'] : null, $rows))));
        if (empty($productIds)) return [];

        $conn = $entityManager->getConnection();
        $allListings = $conn->fetchAllAssociative(
            'SELECT pl.id, pl.product_id, pl.price, pl.availability,
                    (SELECT tsh.score FROM trust_score_history tsh WHERE tsh.listing_id = pl.id ORDER BY tsh.created_at DESC LIMIT 1) AS trust_score,
                    s.name AS seller_name, p.name AS product_name
             FROM product_listing pl
             JOIN seller s ON s.id = pl.seller_id
             JOIN product p ON p.id = pl.product_id
             WHERE pl.product_id IN (:ids) AND pl.is_active = true
             ORDER BY pl.product_id, pl.price ASC',
            ['ids' => $productIds],
            ['ids' => ArrayParameterType::INTEGER]
        );

        $grouped = [];
        foreach ($allListings as $listing) {
            $pid = (int) $listing['product_id'];
            $grouped[$pid][] = $listing;
        }

        $results = [];
        foreach ($grouped as $pid => $listings) {
            $inStock = count(array_filter($listings, fn ($l) => $l['availability'] === true || $l['availability'] === '1'));
            $outOfStock = count($listings) - $inStock;
            $results[] = [
                'product_id' => $pid,
                'product_name' => $listings[0]['product_name'] ?? 'Unknown',
                'total_sellers' => count($listings),
                'in_stock_count' => $inStock,
                'out_of_stock_count' => $outOfStock,
                'sellers' => array_map(fn ($l) => [
                    'seller_name' => $l['seller_name'],
                    'in_stock' => $l['availability'] === true || $l['availability'] === '1',
                    'price' => (float) $l['price'],
                    'trust_score' => $l['trust_score'] !== null ? (float) $l['trust_score'] : null,
                ], $listings),
            ];
        }

        return $results;
    }

    private function buildPriceDispersion(array $rows): array
    {
        $byProduct = [];
        foreach ($rows as $row) {
            $productId = isset($row['productId']) ? (int) $row['productId'] : 0;
            if ($productId <= 0 || !is_numeric($row['price'] ?? null)) {
                continue;
            }
            if (!isset($byProduct[$productId])) {
                $byProduct[$productId] = [
                    'name' => $row['productName'] ?? 'Product',
                    'listings' => [],
                ];
            }
            $byProduct[$productId]['listings'][] = [
                'price' => (float) $row['price'],
                'seller' => $row['sellerName'] ?? 'Unknown',
            ];
        }

        $dispersion = [];
        foreach ($byProduct as $productId => $data) {
            $prices = array_column($data['listings'], 'price');
            if (count($prices) < 2) continue;

            $min = min($prices);
            $max = max($prices);

            usort($data['listings'], fn($a, $b) => $a['price'] <=> $b['price']);

            $dispersion[] = [
                'product_id' => $productId,
                'product_name' => $data['name'],
                'min_price' => $min,
                'max_price' => $max,
                'dispersion_dt' => round($max - $min, 2),
                'dispersion_pct' => $min > 0 ? round((($max - $min) / $min) * 100, 2) : null,
                'cheapest_seller' => $data['listings'][0]['seller'],
                'expensive_seller' => $data['listings'][count($data['listings']) - 1]['seller'],
                'seller_count' => count($prices),
                // Aliases for frontend compatibility
                'price_range' => round($max - $min, 2),
                'seller_with_min' => $data['listings'][0]['seller'],
                'seller_with_max' => $data['listings'][count($data['listings']) - 1]['seller'],
                'sellers_count' => count($prices),
            ];
        }

        return array_slice($dispersion, 0, 20);
    }

    private function buildCompetitorRanking(array $rows): array
    {
        $counts = [];
        foreach ($rows as $row) {
            $sellerName = trim((string) ($row['sellerName'] ?? 'Unknown seller'));
            $counts[$sellerName] = ($counts[$sellerName] ?? 0) + 1;
        }

        arsort($counts);

        $rank = 1;
        $results = [];
        foreach ($counts as $sellerName => $count) {
            $results[] = [
                'rank' => $rank++,
                'seller_name' => $sellerName,
                'listing_count' => $count,
                'market_share_percentage' => count($rows) > 0 ? round(($count / count($rows)) * 100, 2) : 0,
                // Aliases for frontend compatibility
                'brand' => $sellerName,
                'listings_count' => $count,
                'market_share_pct' => count($rows) > 0 ? round(($count / count($rows)) * 100, 2) : 0,
            ];
        }

        return array_slice($results, 0, 10);
    }

    private function buildReputationIntelligence(array $rows, EntityManagerInterface $entityManager): array
    {
        $productIds = array_values(array_unique(array_filter(array_map(static fn (array $row): ?int => isset($row['productId']) ? (int) $row['productId'] : null, $rows))));
        if ($productIds === []) {
            return ['average_rating' => null, 'positive_keywords' => [], 'negative_keywords' => []];
        }

        $qb = $entityManager->createQueryBuilder()
            ->select('AVG(r.rating) AS avgRating')
            ->from(\App\Entity\Review::class, 'r')
            ->join('r.productListing', 'pl')
            ->join('pl.product', 'p')
            ->where('p.id IN (:productIds)')
            ->setParameter('productIds', $productIds);

        $result = $qb->getQuery()->getSingleScalarResult();

        return [
            'average_rating' => is_numeric($result) ? round((float) $result, 2) : null,
            'positive_keywords' => ['good', 'fast', 'quality'],
            'negative_keywords' => ['slow', 'broken', 'late'],
        ];
    }

    private function buildDemandIntelligence(array $searchInsights): array
    {
        return [
            'top_queries' => $searchInsights['top_queries'] ?? [],
            'zero_result_queries' => $searchInsights['zero_result_queries'] ?? [],
        ];
    }

    /**
     * @return array{headers: array<int, string>, rows: array<int, array<int, string|int|float|null>>}|null
     */
    private function buildReportCsvData(B2BCompany|B2BMarket $user, string $reportType, array $listings, EntityManagerInterface $entityManager, array $searchInsights): ?array
    {
        if ($reportType === 'COMPETITOR_PRICING') {
            $headers = ['Product Name', 'Your Price', 'Market Min', 'Market Max', 'Your Rank', 'Total Sellers', 'Gap to Cheapest', 'Trust Score', 'Stock Status', 'Last Updated'];
            $rows = [];

            foreach ($listings as $row) {
                $productId = $row['productId'] ?? null;
                $price = $row['price'] ?? null;
                $trustScore = $row['trust_score'] ?? null;
                $availability = ($row['availability'] ?? null) === true ? 'In Stock' : 'Out of Stock';
                $updated = $row['updated_at'] ?? '';

                $stats = [
                    'cheapest_price' => $row['cheapest_price'] ?? null,
                    'max_price' => $row['max_price'] ?? null,
                    'total_sellers' => $row['total_sellers'] ?? null,
                    'vendor_rank' => $row['vendor_rank'] ?? null,
                ];

                $gap = $stats['cheapest_price'] !== null && $price !== null
                    ? round($price - $stats['cheapest_price'], 2)
                    : null;

                $rows[] = [
                    $row['productName'] ?? 'Unknown',
                    $price !== null ? number_format($price, 2) . ' DT' : 'N/A',
                    $stats['cheapest_price'] !== null ? number_format($stats['cheapest_price'], 2) . ' DT' : 'N/A',
                    $stats['max_price'] !== null ? number_format($stats['max_price'], 2) . ' DT' : 'N/A',
                    $stats['vendor_rank'] !== null ? $stats['vendor_rank'] . ' of ' . $stats['total_sellers'] : 'N/A',
                    $stats['total_sellers'] ?? 'N/A',
                    $gap !== null ? number_format($gap, 2) . ' DT' : 'N/A',
                    $trustScore !== null ? number_format($trustScore, 1) : 'N/A',
                    $availability,
                    $updated,
                ];
            }

            return ['headers' => $headers, 'rows' => $rows];
        }

        if ($reportType === 'STOCK_AVAILABILITY') {
            $headers = ['Product Name', 'Your Stock', 'Total Sellers', 'Sellers In Stock', 'Sellers OOS', 'Opportunity', 'Trust Score'];
            $rows = [];

            $productIds = array_values(array_unique(array_filter(array_map(static fn (array $r) => $r['productId'] ?? null, $listings))));
            $stockStats = [];
            if (!empty($productIds)) {
                $conn = $entityManager->getConnection();
                $stockRows = $conn->fetchAllAssociative(
                    'SELECT product_id, COUNT(*) AS total, SUM(CASE WHEN availability = true THEN 1 ELSE 0 END) AS in_stock
                     FROM product_listing WHERE product_id IN (:pids) AND is_active = true GROUP BY product_id',
                    ['pids' => $productIds],
                    ['pids' => ArrayParameterType::INTEGER]
                );
                foreach ($stockRows as $sr) {
                    $stockStats[(int) $sr['product_id']] = [
                        'total' => (int) $sr['total'],
                        'in_stock' => (int) $sr['in_stock'],
                    ];
                }
            }

            foreach ($listings as $row) {
                $productId = $row['productId'] ?? null;
                $yourStock = ($row['availability'] ?? null) === true ? 'In Stock' : 'Out of Stock';
                $trustScore = $row['trust_score'] ?? null;

                $stats = $productId !== null ? ($stockStats[$productId] ?? null) : null;
                $total = $stats['total'] ?? null;
                $inStock = $stats['in_stock'] ?? 0;
                $oos = $total !== null ? $total - $inStock : 0;
                $opportunity = ($oos > 0 && ($row['availability'] ?? null) === true)
                    ? 'Yes — ' . $oos . ' competitor(s) OOS'
                    : 'No';

                $rows[] = [
                    $row['productName'] ?? 'Unknown',
                    $yourStock,
                    $total ?? 'N/A',
                    $inStock,
                    $oos,
                    $opportunity,
                    $trustScore !== null ? number_format($trustScore, 1) : 'N/A',
                ];
            }

            return ['headers' => $headers, 'rows' => $rows];
        }

        if ($reportType === 'TRUST_SCORE_RANKING') {
            $headers = ['Rank', 'Product Name', 'Seller', 'Trust Score', 'Price', 'Stock Status', 'Last Updated'];
            $sorted = $listings;
            usort($sorted, static fn (array $a, array $b): int => (float) ($b['trust_score'] ?? 0) <=> (float) ($a['trust_score'] ?? 0));

            $rows = [];
            foreach ($sorted as $index => $row) {
                $rows[] = [
                    $index + 1,
                    $row['productName'] ?? 'Unknown',
                    $row['sellerName'] ?? 'Unknown seller',
                    isset($row['trust_score']) && is_numeric($row['trust_score']) ? number_format((float) $row['trust_score'], 1) : 'N/A',
                    isset($row['price']) && is_numeric($row['price']) ? number_format((float) $row['price'], 2) . ' DT' : 'N/A',
                    ($row['availability'] ?? null) === true ? 'In Stock' : 'Out of Stock',
                    $row['updated_at'] ?? '',
                ];
            }

            return ['headers' => $headers, 'rows' => $rows];
        }

        if ($reportType === 'MARKET_BAROMETER') {
            $headers = ['Metric', 'Value'];
            $trustScores = array_values(array_filter(
                array_map(static fn (array $row): ?float => is_numeric($row['trust_score'] ?? null) ? (float) $row['trust_score'] : null, $listings),
                static fn ($value): bool => is_numeric($value)
            ));
            $avgTrust = $trustScores !== [] ? round(array_sum($trustScores) / count($trustScores), 2) : null;
            $rows = [
                ['Listings Count', count($listings)],
                ['Products Count', count(array_unique(array_filter(array_map(static fn (array $row): ?int => isset($row['productId']) ? (int) $row['productId'] : null, $listings))))],
                ['Average Trust Score', $avgTrust !== null ? number_format($avgTrust, 2) : 'N/A'],
                ['In Stock Count', count(array_filter($listings, static fn (array $row): bool => ($row['availability'] ?? null) === true))],
                ['Out of Stock Count', count(array_filter($listings, static fn (array $row): bool => ($row['availability'] ?? null) === false))],
                ['Top Seller', $this->buildCompetitorRanking($listings)[0]['seller_name'] ?? 'N/A'],
            ];

            return ['headers' => $headers, 'rows' => $rows];
        }

        if ($reportType === 'SHARE_OF_SHELF') {
            $share = $this->buildShareOfShelf($user, $listings, $entityManager);
            $headers = ['Category', 'Your Products', 'Total Products', 'Share of Shelf %', 'Top Competitors'];
            $rows = array_map(static fn (array $row): array => [
                $row['category'] ?? 'Category',
                $row['brand_products'] ?? 0,
                $row['total_products'] ?? 0,
                $row['share_of_shelf'] ?? 0,
                implode(', ', array_map(static fn (array $competitor): string => ($competitor['name'] ?? 'Unknown') . ' (' . ($competitor['count'] ?? 0) . ')', $row['top_competitors'] ?? [])),
            ], $share);

            return ['headers' => $headers, 'rows' => $rows];
        }

        if ($reportType === 'DISPERSION') {
            $dispersion = $this->buildPriceDispersion($listings);
            $headers = ['Product Name', 'Min Price', 'Max Price', 'Dispersion DT', 'Dispersion %', 'Cheapest Seller', 'Most Expensive Seller', 'Seller Count'];
            $rows = array_map(static fn (array $row): array => [
                $row['product_name'] ?? 'Product',
                isset($row['min_price']) ? number_format((float) $row['min_price'], 2) . ' DT' : 'N/A',
                isset($row['max_price']) ? number_format((float) $row['max_price'], 2) . ' DT' : 'N/A',
                isset($row['dispersion_dt']) ? number_format((float) $row['dispersion_dt'], 2) . ' DT' : 'N/A',
                isset($row['dispersion_pct']) ? number_format((float) $row['dispersion_pct'], 2) . '%' : 'N/A',
                $row['cheapest_seller'] ?? 'Unknown',
                $row['expensive_seller'] ?? 'Unknown',
                $row['seller_count'] ?? 0,
            ], $dispersion);

            return ['headers' => $headers, 'rows' => $rows];
        }

        if ($reportType === 'STOCK_OUT') {
            $headers = ['Product Name', 'Seller', 'Brand', 'Category', 'Trust Score', 'Last Updated'];
            $rows = array_map(static fn (array $row): array => [
                $row['productName'] ?? 'Product',
                $row['sellerName'] ?? 'Seller',
                $row['productBrand'] ?? 'Brand',
                $row['categoryName'] ?? 'Category',
                isset($row['trust_score']) && is_numeric($row['trust_score']) ? number_format((float) $row['trust_score'], 1) : 'N/A',
                $row['updated_at'] ?? '',
            ], array_values(array_filter($listings, static fn (array $row): bool => ($row['availability'] ?? null) === false)));

            return ['headers' => $headers, 'rows' => $rows];
        }

        if ($reportType === 'SENTIMENT') {
            $reputation = $this->buildReputationIntelligence($listings, $entityManager);
            $headers = ['Metric', 'Value'];
            $rows = [
                ['Average Rating', $reputation['average_rating'] ?? 'N/A'],
                ['Positive Keywords', implode(', ', $reputation['positive_keywords'] ?? [])],
                ['Negative Keywords', implode(', ', $reputation['negative_keywords'] ?? [])],
                ['Tracked Products', count(array_unique(array_filter(array_map(static fn (array $row): ?int => isset($row['productId']) ? (int) $row['productId'] : null, $listings))))],
            ];

            return ['headers' => $headers, 'rows' => $rows];
        }

        return null;
    }

    /**
     * @param resource $handle
     * @param array<int, string> $headers
     * @param array<int, array<int, string|int|float|null>> $rows
     */
    private function writeCsvRows($handle, array $headers, array $rows): void
    {
        fputcsv($handle, $headers);
        foreach ($rows as $row) {
            fputcsv($handle, $row);
        }
    }

    private function detectScrapingDuplicateReason(string $normalizedUrl, EntityManagerInterface $entityManager): ?string
    {
        $connection = $entityManager->getConnection();
        $existingListing = $connection->fetchOne('SELECT 1 FROM product_listing WHERE LOWER(product_url) = :url LIMIT 1', ['url' => $normalizedUrl]);
        if ($existingListing !== false) {
            return 'URL already exists in product listings.';
        }

        $existingCategoryLink = $connection->fetchOne('SELECT 1 FROM category_link WHERE LOWER(url) = :url LIMIT 1', ['url' => $normalizedUrl]);
        if ($existingCategoryLink !== false) {
            return 'URL already exists in category links.';
        }

        return null;
    }

    private function serializeWorkspaceUser(B2BCompany|B2BMarket $user): array
    {
        return [
            'id' => $user->getId(),
            'email' => $user->getEmail(),
            'full_name' => $user->getFullName(),
            'company_name' => $user->getCompanyName(),
            'company_market' => $user->getCompanyMarket(),
            'company_country' => $user->getCompanyCountry(),
            'company_website' => $user->getCompanyWebsite(),
            'b2b_status' => $user->getB2bStatus(),
            'is_verified' => $user->isVerified(),
            'seller_id' => $user instanceof B2BCompany ? $user->getSeller()?->getId() : null,
            'owner_user_id' => $user->getOwnerUser()?->getId(),
            'usage_json' => $user->getUsageJson(),
            'type' => $user instanceof B2BMarket ? 'B2B_MARKET' : 'B2B_COMPANY',
        ];
    }

    private function serializeWorkspaceSubscription(array $subscription): array
    {
        return $subscription;
    }

    private function serializeAdsRequest(B2BAdsRequest $request): array
    {
        return [
            'id' => $request->getId(),
            'owner_type' => $request->getOwnerType(),
            'request_type' => $request->getRequestType(),
            'image_url' => $request->getImageUrl(),
            'link_url' => $request->getLinkUrl(),
            'status' => $request->getStatus(),
            'created_at' => $request->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            'updated_at' => $request->getUpdatedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }

    private function serializeScrapingRequest(B2BScrapingRequest $request): array
    {
        return [
            'id' => $request->getId(),
            'owner_type' => $request->getOwnerType(),
            'target_type' => $request->getTargetType(),
            'target_url' => $request->getTargetUrl(),
            'status' => $request->getStatus(),
            'notes' => $request->getNotes(),
            'is_duplicate' => $request->isDuplicate(),
            'duplicate_reason' => $request->getDuplicateReason(),
            'created_at' => $request->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            'updated_at' => $request->getUpdatedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }

    private function serializeReport(B2BReport $report): array
    {
        return [
            'id' => $report->getId(),
            'owner_type' => $report->getOwnerType(),
            'report_type' => $report->getReportType(),
            'status' => $report->getStatus(),
            'file_path' => $report->getFilePath(),
            'period_start' => $report->getPeriodStart()?->format(\DateTimeInterface::ATOM),
            'period_end' => $report->getPeriodEnd()?->format(\DateTimeInterface::ATOM),
            'generated_at' => $report->getGeneratedAt()?->format(\DateTimeInterface::ATOM),
            'created_at' => $report->getCreatedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }

    private function normalizeListingRow(array $row): array
    {
        $serializeDate = static function (mixed $date): ?string {
            return $date instanceof \DateTimeInterface ? $date->format(\DateTimeInterface::ATOM) : ($date !== null ? (string) $date : null);
        };

        $normalized = [
            'id' => $row['id'] ?? null,
            'ref' => $row['ref'] ?? null,
            'price' => isset($row['price']) && is_numeric($row['price']) ? (float) $row['price'] : null,
            'old_price' => isset($row['old_price']) && is_numeric($row['old_price']) ? (float) $row['old_price'] : null,
            'product_url' => $row['product_url'] ?? null,
            'availability' => $row['availability'] ?? null,
            'trust_score' => isset($row['trust_score']) && is_numeric($row['trust_score']) ? (float) $row['trust_score'] : null,
            'trust_score_breakdown' => $this->decodeTrustBreakdown($row['trust_score_breakdown'] ?? null),
            'created_at' => $serializeDate($row['created_at'] ?? null),
            'updated_at' => $serializeDate($row['updated_at'] ?? null),
            'is_active' => $row['is_active'] ?? null,
            'productId' => $row['productId'] ?? null,
            'productName' => $row['productName'] ?? null,
            'productBrand' => $row['productBrand'] ?? null,
            'categoryId' => $row['categoryId'] ?? null,
            'categoryName' => $row['categoryName'] ?? null,
            'sellerId' => $row['sellerId'] ?? null,
            'sellerName' => $row['sellerName'] ?? null,
        ];

        if (isset($row['vendor_rank'])) $normalized['vendor_rank'] = $row['vendor_rank'];
        if (isset($row['total_sellers'])) $normalized['total_sellers'] = $row['total_sellers'];
        if (isset($row['cheapest_price'])) $normalized['cheapest_price'] = $row['cheapest_price'];

        return $normalized;
    }

    private function applyListingFilters(array $rows, Request $request): array
    {
        $category = trim((string) $request->query->get('category', ''));
        $inStock = $request->query->get('in_stock');
        $trustMin = $request->query->get('trust_min') ?? $request->query->get('trust_score_min');
        $trustMax = $request->query->get('trust_max') ?? $request->query->get('trust_score_max');
        $priceMin = $request->query->get('price_min');
        $priceMax = $request->query->get('price_max');
        $anomaliesOnly = filter_var((string) $request->query->get('anomalies_only', 'false'), FILTER_VALIDATE_BOOLEAN);
        $search = trim((string) $request->query->get('search', ''));
        $sortBy = trim((string) $request->query->get('sort_by', ''));
        $sortOrder = strtolower(trim((string) $request->query->get('sort_order', 'asc')));

        $rows = array_values(array_filter($rows, static function (array $row) use ($category, $inStock, $trustMin, $trustMax, $priceMin, $priceMax, $anomaliesOnly, $search): bool {
            if ($category !== '' && mb_strtolower((string) ($row['categoryName'] ?? '')) !== mb_strtolower($category)) {
                return false;
            }

            if ($inStock !== null && $inStock !== '') {
                $desired = filter_var((string) $inStock, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                if ($desired !== null && ($row['availability'] ?? null) !== $desired) {
                    return false;
                }
            }

            if (is_numeric($trustMin) && (!isset($row['trust_score']) || (float) $row['trust_score'] < (float) $trustMin)) {
                return false;
            }

            if (is_numeric($trustMax) && (!isset($row['trust_score']) || (float) $row['trust_score'] > (float) $trustMax)) {
                return false;
            }

            if (is_numeric($priceMin) && (!isset($row['price']) || (float) $row['price'] < (float) $priceMin)) {
                return false;
            }

            if (is_numeric($priceMax) && (!isset($row['price']) || (float) $row['price'] > (float) $priceMax)) {
                return false;
            }

            if ($anomaliesOnly && ($row['trust_score'] ?? 100) > 60) {
                return false;
            }

            if ($search !== '') {
                $needle = mb_strtolower($search);
                $productName = mb_strtolower((string) ($row['productName'] ?? ''));
                $productBrand = mb_strtolower((string) ($row['productBrand'] ?? ''));
                $ref = mb_strtolower((string) ($row['ref'] ?? ''));
                if (!str_contains($productName, $needle) && !str_contains($productBrand, $needle) && !str_contains($ref, $needle)) {
                    return false;
                }
            }

            return true;
        }));

        if ($sortBy !== '') {
            $allowed = ['price', 'trust_score', 'vendor_rank', 'productName', 'created_at'];
            if (in_array($sortBy, $allowed, true)) {
                $desc = $sortOrder === 'desc';
                usort($rows, static function (array $a, array $b) use ($sortBy, $desc): int {
                    $valA = $a[$sortBy] ?? null;
                    $valB = $b[$sortBy] ?? null;
                    if ($valA === null && $valB === null) return 0;
                    if ($valA === null) return $desc ? -1 : 1;
                    if ($valB === null) return $desc ? 1 : -1;
                    $cmp = $valA <=> $valB;
                    return $desc ? -$cmp : $cmp;
                });
            }
        }

        return $rows;
    }

    private function paginateArray(array $items, int $limit, int $offset): array
    {
        return [
            'items' => array_slice($items, $offset, $limit),
            'pagination' => [
                'limit' => $limit,
                'offset' => $offset,
                'total' => count($items),
            ],
        ];
    }

    private function normalizeString(mixed $value): string
    {
        return strtoupper(trim((string) $value));
    }

    private function normalizeNullableString(mixed $value): ?string
    {
        $text = trim((string) ($value ?? ''));

        return $text === '' ? null : $text;
    }

    private function normalizeNullableInt(mixed $value): ?int
    {
        return is_numeric($value) ? (int) $value : null;
    }

    private function normalizeNullableFloat(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }

    private function decodeTrustBreakdown(mixed $value): mixed
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : null;
        }
        return $value;
    }
}
