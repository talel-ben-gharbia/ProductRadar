<?php

namespace App\Controller;

use App\Entity\Admin;
use App\Entity\B2BAdsRequest;
use App\Entity\B2BAdsCampaign;
use App\Entity\B2BCompany;
use App\Entity\B2BMarket;
use App\Entity\B2BReport;
use App\Entity\Subscription;
use App\Entity\TrustScoreWeight;
use App\Service\B2BNotificationService;
use App\Service\TrustScoreCalculationService;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Cache\CacheItemPoolInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use App\Security\AdminApiGuard;
use Symfony\Component\Routing\Attribute\Route;


#[Route('/api/b2b/admin')]
final class B2BAdminController extends AbstractController
{
    use CachedResponseTrait;

    private const CACHE_KEY_REPORTS = 'b2b_admin.reports';
    private const CACHE_KEY_SUBSCRIPTIONS = 'b2b_admin.subscriptions';
    private const CACHE_KEY_ADS = 'b2b_admin.ads_requests';
    private const CACHE_KEY_COMPANIES = 'b2b_admin.companies';
    private const CACHE_KEY_MARKETS = 'b2b_admin.markets';
    private const CACHE_KEY_WEIGHTS = 'b2b_admin.trust_score_weights';
    private const CACHE_KEY_HISTORY = 'b2b_admin.trust_score_history';

    public function __construct(
        #[Autowire(service: 'general.cache')]
        private readonly CacheItemPoolInterface $cache,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }
    #[Route('/subscriptions/{subscriptionId}/approve', name: 'b2b_admin_approve_subscription', methods: ['POST'])]
    public function approveSubscription(
        int $subscriptionId,
        Request $request,
        AdminApiGuard $adminApiGuard,
        EntityManagerInterface $entityManager,
        B2BNotificationService $b2bNotificationService,
    ): JsonResponse {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $subscription = $entityManager->find(Subscription::class, $subscriptionId);
        if (!$subscription instanceof Subscription) {
            return $this->json(['error' => 'Subscription not found.'], 404);
        }

        $adminId = $adminApiGuard->getAdminId($request);
        $admin = $adminId !== null ? $entityManager->find(Admin::class, $adminId) : null;
        if (!$admin instanceof Admin) {
            return $this->json(['error' => 'Current user is not an admin.'], 403);
        }

        $subscription->setActive(true);
        $subscription->setActivatedAt(new \DateTimeImmutable());
        $subscription->setActivatedByAdminId($admin?->getId());
        $subscription->setUpdatedAt(new \DateTimeImmutable());

        $entityManager->flush();

        $this->invalidateCache($this->cache);
        $b2bNotificationService->notifySubscriptionApproved($subscription, $admin);

        return $this->json([
            'id' => $subscription->getId(),
            'status' => 'APPROVED',
            'activated_at' => $subscription->getActivatedAt()?->format(\DateTimeInterface::ATOM),
        ]);
    }

    #[Route('/subscriptions/{subscriptionId}/reject', name: 'b2b_admin_reject_subscription', methods: ['POST'])]
    public function rejectSubscription(
        int $subscriptionId,
        Request $request,
        AdminApiGuard $adminApiGuard,
        EntityManagerInterface $entityManager,
        B2BNotificationService $b2bNotificationService,
    ): JsonResponse {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $subscription = $entityManager->find(Subscription::class, $subscriptionId);
        if (!$subscription instanceof Subscription) {
            return $this->json(['error' => 'Subscription not found.'], 404);
        }

        $b2bNotificationService->notifySubscriptionRejected($subscription);

        $subscription->setActive(false);
        $subscription->setUpdatedAt(new \DateTimeImmutable());

        $entityManager->remove($subscription);
        $entityManager->flush();

        $this->invalidateCache($this->cache);

        return $this->json(['status' => 'REJECTED']);
    }

    #[Route('/ads-requests/{requestId}/approve', name: 'b2b_admin_approve_ads_request', methods: ['POST'])]
    public function approveAdsRequest(
        int $requestId,
        Request $request,
        AdminApiGuard $adminApiGuard,
        EntityManagerInterface $entityManager,
        B2BNotificationService $b2bNotificationService,
    ): JsonResponse {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $adsRequest = $entityManager->find(B2BAdsRequest::class, $requestId);
        if (!$adsRequest instanceof B2BAdsRequest) {
            return $this->json(['error' => 'Ads request not found.'], 404);
        }

        $body = json_decode((string) $request->getContent(), true);
        if (!is_array($body)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        $adsRequest->setStatus('APPROVED');
        $adsRequest->setUpdatedAt(new \DateTimeImmutable());

        $campaign = new B2BAdsCampaign();
        $campaign->setAdsRequest($adsRequest);
        $campaign->setStatus('ACTIVE');
        $campaign->setWidth($this->normalizeNullableInt($body['width'] ?? null));
        $campaign->setHeight($this->normalizeNullableInt($body['height'] ?? null));
        $startsAt = new \DateTimeImmutable($body['starts_at'] ?? 'now');
        $campaign->setStartsAt($startsAt);

        $durationDays = $this->normalizeNullableInt($body['duration_days'] ?? null);
        if ($durationDays !== null && $durationDays > 0) {
            $campaign->setEndsAt(
                $startsAt->add(new \DateInterval("P{$durationDays}D"))
            );
        }

        $campaign->setActive(true);
        $campaign->setCreatedAt(new \DateTimeImmutable());
        $campaign->setUpdatedAt(new \DateTimeImmutable());

        $adminId = $adminApiGuard->getAdminId($request);
        $admin = $adminId !== null ? $entityManager->find(Admin::class, $adminId) : null;

        $entityManager->persist($campaign);
        $entityManager->flush();

        $this->invalidateCache($this->cache);

        $campaignDetails = [
            'duration_days' => $durationDays,
            'width' => $campaign->getWidth(),
            'height' => $campaign->getHeight(),
        ];
        if ($admin instanceof Admin) {
            $b2bNotificationService->notifyAdsRequestApproved($adsRequest, $admin, $campaignDetails);
        }

        return $this->json([
            'ads_request_id' => $adsRequest->getId(),
            'campaign_id' => $campaign->getId(),
            'status' => 'APPROVED',
        ]);
    }

    #[Route('/ads-requests/{requestId}/reject', name: 'b2b_admin_reject_ads_request', methods: ['POST'])]
    public function rejectAdsRequest(
        int $requestId,
        Request $request,
        AdminApiGuard $adminApiGuard,
        EntityManagerInterface $entityManager,
        B2BNotificationService $b2bNotificationService,
    ): JsonResponse {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $adsRequest = $entityManager->find(B2BAdsRequest::class, $requestId);
        if (!$adsRequest instanceof B2BAdsRequest) {
            return $this->json(['error' => 'Ads request not found.'], 404);
        }

        $adsRequest->setStatus('REJECTED');
        $adsRequest->setUpdatedAt(new \DateTimeImmutable());

        $entityManager->flush();

        $this->invalidateCache($this->cache);
        $b2bNotificationService->notifyAdsRequestRejected($adsRequest);

        return $this->json(['status' => 'REJECTED']);
    }


    #[Route('/subscriptions/{subscriptionId}/approve-renewal', name: 'b2b_admin_approve_renewal', methods: ['POST'])]
    public function approveRenewal(
        int $subscriptionId,
        Request $request,
        AdminApiGuard $adminApiGuard,
        EntityManagerInterface $entityManager,
        B2BNotificationService $b2bNotificationService,
    ): JsonResponse {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $renewalRequest = $entityManager->find(Subscription::class, $subscriptionId);
        if (!$renewalRequest instanceof Subscription) {
            return $this->json(['error' => 'Renewal request not found.'], 404);
        }

        $adminId = $adminApiGuard->getAdminId($request);
        $admin = $adminId !== null ? $entityManager->find(Admin::class, $adminId) : null;

        $ownerType = $renewalRequest->getOwnerType();
        $ownerId = $renewalRequest->getOwnerId();

        $currentSub = $entityManager->getRepository(Subscription::class)->findOneBy(
            ['owner_type' => $ownerType, 'owner_id' => $ownerId, 'active' => true],
            ['created_at' => 'DESC', 'id' => 'DESC']
        );

        $targetSub = $currentSub ?? $renewalRequest;
        $durationMonths = $renewalRequest->getDurationMonths() ?? 12;
        $currentEnd = $targetSub->getEndDate() ?? new \DateTimeImmutable();
        $newEnd = $currentEnd > new \DateTimeImmutable()
            ? (clone $currentEnd)->modify("+{$durationMonths} months")
            : (new \DateTimeImmutable())->modify("+{$durationMonths} months");

        $targetSub->setEndDate($newEnd);
        $targetSub->setUpdatedAt(new \DateTimeImmutable());
        $targetSub->setActive(true);

        if ($admin instanceof Admin && $targetSub !== $renewalRequest) {
            $renewalRequest->setUpdatedAt(new \DateTimeImmutable());
        }

        if ($currentSub instanceof Subscription && $currentSub->getId() !== $renewalRequest->getId()) {
            $entityManager->remove($renewalRequest);
        }

        $entityManager->flush();

        $b2bNotificationService->notifySubscriptionRenewed($targetSub);

        return $this->json([
            'status' => 'RENEWED',
            'id' => $targetSub->getId(),
            'new_end_date' => $newEnd->format(\DateTimeInterface::ATOM),
        ]);
    }

    #[Route('/subscriptions/{subscriptionId}/reject-renewal', name: 'b2b_admin_reject_renewal', methods: ['POST'])]
    public function rejectRenewal(
        int $subscriptionId,
        Request $request,
        AdminApiGuard $adminApiGuard,
        EntityManagerInterface $entityManager,
        B2BNotificationService $b2bNotificationService,
    ): JsonResponse {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $renewalRequest = $entityManager->find(Subscription::class, $subscriptionId);
        if (!$renewalRequest instanceof Subscription) {
            return $this->json(['error' => 'Renewal request not found.'], 404);
        }

        $entityManager->remove($renewalRequest);
        $entityManager->flush();

        $b2bNotificationService->notifySubscriptionRejected($renewalRequest);

        return $this->json(['status' => 'REJECTED']);
    }

    #[Route('/subscriptions/pending-renewals', name: 'b2b_admin_list_pending_renewals', methods: ['GET'])]
    public function listPendingRenewals(
        Request $request,
        AdminApiGuard $adminApiGuard,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $items = $entityManager->createQueryBuilder()
            ->select('sub')
            ->from(Subscription::class, 'sub')
            ->where('sub.active = false')
            ->orderBy('sub.created_at', 'DESC')
            ->getQuery()
            ->getResult();

        return $this->json([
                'items' => array_map(function (Subscription $sub): array {
                    $company = $sub->getOwnerType() === 'COMPANY' && $sub->getOwnerId() !== null
                        ? $this->entityManager->find(B2BCompany::class, $sub->getOwnerId()) : null;
                    $market = $sub->getOwnerType() === 'MARKET' && $sub->getOwnerId() !== null
                        ? $this->entityManager->find(B2BMarket::class, $sub->getOwnerId()) : null;

                    return [
                        'id' => $sub->getId(),
                        'owner_type' => $sub->getOwnerType(),
                        'plan_type' => $sub->getPlanType(),
                        'active' => $sub->isActive(),
                        'duration_months' => $sub->getDurationMonths(),
                        'start_date' => $sub->getStartDate()?->format(\DateTimeInterface::ATOM),
                        'end_date' => $sub->getEndDate()?->format(\DateTimeInterface::ATOM),
                        'created_at' => $sub->getCreatedAt()?->format(\DateTimeInterface::ATOM),
                        'company_id' => $company?->getId(),
                        'market_id' => $market?->getId(),
                        'name' => $company?->getName(),
                        'market_name' => $market?->getName(),
                    ];
                }, $items),
        ]);
    }

    #[Route('/reports', name: 'b2b_admin_list_reports', methods: ['GET'])]
    public function listReports(
        Request $request,
        AdminApiGuard $adminApiGuard,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $limit = max(1, min(100, $request->query->getInt('limit', 25)));
        $offset = max(0, $request->query->getInt('offset', 0));

        $cacheKey = self::CACHE_KEY_REPORTS . ".l{$limit}o{$offset}";

        return $this->cachedGet($this->cache, $cacheKey, static function () use ($entityManager, $limit, $offset): array {
            $qb = $entityManager->createQueryBuilder()
                ->select('r')
                ->from(B2BReport::class, 'r')
                ->orderBy('r.created_at', 'DESC')
                ->setMaxResults($limit)
                ->setFirstResult($offset);

            $items = $qb->getQuery()->getResult();
            $total = $entityManager->createQueryBuilder()
                ->select('COUNT(r.id)')
                ->from(B2BReport::class, 'r')
                ->getQuery()
                ->getSingleScalarResult();

            return [
                'items' => array_map(fn (B2BReport $r) => [
                    'id' => $r->getId(),
                    'type' => $r->getReportType(),
                    'status' => $r->getStatus(),
                    'period_start' => $r->getPeriodStart()?->format(\DateTimeInterface::ATOM),
                    'period_end' => $r->getPeriodEnd()?->format(\DateTimeInterface::ATOM),
                    'name' => $r->getCompany()?->getName(),
                    'market_name' => $r->getMarket()?->getName(),
                    'created_at' => $r->getCreatedAt()?->format(\DateTimeInterface::ATOM),
                    'file_url' => $r->getFilePath(),
                ], $items),
                'pagination' => ['limit' => $limit, 'offset' => $offset, 'total' => $total],
            ];
        });
    }

    #[Route('/subscriptions', name: 'b2b_admin_list_subscriptions', methods: ['GET'])]
    public function listSubscriptions(
        Request $request,
        AdminApiGuard $adminApiGuard,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $limit = max(1, min(100, $request->query->getInt('limit', 25)));
        $offset = max(0, $request->query->getInt('offset', 0));
        $activeOnly = filter_var((string) $request->query->get('active_only', 'false'), FILTER_VALIDATE_BOOLEAN);

        $cacheKey = self::CACHE_KEY_SUBSCRIPTIONS . ".l{$limit}o{$offset}a" . ($activeOnly ? '1' : '0');

        return $this->cachedGet($this->cache, $cacheKey, static function () use ($entityManager, $limit, $offset, $activeOnly): array {
            $qb = $entityManager->createQueryBuilder()
                ->select('sub')
                ->from(Subscription::class, 'sub')
                ->orderBy('sub.created_at', 'DESC')
                ->setMaxResults($limit)
                ->setFirstResult($offset);

            if ($activeOnly) {
                $qb->andWhere('sub.active = true');
            }

            $items = $qb->getQuery()->getResult();
            $total = $entityManager->createQueryBuilder()
                ->select('COUNT(sub.id)')
                ->from(Subscription::class, 'sub')
                ->getQuery()
                ->getSingleScalarResult();

            return [
                'items' => array_map(function (Subscription $sub): array {
                    $company = $sub->getOwnerType() === 'COMPANY' && $sub->getOwnerId() !== null
                        ? $this->entityManager->find(B2BCompany::class, $sub->getOwnerId()) : null;
                    $market = $sub->getOwnerType() === 'MARKET' && $sub->getOwnerId() !== null
                        ? $this->entityManager->find(B2BMarket::class, $sub->getOwnerId()) : null;

                    return [
                        'id' => $sub->getId(),
                        'owner_type' => $sub->getOwnerType(),
                        'plan_type' => $sub->getPlanType(),
                        'active' => $sub->isActive(),
                        'duration_months' => $sub->getDurationMonths(),
                        'start_date' => $sub->getStartDate()?->format(\DateTimeInterface::ATOM),
                        'end_date' => $sub->getEndDate()?->format(\DateTimeInterface::ATOM),
                        'created_at' => $sub->getCreatedAt()?->format(\DateTimeInterface::ATOM),
                        'activated_at' => $sub->getActivatedAt()?->format(\DateTimeInterface::ATOM),
                        'company_id' => $company?->getId(),
                        'market_id' => $market?->getId(),
                        'name' => $company?->getName(),
                        'market_name' => $market?->getName(),
                    ];
                }, $items),
                'pagination' => [
                    'limit' => $limit,
                    'offset' => $offset,
                    'total' => $total,
                ],
            ];
        });
    }

    #[Route('/ads-requests', name: 'b2b_admin_list_ads_requests', methods: ['GET'])]
    public function listAdsRequests(
        Request $request,
        AdminApiGuard $adminApiGuard,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $limit = max(1, min(100, $request->query->getInt('limit', 25)));
        $offset = max(0, $request->query->getInt('offset', 0));
        $status = trim((string) $request->query->get('status', ''));

        $cacheKey = self::CACHE_KEY_ADS . ".l{$limit}o{$offset}s{$status}";

        return $this->cachedGet($this->cache, $cacheKey, static function () use ($entityManager, $limit, $offset, $status): array {
            $qb = $entityManager->createQueryBuilder()
                ->select('ar')
                ->from(B2BAdsRequest::class, 'ar')
                ->orderBy('ar.created_at', 'DESC')
                ->setMaxResults($limit)
                ->setFirstResult($offset);

            if ($status !== '') {
                $qb->andWhere('ar.status = :status')
                    ->setParameter('status', strtoupper($status));
            }

            $items = $qb->getQuery()->getResult();
            $total = $entityManager->createQueryBuilder()
                ->select('COUNT(ar.id)')
                ->from(B2BAdsRequest::class, 'ar')
                ->getQuery()
                ->getSingleScalarResult();

            return [
                'items' => array_map(fn (B2BAdsRequest $ar) => [
                    'id' => $ar->getId(),
                    'owner_type' => $ar->getOwnerType(),
                    'request_type' => $ar->getRequestType(),
                    'image_url' => $ar->getImageUrl(),
                    'link_url' => $ar->getLinkUrl(),
                    'image_mime_type' => $ar->getImageMimeType(),
                    'status' => $ar->getStatus(),
                    'company_id' => $ar->getCompany()?->getId(),
                    'name' => $ar->getCompany()?->getName(),
                    'created_at' => $ar->getCreatedAt()?->format(\DateTimeInterface::ATOM),
                    'updated_at' => $ar->getUpdatedAt()?->format(\DateTimeInterface::ATOM),
                ], $items),
                'pagination' => [
                    'limit' => $limit,
                    'offset' => $offset,
                    'total' => $total,
                ],
            ];
        });
    }

    #[Route('/companies', name: 'b2b_admin_list_companies', methods: ['GET'])]
    public function listCompanies(
        Request $request,
        AdminApiGuard $adminApiGuard,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $limit = max(1, min(100, $request->query->getInt('limit', 25)));
        $offset = max(0, $request->query->getInt('offset', 0));

        $cacheKey = self::CACHE_KEY_COMPANIES . ".l{$limit}o{$offset}";

        return $this->cachedGet($this->cache, $cacheKey, function () use ($entityManager, $limit, $offset): array {
            $qb = $entityManager->createQueryBuilder()
                ->select('c')
                ->from(B2BCompany::class, 'c')
                ->orderBy('c.joinedAt', 'DESC')
                ->setMaxResults($limit)
                ->setFirstResult($offset);

            $items = $qb->getQuery()->getResult();

            $reportRepo = $entityManager->getRepository(B2BReport::class);
            $listingRepo = $entityManager->getRepository(\App\Entity\ProductListing::class);

            $total = $entityManager->createQueryBuilder()->select('COUNT(c.id)')->from(B2BCompany::class, 'c')->getQuery()->getSingleScalarResult();

            return [
                'items' => array_map(function (B2BCompany $c) use ($reportRepo, $listingRepo) {
                    $listingsCount = 0;
                    if ($c->getSeller()) {
                        $listingsCount = (int) $listingRepo->createQueryBuilder('pl')
                            ->select('COUNT(pl.id)')
                            ->where('pl.seller = :seller')
                            ->setParameter('seller', $c->getSeller())
                            ->getQuery()
                            ->getSingleScalarResult();
                    }

                    return [
                        'id' => $c->getId(),
                        'email' => $c->getEmail(),
                        'name' => $c->getName(),
                        'status' => $c->getB2bStatus(),
                        'is_verified' => $c->isVerified(),
                        'joined_at' => $c->getJoinedAt()?->format(\DateTimeInterface::ATOM),
                        'listings_count' => $listingsCount,
                        'reports_count' => (int) $reportRepo->createQueryBuilder('r')->select('COUNT(r.id)')->where('r.company = :company')->setParameter('company', $c)->getQuery()->getSingleScalarResult(),
                    ];
                }, $items),
                'pagination' => ['limit' => $limit, 'offset' => $offset, 'total' => $total],
            ];
        });
    }

    #[Route('/markets', name: 'b2b_admin_list_markets', methods: ['GET'])]
    public function listMarkets(
        Request $request,
        AdminApiGuard $adminApiGuard,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $limit = max(1, min(100, $request->query->getInt('limit', 25)));
        $offset = max(0, $request->query->getInt('offset', 0));

        $cacheKey = self::CACHE_KEY_MARKETS . ".l{$limit}o{$offset}";

        return $this->cachedGet($this->cache, $cacheKey, function () use ($entityManager, $limit, $offset): array {
            $qb = $entityManager->createQueryBuilder()
                ->select('m')
                ->from(B2BMarket::class, 'm')
                ->orderBy('m.joinedAt', 'DESC')
                ->setMaxResults($limit)
                ->setFirstResult($offset);

            $items = $qb->getQuery()->getResult();
            $reportRepo = $entityManager->getRepository(B2BReport::class);

            $total = $entityManager->createQueryBuilder()->select('COUNT(m.id)')->from(B2BMarket::class, 'm')->getQuery()->getSingleScalarResult();

            return [
                'items' => array_map(function (B2BMarket $m) use ($reportRepo) {
                    return [
                        'id' => $m->getId(),
                        'email' => $m->getEmail(),
                        'name' => $m->getName(),
                        'status' => $m->getB2bStatus(),
                        'is_verified' => $m->isVerified(),
                        'joined_at' => $m->getJoinedAt()?->format(\DateTimeInterface::ATOM),
                        'reports_count' => (int) $reportRepo->createQueryBuilder('r')->select('COUNT(r.id)')->where('r.market = :market')->setParameter('market', $m)->getQuery()->getSingleScalarResult(),
                    ];
                }, $items),
                'pagination' => ['limit' => $limit, 'offset' => $offset, 'total' => $total],
            ];
        });
    }

    #[Route('/trust-score/recalculate', name: 'b2b_admin_recalculate_trust_scores', methods: ['POST'])]
    public function recalculateTrustScores(
        Request $request,
        AdminApiGuard $adminApiGuard,
        TrustScoreCalculationService $trustScoreService,
    ): JsonResponse {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $full = filter_var((string) $request->query->get('full', 'false'), FILTER_VALIDATE_BOOLEAN);

        set_time_limit(300);

        $updated = $full
            ? $trustScoreService->recalculateAllListings()
            : $trustScoreService->recalculateStaleListings();

        return $this->json([
            'status' => 'ok',
            'mode' => $full ? 'full' : 'incremental',
            'updated' => $updated,
        ]);
    }

    #[Route('/trust-score/weights', name: 'b2b_admin_get_trust_score_weights', methods: ['GET'])]
    public function getTrustScoreWeights(
        Request $request,
        AdminApiGuard $adminApiGuard,
    ): JsonResponse {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        return $this->cachedGet($this->cache, self::CACHE_KEY_WEIGHTS, function (): array {
            $conn = $this->entityManager->getConnection();
            $rows = $conn->fetchAllAssociative('
                SELECT id, weight_key, weight_label, weight_value::numeric(5,4) AS weight_value, weight_group, sort_order
                FROM trust_score_weight ORDER BY sort_order
            ');

            return ['items' => $rows];
        });
    }

    #[Route('/trust-score/weights', name: 'b2b_admin_update_trust_score_weights', methods: ['POST'])]
    public function updateTrustScoreWeights(
        Request $request,
        AdminApiGuard $adminApiGuard,
        TrustScoreCalculationService $trustScoreService,
    ): JsonResponse {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $body = json_decode((string) $request->getContent(), true);
        if (!is_array($body) || !isset($body['weights'])) {
            return $this->json(['error' => 'Invalid request body. Expected {weights: [{id, weight_value}]}'], 400);
        }

        $conn = $this->entityManager->getConnection();
        $conn->beginTransaction();
        try {
            foreach ($body['weights'] as $w) {
                $id = (int) ($w['id'] ?? 0);
                $value = (float) ($w['weight_value'] ?? 0);
                if ($id > 0 && $value >= 0) {
                    $conn->executeStatement(
                        'UPDATE trust_score_weight SET weight_value = ? WHERE id = ?',
                        [$value, $id]
                    );
                }
            }
            $conn->commit();
        } catch (\Throwable $e) {
            $conn->rollBack();

            return $this->json(['error' => 'Update failed: ' . $e->getMessage()], 500);
        }

        $trustScoreService->clearWeightCache();

        return $this->json(['status' => 'ok']);
    }

    #[Route('/trust-score/history', name: 'b2b_admin_get_trust_score_history', methods: ['GET'])]
    public function getTrustScoreHistory(
        Request $request,
        AdminApiGuard $adminApiGuard,
    ): JsonResponse {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $limit = max(1, min(500, $request->query->getInt('limit', 100)));

        $cacheKey = self::CACHE_KEY_HISTORY . ".l{$limit}";

        return $this->cachedGet($this->cache, $cacheKey, function () use ($limit): array {
            $conn = $this->entityManager->getConnection();
            $rows = $conn->fetchAllAssociative('
                SELECT h.id, h.listing_id, h.score, h.created_at,
                       pl.product_id, p.name AS product_name
                FROM trust_score_history h
                LEFT JOIN product_listing pl ON pl.id = h.listing_id
                LEFT JOIN product p ON p.id = pl.product_id
                ORDER BY h.created_at DESC
                LIMIT :limit
            ', ['limit' => $limit]);

            return ['items' => $rows];
        });
    }

    private function normalizeNullableFloat(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }

    private function normalizeNullableInt(mixed $value): ?int
    {
        return is_numeric($value) ? (int) $value : null;
    }
}
