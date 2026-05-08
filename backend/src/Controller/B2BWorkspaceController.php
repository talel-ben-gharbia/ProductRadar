<?php

namespace App\Controller;

use App\Entity\B2BAdsRequest;
use App\Entity\B2BCompany;
use App\Entity\B2BMarket;
use App\Entity\B2BReport;
use App\Entity\B2BScrapingRequest;
use App\Entity\B2BSearchLog;
use App\Entity\B2BSubscription;
use App\Entity\B2BWatchlist;
use App\Entity\Notification;
use App\Entity\Product;
use App\Entity\ProductListing;
use App\Entity\Seller;
use App\Entity\User;
use App\Repository\ProductListingRepository;
use App\Repository\UserRepository;
use App\Service\B2BPlanGatingService;
use App\Service\B2BAdsQuotaService;
use App\Service\SubscriptionContextResolver;
use App\Service\TrustScoreCalculationService;
use App\Service\URLDuplicateDetector;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/b2b/workspace')]
final class B2BWorkspaceController extends AbstractController
{
    public function __construct(
        private readonly B2BPlanGatingService $gatingService,
        private readonly SubscriptionContextResolver $subscriptionResolver,
        private readonly URLDuplicateDetector $urlDuplicateDetector,
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

        $subscription = $this->resolveWorkspaceSubscription($user, $entityManager);
        $notifications = $this->fetchWorkspaceNotifications($user, $entityManager, 5);
        $searchInsights = $this->fetchSearchInsights($user, $entityManager);

        $listings = $this->fetchWorkspaceListings($user, $productListingRepository, $entityManager);
        $metrics = $this->buildWorkspaceMetrics($user, $listings, $entityManager, $searchInsights);

        return $this->json([
            'user' => $this->serializeWorkspaceUser($user),
            'subscription' => $this->serializeWorkspaceSubscription($subscription),
            'metrics' => $metrics,
            'search_insights' => $searchInsights,
            'notifications' => $notifications,
        ]);
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

        if ($user instanceof B2BMarket || !$user instanceof B2BCompany) {
            return $this->json([
                'overall' => null,
                'trust_dimension' => null,
                'pricing_dimension' => null,
                'stock_dimension' => null,
                'trend' => null,
            ]);
        }

        $listings = $this->fetchWorkspaceListings($user, $productListingRepository, $entityManager);

        if (empty($listings)) {
            return $this->json([
                'overall' => null,
                'trust_dimension' => null,
                'pricing_dimension' => null,
                'stock_dimension' => null,
                'trend' => null,
            ]);
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

        return $this->json([
            'overall' => $overall,
            'trust_dimension' => $trustDimension,
            'pricing_dimension' => $pricingDimension,
            'stock_dimension' => $stockDimension,
            'trend' => null,
        ]);
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

        $conn = $entityManager->getConnection();

        if ($user instanceof B2BCompany) {
            $sellerId = $user->getSeller()?->getId();
            if ($sellerId === null) {
                return $this->json(['items' => []]);
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

            return $this->json(['items' => $rows]);
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

            return $this->json(['items' => $rows]);
        }

        return $this->json(['items' => []]);
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

        $rows = $this->fetchWorkspaceListings($user, $productListingRepository, $entityManager);
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

            $notification->setIsRead(true);
            $entityManager->flush();

            return $this->json(['id' => $notification->getId(), 'is_read' => true]);
        }

        $limit = max(1, min(100, $request->query->getInt('limit', 25)));
        $offset = max(0, $request->query->getInt('offset', 0));
        $items = $this->fetchWorkspaceNotifications($user, $entityManager, $limit + $offset);

        return $this->json($this->paginateArray($items, $limit, $offset));
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
            $items = $entityManager->getRepository(B2BAdsRequest::class)->findBy(
                $user instanceof B2BCompany ? ['company' => $user] : [],
                ['created_at' => 'DESC', 'id' => 'DESC'],
                100,
            );

            $quota = $quotaService->getQuotaUsage($user);

            return $this->json([
                'items' => array_map(fn (B2BAdsRequest $item) => $this->serializeAdsRequest($item), $items),
                'quota' => $quota,
            ]);
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

        $requestType = $this->normalizeString($body['requestType'] ?? 'BANNER');
        $targetType = $this->normalizeString($body['targetType'] ?? 'PRODUCT');
        $targetUrl = $this->normalizeNullableString($body['targetUrl'] ?? null);
        $productId = $this->normalizeNullableInt($body['productId'] ?? null);
        $categoryId = $this->normalizeNullableInt($body['categoryId'] ?? null);
        $brandFilter = $this->normalizeNullableString($body['brandFilter'] ?? null);

        if (!in_array($targetType, ['PRODUCT', 'BRAND_GROUP', 'CATEGORY'], true)) {
            return $this->json(['error' => 'Invalid target type.'], 400);
        }

        $adsRequest = new B2BAdsRequest();
        $adsRequest->setOwnerType($user instanceof B2BMarket ? 'B2B_MARKET' : 'B2B_COMPANY');
        if ($user instanceof B2BCompany) {
            $adsRequest->setCompany($user);
        }
        $adsRequest->setRequestType($requestType);
        $adsRequest->setTargetType($targetType);
        $adsRequest->setDurationDays($this->normalizeNullableInt($body['durationDays'] ?? null));
        $adsRequest->setBudgetProposal($this->normalizeNullableFloat($body['budgetProposal'] ?? null));
        $adsRequest->setNotes($this->normalizeNullableString($body['notes'] ?? null));
        $adsRequest->setStatus('PENDING');
        $adsRequest->setCreatedAt(new \DateTimeImmutable());
        $adsRequest->setUpdatedAt(new \DateTimeImmutable());

        if ($targetType === 'PRODUCT') {
            if ($productId === null) {
                return $this->json(['error' => 'A product is required for product-targeted ads.'], 400);
            }

            $product = $entityManager->find(\App\Entity\Product::class, $productId);
            if (!$product instanceof \App\Entity\Product) {
                return $this->json(['error' => 'Product not found.'], 404);
            }

            $adsRequest->setProduct($product);
            $targetUrl = $targetUrl ?? sprintf('/ads/redirect/product/%d', $productId);
        } elseif ($targetType === 'BRAND_GROUP') {
            if ($categoryId === null || $brandFilter === null) {
                return $this->json(['error' => 'A category and brand are required for brand group ads.'], 400);
            }

            $category = $entityManager->find(\App\Entity\Category::class, $categoryId);
            if (!$category instanceof \App\Entity\Category) {
                return $this->json(['error' => 'Category not found.'], 404);
            }

            $adsRequest->setCategory($category);
            $adsRequest->setBrandFilter($brandFilter);
            $targetUrl = $targetUrl ?? sprintf('/ads/redirect/brand/%d/%s', $categoryId, urlencode($brandFilter));
        } else {
            // CATEGORY
            if ($categoryId === null) {
                return $this->json(['error' => 'A category is required for category ads.'], 400);
            }

            $category = $entityManager->find(\App\Entity\Category::class, $categoryId);
            if (!$category instanceof \App\Entity\Category) {
                return $this->json(['error' => 'Category not found.'], 404);
            }

            $adsRequest->setCategory($category);
            $targetUrl = $targetUrl ?? sprintf('/ads/redirect/category/%d', $categoryId);
        }

        $adsRequest->setTargetUrl($targetUrl ?? '');
        if ($adsRequest->getTargetUrl() === '') {
            return $this->json(['error' => 'Target URL is required.'], 400);
        }

        $entityManager->persist($adsRequest);
        $entityManager->flush();

        $this->subscriptionResolver->recordUsage($user, 'ads_requests');

        return $this->json($this->serializeAdsRequest($adsRequest), 201);
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
            $items = $entityManager->getRepository(B2BReport::class)->findBy(
                $user instanceof B2BCompany ? ['company' => $user] : ['market' => $user],
                ['created_at' => 'DESC', 'id' => 'DESC'],
                100,
            );

            return $this->json([
                'items' => array_map(fn (B2BReport $item) => [
                    'id' => $item->getId(),
                    'report_type' => $item->getReportType(),
                    'status' => $item->getStatus(),
                    'file_path' => $item->getFilePath(),
                    'generated_at' => $item->getGeneratedAt()?->format(\DateTimeInterface::ATOM),
                    'created_at' => $item->getCreatedAt()?->format(\DateTimeInterface::ATOM),
                ], $items),
            ]);
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

        // Only Gold can export CSV
        if (!$this->gatingService->canAccessFeature($user, B2BPlanGatingService::FEATURE_EXPORT_CSV)) {
            return $this->json(['error' => 'CSV export requires a Gold subscription.'], 403);
        }

        $listings = $this->fetchWorkspaceListings($user, $entityManager->getRepository(\App\Entity\ProductListing::class), $entityManager);
        $searchInsights = $this->fetchSearchInsights($user, $entityManager);
        $reportData = $this->buildReportCsvData($user, strtoupper($reportType), $listings, $entityManager, $searchInsights);

        if ($reportData === null) {
            return $this->json(['error' => 'Unknown report type.'], 422);
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

        $criteria = $user instanceof B2BCompany ? ['company' => $user] : ['market' => $user];
        $currentSub = $entityManager->getRepository(B2BSubscription::class)->findOneBy(
            $criteria + ['active' => true],
            ['created_at' => 'DESC', 'id' => 'DESC']
        );

        if (!$currentSub instanceof B2BSubscription) {
            return $this->json(['error' => 'No active subscription to renew.'], 404);
        }

        // Create a renewal request (same plan, new dates, inactive until approved)
        $newSub = new B2BSubscription();
        $newSub->setOwnerType($currentSub->getOwnerType());
        $newSub->setPlanType($currentSub->getPlanType());
        $newSub->setDurationMonths($currentSub->getDurationMonths());
        $newSub->setStartDate(new \DateTimeImmutable());
        $newSub->setEndDate((new \DateTimeImmutable())->modify('+' . ($currentSub->getDurationMonths() ?? 12) . ' months'));
        $newSub->setActive(false); // Pending admin approval
        if ($user instanceof B2BCompany) $newSub->setCompany($user);
        if ($user instanceof B2BMarket) $newSub->setMarket($user);
        $newSub->setCreatedAt(new \DateTimeImmutable());

        $entityManager->persist($newSub);
        $entityManager->flush();

        // Notify admin (via notification) — simplified: create notification for the vendor
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

        // Check they aren't already Gold
        if ($this->gatingService->isGoldPlan($user)) {
            return $this->json(['error' => 'You are already on a Gold plan.'], 409);
        }

        // Create an upgrade request to GOLD
        $newSub = new B2BSubscription();
        $newSub->setOwnerType($user instanceof B2BMarket ? 'MARKET' : 'COMPANY');
        $newSub->setPlanType('B2B_GOLD');
        $newSub->setDurationMonths(12);
        $newSub->setStartDate(new \DateTimeImmutable());
        $newSub->setEndDate((new \DateTimeImmutable())->modify('+12 months'));
        $newSub->setActive(false); // Pending admin approval
        if ($user instanceof B2BCompany) $newSub->setCompany($user);
        if ($user instanceof B2BMarket) $newSub->setMarket($user);
        $newSub->setCreatedAt(new \DateTimeImmutable());

        $entityManager->persist($newSub);

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

        $qb = $entityManager->getRepository(Product::class)->createQueryBuilder('p')
            ->select('p.id, p.name, p.brand')
            ->where('LOWER(p.name) LIKE LOWER(:q)')
            ->orWhere('LOWER(p.brand) LIKE LOWER(:q)')
            ->setParameter('q', '%' . $q . '%')
            ->setMaxResults(20)
            ->orderBy('p.name', 'ASC');

        $results = $qb->getQuery()->getResult();

        return $this->json([
            'items' => array_map(static fn (array $r) => [
                'id' => (int) $r['id'],
                'name' => $r['name'],
                'brand' => $r['brand'],
            ], $results),
        ]);
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

        $result = array_map(function (B2BWatchlist $w) use ($productData) {
            $product = $w->getProduct();
            $pid = $product?->getId();
            $current = $productData[$pid] ?? null;
            return [
                'id' => $w->getId(),
                'product_id' => $pid,
                'product_name' => $product?->getName() ?? 'Unknown',
                'product_image' => $product?->getImageUrl(),
                'product_brand' => $product?->getBrand(),
                'followed_at' => $w->getCreatedAt()?->format(\DateTimeInterface::ATOM),
                'cheapest_price' => $current['cheapest_price'] ?? null,
                'highest_price' => $current['highest_price'] ?? null,
                'total_sellers' => $current['total_sellers'] ?? 0,
            ];
        }, $items);

        return $this->json(['items' => $result]);
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

        $entityManager->persist($watchlist);
        $entityManager->flush();

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

        $entityManager->remove($watchlist);
        $entityManager->flush();

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

        return $this->compareByProduct($product, $user, $entityManager);
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

        return $this->compareByProduct($product, $user, $entityManager);
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
            $items = $entityManager->getRepository(B2BScrapingRequest::class)->findBy(
                $user instanceof B2BCompany ? ['company' => $user] : [],
                ['created_at' => 'DESC', 'id' => 'DESC'],
                100,
            );

            return $this->json([
                'items' => array_map(fn (B2BScrapingRequest $item) => $this->serializeScrapingRequest($item), $items),
            ]);
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

        $normalizedUrl = mb_strtolower($targetUrl);

        // Primary check: existing DB-level duplicate detection
        $duplicateReason = $this->detectScrapingDuplicateReason($normalizedUrl, $entityManager);

        // Secondary check: intelligent URL normalization + domain clustering
        if ($duplicateReason === null) {
            $detection = $this->urlDuplicateDetector->detectDuplicate($targetUrl);
            if ($detection['is_duplicate']) {
                $duplicateReason = $detection['duplicate_reason']
                    ?? ($detection['suggestion'] ?? 'URL already tracked (similar match).');
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

        return $this->json($this->serializeScrapingRequest($scrapingRequest), 201);
    }



    private function resolveWorkspaceUser(string $firebaseUid, UserRepository $userRepository): B2BCompany|B2BMarket|JsonResponse
    {
        $user = $userRepository->findOneBy(['firebase_uid' => $firebaseUid]);
        if (!$user instanceof B2BCompany && !$user instanceof B2BMarket) {
            return $this->json(['error' => 'B2B user not found.'], 404);
        }

        if ($user->isVerified() !== true) {
            return $this->json(['error' => 'B2B account is not verified.'], 403);
        }

        return $user;
    }

    private function resolveWorkspaceSubscription(B2BCompany|B2BMarket $user, EntityManagerInterface $entityManager): array
    {
        $criteria = $user instanceof B2BCompany ? ['company' => $user] : ['market' => $user];
        /** @var B2BSubscription|null $current */
        $current = $entityManager->getRepository(B2BSubscription::class)->findOneBy(
            $criteria,
            ['created_at' => 'DESC', 'id' => 'DESC']
        );

        if (!$current instanceof B2BSubscription) {
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
        // auto-deactivate if expired
        $isStillActive = $current->isActive() && ($endDate === null || $endDate > $now);

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
        $rows = $productListingRepository->findListingRows();
        if ($user instanceof B2BCompany) {
            $sellerId = $user->getSeller()?->getId();
            if ($sellerId !== null) {
                $rows = $productListingRepository->findListingRows(null, $sellerId);
            }
            $listings = array_values(array_map(fn (array $row) => $this->normalizeListingRow($row), $rows));
            return $this->enrichListingsWithRank($listings, $entityManager);
        }

        $marketNames = array_filter([
            mb_strtolower((string) $user->getCompanyName()),
            mb_strtolower((string) $user->getCompanyMarket()),
        ]);
        
        $marketSellerId = $user->getSeller()?->getId();

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
        $productIds = array_unique(array_filter(array_map(static fn (array $l) => $l['productId'], $listings)));
        if (empty($productIds)) {
            return $listings;
        }

        $qb = $entityManager->createQueryBuilder()
            ->select('IDENTITY(pl.product) AS pid, COUNT(pl.id) AS total, MIN(pl.price) AS min_price')
            ->from(ProductListing::class, 'pl')
            ->where('pl.product IN (:pids)')
            ->andWhere('pl.is_active = true')
            ->andWhere('pl.price IS NOT NULL')
            ->setParameter('pids', $productIds)
            ->groupBy('pl.product');

        $stats = $qb->getQuery()->getResult();
        $productStats = [];
        foreach ($stats as $s) {
            $productStats[(int) $s['pid']] = [
                'total' => (int) $s['total'],
                'min_price' => (float) $s['min_price'],
            ];
        }

        $cheaperCounts = [];
        foreach ($listings as $listing) {
            $pid = $listing['productId'];
            $price = $listing['price'];
            if ($pid === null || $price === null) continue;
            if (!isset($cheaperCounts[$pid])) {
                $conn = $entityManager->getConnection();
                $count = $conn->fetchOne(
                    'SELECT COUNT(DISTINCT pl.id) FROM product_listing pl '
                    . 'WHERE pl.product_id = :pid AND pl.is_active = true '
                    . 'AND pl.price IS NOT NULL AND pl.price < :price',
                    ['pid' => $pid, 'price' => $price]
                );
                $cheaperCounts[$pid] = (int) $count;
            }
        }

        return array_map(function (array $listing) use ($productStats, $cheaperCounts) {
            $pid = $listing['productId'];
            $price = $listing['price'];
            if ($pid !== null && $price !== null && isset($productStats[$pid])) {
                $total = max(1, $productStats[$pid]['total']);
                $cheaper = $cheaperCounts[$pid] ?? 0;
                $listing['vendor_rank'] = $cheaper + 1;
                $listing['total_sellers'] = $total;
                $listing['cheapest_price'] = $productStats[$pid]['min_price'];
            } else {
                $listing['vendor_rank'] = null;
                $listing['total_sellers'] = null;
                $listing['cheapest_price'] = null;
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
        $newThisWeek = 0;
        foreach ($rows as $row) {
            $created = $row['created_at'] ?? null;
            if ($created instanceof \DateTimeInterface && $created >= $sevenDaysAgo) {
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

            $metrics = [
                'mode' => 'vendor',
                'products_count' => $productsCount,
                'new_products_this_week' => $newThisWeek,
                'listings_count' => count($rows),
                'average_trust_score' => $averageTrustScore,
                'in_stock_count' => $inStockCount,
                'out_of_stock_count' => $outOfStockCount,
                'notifications_count' => $notificationsCount,
                'stock_monitoring' => $this->buildStockMonitoring($rows),
                'top_listings' => array_slice($rows, 0, $trackingLimit),
                'tracking_limit' => $trackingLimit,
                'tracked_product_ids' => $trackedProductIds,
            ];

            if ($isGold && $vendorSellerId !== null && $productsCount > 0) {
                $metrics['competitor_pricing'] = $this->buildVendorCompetitorPricing($rows, $entityManager, $vendorSellerId, $trackingLimit, $trackedProductIds);
                $metrics['opportunities'] = $this->buildVendorOpportunities($rows, $entityManager);
            } else {
                $metrics['competitor_pricing'] = [];
                $metrics['opportunities'] = [];
            }

            return $metrics;
        }

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
            'competitor_ranking' => $this->buildCompetitorRanking($rows),
        ];

        if ($isGold) {
            $metrics['reputation'] = $this->buildReputationIntelligence($rows, $entityManager);
            $metrics['demand_intelligence'] = $this->buildDemandIntelligence($searchInsights);
        } else {
            $metrics['reputation'] = ['average_rating' => null, 'positive_keywords' => [], 'negative_keywords' => []];
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

        return [
            'top_queries' => array_slice($topQueries, 0, 10, true),
            'zero_result_queries' => array_slice($zeroResults, 0, 10, true),
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
            $items[] = [
                'product_id' => $row['productId'] ?? null,
                'product_name' => $row['productName'] ?? null,
                'out_of_stock_rate' => ($row['availability'] ?? null) === false ? 100 : 0,
                'trust_score' => $row['trust_score'] ?? null,
                'listing_url' => $row['product_url'] ?? null,
            ];
        }

        return array_slice($items, 0, 20);
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

                $stats = ['cheapest_price' => null, 'total_sellers' => null, 'vendor_rank' => null];
                if ($productId !== null && $price !== null) {
                    $conn = $entityManager->getConnection();
                    $cheapest = $conn->fetchOne('SELECT MIN(price) FROM product_listing WHERE product_id = :pid AND is_active = true AND price IS NOT NULL', ['pid' => $productId]);
                    $total = $conn->fetchOne('SELECT COUNT(DISTINCT id) FROM product_listing WHERE product_id = :pid AND is_active = true AND price IS NOT NULL', ['pid' => $productId]);
                    $cheaper = $conn->fetchOne('SELECT COUNT(DISTINCT id) FROM product_listing WHERE product_id = :pid AND is_active = true AND price IS NOT NULL AND price < :price', ['pid' => $productId, 'price' => $price]);
                    $stats = [
                        'cheapest_price' => $cheapest !== false ? (float) $cheapest : null,
                        'total_sellers' => $total !== false ? (int) $total : null,
                        'vendor_rank' => $cheaper !== false ? (int) $cheaper + 1 : null,
                    ];
                }

                $gap = $stats['cheapest_price'] !== null && $price !== null
                    ? round($price - $stats['cheapest_price'], 2)
                    : null;

                $rows[] = [
                    $row['productName'] ?? 'Unknown',
                    $price !== null ? number_format($price, 2) . ' DT' : 'N/A',
                    $stats['cheapest_price'] !== null ? number_format($stats['cheapest_price'], 2) . ' DT' : 'N/A',
                    'N/A',
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

            foreach ($listings as $row) {
                $productId = $row['productId'] ?? null;
                $yourStock = ($row['availability'] ?? null) === true ? 'In Stock' : 'Out of Stock';
                $trustScore = $row['trust_score'] ?? null;

                $inStock = $oos = 0;
                $opportunity = 'No';
                $total = null;
                if ($productId !== null) {
                    $conn = $entityManager->getConnection();
                    $allListings = $conn->fetchAllAssociative('SELECT availability FROM product_listing WHERE product_id = :pid AND is_active = true', ['pid' => $productId]);
                    $total = count($allListings);
                    $inStock = count(array_filter($allListings, fn($l) => (bool) $l['availability']));
                    $oos = $total - $inStock;
                    if ($oos > 0 && ($row['availability'] ?? null) === true) {
                        $opportunity = 'Yes — ' . $oos . ' competitor(s) OOS';
                    }
                }

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
            'target_type' => $request->getTargetType(),
            'target_url' => $request->getTargetUrl(),
            'status' => $request->getStatus(),
            'duration_days' => $request->getDurationDays(),
            'budget_proposal' => $request->getBudgetProposal(),
            'notes' => $request->getNotes(),
            'created_at' => $request->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            'updated_at' => $request->getUpdatedAt()?->format(\DateTimeInterface::ATOM),
            'product_id' => $request->getProduct()?->getId(),
            'product_name' => $request->getProduct()?->getName(),
            'category_id' => $request->getCategory()?->getId(),
            'category_name' => $request->getCategory()?->getName(),
            'brand_filter' => $request->getBrandFilter(),
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
            'trust_score_breakdown' => $row['trust_score_breakdown'] ?? null,
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
        $trustMin = $request->query->get('trust_min');
        $trustMax = $request->query->get('trust_max');
        $priceMin = $request->query->get('price_min');
        $priceMax = $request->query->get('price_max');
        $anomaliesOnly = filter_var((string) $request->query->get('anomalies_only', 'false'), FILTER_VALIDATE_BOOLEAN);

        return array_values(array_filter($rows, static function (array $row) use ($category, $inStock, $trustMin, $trustMax, $priceMin, $priceMax, $anomaliesOnly): bool {
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

            return true;
        }));
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
}
