<?php

namespace App\Controller;

use App\Entity\B2BAdsRequest;
use App\Entity\B2BCompany;
use App\Entity\B2BMarket;
use App\Entity\B2BReport;
use App\Entity\B2BScrapingRequest;
use App\Entity\B2BSearchLog;
use App\Entity\B2BSubscription;
use App\Entity\Notification;
use App\Entity\ProductListing;
use App\Entity\Seller;
use App\Entity\User;
use App\Repository\ProductListingRepository;
use App\Repository\UserRepository;
use App\Service\B2BPlanGatingService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/b2b/workspace')]
final class B2BWorkspaceController extends AbstractController
{
    public function __construct(private readonly B2BPlanGatingService $gatingService)
    {
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

            return $this->json([
                'items' => array_map(fn (B2BAdsRequest $item) => $this->serializeAdsRequest($item), $items),
            ]);
        }

        $body = json_decode((string) $request->getContent(), true);
        if (!is_array($body)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        $adsRequest = new B2BAdsRequest();
        $adsRequest->setOwnerType($user instanceof B2BMarket ? 'B2B_MARKET' : 'B2B_COMPANY');
        if ($user instanceof B2BCompany) {
            $adsRequest->setCompany($user);
        }
        $adsRequest->setRequestType($this->normalizeString($body['requestType'] ?? 'BANNER'));
        $adsRequest->setDurationDays($this->normalizeNullableInt($body['durationDays'] ?? null));
        $adsRequest->setBudgetProposal($this->normalizeNullableFloat($body['budgetProposal'] ?? null));
        $adsRequest->setNotes($this->normalizeNullableString($body['notes'] ?? null));
        $adsRequest->setStatus('PENDING');
        $adsRequest->setCreatedAt(new \DateTimeImmutable());
        $adsRequest->setUpdatedAt(new \DateTimeImmutable());

        if (!empty($body['productId'])) {
            $product = $entityManager->find(\App\Entity\Product::class, (int) $body['productId']);
            if ($product instanceof \App\Entity\Product) {
                $adsRequest->setProduct($product);
            }
        }

        if (!empty($body['categoryId'])) {
            $category = $entityManager->find(\App\Entity\Category::class, (int) $body['categoryId']);
            if ($category instanceof \App\Entity\Category) {
                $adsRequest->setCategory($category);
            }
        }

        $entityManager->persist($adsRequest);
        $entityManager->flush();

        return $this->json($this->serializeAdsRequest($adsRequest), 201);
    }

    #[Route('/{firebaseUid}/reports', name: 'b2b_workspace_reports', methods: ['GET', 'POST'])]
    public function reports(
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

        $report = new B2BReport();
        if ($user instanceof B2BCompany) {
            $report->setCompany($user);
            $report->setOwnerType('COMPANY');
        } else {
            $report->setMarket($user);
            $report->setOwnerType('MARKET');
        }
        $report->setReportType($reportType);
        $report->setStatus('GENERATED'); // Simulate immediate generation
        $report->setFilePath('/reports/simulated-' . uniqid() . '.csv');
        $report->setGeneratedAt(new \DateTimeImmutable());
        $report->setCreatedAt(new \DateTimeImmutable());

        $entityManager->persist($report);
        $entityManager->flush();

        return $this->json(['id' => $report->getId(), 'status' => 'GENERATED'], 201);
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
        $duplicateReason = $this->detectScrapingDuplicateReason($normalizedUrl, $entityManager);
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
            return array_values(array_map(fn (array $row) => $this->normalizeListingRow($row), $rows));
        }

        $marketNames = array_filter([
            mb_strtolower((string) $user->getCompanyName()),
            mb_strtolower((string) $user->getCompanyMarket()),
        ]);
        
        $marketSellerId = $user->getSeller()?->getId();

        $filtered = array_filter($rows, static function (array $row) use ($marketNames, $marketSellerId): bool {
            // Check if seller matches
            if ($marketSellerId !== null && isset($row['sellerId']) && (int) $row['sellerId'] === $marketSellerId) {
                return true;
            }

            // Check if brand matches
            $brand = mb_strtolower(trim((string) ($row['productBrand'] ?? '')));
            return $brand !== '' && in_array($brand, $marketNames, true);
        });

        return array_values(array_map(fn (array $row) => $this->normalizeListingRow($row), $filtered));
    }

    private function buildWorkspaceMetrics(B2BCompany|B2BMarket $user, array $rows, EntityManagerInterface $entityManager, array $searchInsights): array
    {
        $trustScores = array_values(array_filter(array_map(static fn (array $row): ?float => is_numeric($row['trust_score'] ?? null) ? (float) $row['trust_score'] : null, $rows)));
        $averageTrustScore = count($trustScores) > 0 ? round(array_sum($trustScores) / count($trustScores), 2) : null;
        $inStockCount = count(array_filter($rows, static fn (array $row): bool => ($row['availability'] ?? null) === true));
        $outOfStockCount = count(array_filter($rows, static fn (array $row): bool => ($row['availability'] ?? null) === false));
        $notificationsCount = count($this->fetchWorkspaceNotifications($user, $entityManager, 1000));

        $gatingService = $this->gatingService;
        $isGold = $gatingService->canAccessFeature($user, B2BPlanGatingService::FEATURE_COMPETITOR_PRICING);

        if ($user instanceof B2BCompany) {
            $vendorSellerId = $user->getSeller()?->getId();
            $metrics = [
                'mode' => 'vendor',
                'products_count' => count(array_unique(array_filter(array_map(static fn (array $row): ?int => isset($row['productId']) ? (int) $row['productId'] : null, $rows)))),
                'listings_count' => count($rows),
                'average_trust_score' => $averageTrustScore,
                'in_stock_count' => $inStockCount,
                'out_of_stock_count' => $outOfStockCount,
                'notifications_count' => $notificationsCount,
                'stock_monitoring' => $this->buildStockMonitoring($rows),
                'top_listings' => array_slice($rows, 0, 20),
            ];

            if ($isGold) {
                $metrics['competitor_pricing'] = $this->buildVendorCompetitorPricing($rows, $entityManager, $vendorSellerId);
                $metrics['opportunities'] = $this->buildVendorOpportunities($rows);
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

    private function buildVendorCompetitorPricing(array $rows, EntityManagerInterface $entityManager, ?int $vendorSellerId): array
    {
        $productIds = array_values(array_unique(array_filter(array_map(static fn (array $row): ?int => isset($row['productId']) ? (int) $row['productId'] : null, $rows))));
        if ($productIds === [] || $vendorSellerId === null) {
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

        return array_slice($results, 0, 20);
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

    private function buildVendorOpportunities(array $rows): array
    {
        $opportunities = [];
        foreach ($rows as $row) {
            if (($row['availability'] ?? null) === true) {
                $opportunities[] = [
                    'product_id' => $row['productId'] ?? null,
                    'product_name' => $row['productName'] ?? null,
                    'seller_name' => $row['sellerName'] ?? null,
                    'reason' => 'In stock while the market signal is healthy.',
                ];
            }
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
            'status' => $request->getStatus(),
            'duration_days' => $request->getDurationDays(),
            'budget_proposal' => $request->getBudgetProposal(),
            'notes' => $request->getNotes(),
            'created_at' => $request->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            'updated_at' => $request->getUpdatedAt()?->format(\DateTimeInterface::ATOM),
            'product_id' => $request->getProduct()?->getId(),
            'category_id' => $request->getCategory()?->getId(),
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
        return [
            'id' => $row['id'] ?? null,
            'ref' => $row['ref'] ?? null,
            'price' => isset($row['price']) && is_numeric($row['price']) ? (float) $row['price'] : null,
            'old_price' => isset($row['old_price']) && is_numeric($row['old_price']) ? (float) $row['old_price'] : null,
            'product_url' => $row['product_url'] ?? null,
            'availability' => $row['availability'] ?? null,
            'trust_score' => isset($row['trust_score']) && is_numeric($row['trust_score']) ? (float) $row['trust_score'] : null,
            'trust_score_breakdown' => $row['trust_score_breakdown'] ?? null,
            'created_at' => $row['created_at'] ?? null,
            'updated_at' => $row['updated_at'] ?? null,
            'is_active' => $row['is_active'] ?? null,
            'productId' => $row['productId'] ?? null,
            'productName' => $row['productName'] ?? null,
            'productBrand' => $row['productBrand'] ?? null,
            'categoryId' => $row['categoryId'] ?? null,
            'categoryName' => $row['categoryName'] ?? null,
            'sellerId' => $row['sellerId'] ?? null,
            'sellerName' => $row['sellerName'] ?? null,
        ];
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
