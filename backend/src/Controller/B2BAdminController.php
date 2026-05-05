<?php

namespace App\Controller;

use App\Entity\Admin;
use App\Entity\B2BAdsRequest;
use App\Entity\B2BAdsCampaign;
use App\Entity\B2BCompany;
use App\Entity\B2BMarket;
use App\Entity\B2BReport;
use App\Entity\B2BScrapingRequest;
use App\Entity\B2BSubscription;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use App\Security\AdminApiGuard;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/b2b/admin')]
final class B2BAdminController extends AbstractController
{
    #[Route('/subscriptions/{subscriptionId}/approve', name: 'b2b_admin_approve_subscription', methods: ['POST'])]
    public function approveSubscription(
        int $subscriptionId,
        Request $request,
        AdminApiGuard $adminApiGuard,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $subscription = $entityManager->find(B2BSubscription::class, $subscriptionId);
        if (!$subscription instanceof B2BSubscription) {
            return $this->json(['error' => 'Subscription not found.'], 404);
        }

        $adminId = $adminApiGuard->getAdminId($request);
        $admin = $adminId !== null ? $entityManager->find(Admin::class, $adminId) : null;
        if (!$admin instanceof Admin) {
            return $this->json(['error' => 'Current user is not an admin.'], 403);
        }

        $subscription->setActive(true);
        $subscription->setActivatedAt(new \DateTimeImmutable());
        $subscription->setActivatedByAdmin($admin);
        $subscription->setUpdatedAt(new \DateTimeImmutable());

        $entityManager->flush();

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
    ): JsonResponse {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $subscription = $entityManager->find(B2BSubscription::class, $subscriptionId);
        if (!$subscription instanceof B2BSubscription) {
            return $this->json(['error' => 'Subscription not found.'], 404);
        }

        $subscription->setActive(false);
        $subscription->setUpdatedAt(new \DateTimeImmutable());

        $entityManager->remove($subscription);
        $entityManager->flush();

        return $this->json(['status' => 'REJECTED']);
    }

    #[Route('/ads-requests/{requestId}/approve', name: 'b2b_admin_approve_ads_request', methods: ['POST'])]
    public function approveAdsRequest(
        int $requestId,
        Request $request,
        AdminApiGuard $adminApiGuard,
        EntityManagerInterface $entityManager,
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
        $campaign->setAgreedPrice($this->normalizeNullableFloat($body['agreed_price'] ?? null));
        $campaign->setStartsAt(new \DateTimeImmutable($body['starts_at'] ?? 'now'));

        $durationDays = $adsRequest->getDurationDays();
        if ($durationDays !== null && $durationDays > 0) {
            $campaign->setEndsAt(
                (new \DateTimeImmutable())->add(new \DateInterval("P{$durationDays}D"))
            );
        }

        $campaign->setActive(true);
        $campaign->setCreatedAt(new \DateTimeImmutable());
        $campaign->setUpdatedAt(new \DateTimeImmutable());

        $entityManager->persist($campaign);
        $entityManager->flush();

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

        return $this->json(['status' => 'REJECTED']);
    }

    #[Route('/scraping-requests/{requestId}/approve', name: 'b2b_admin_approve_scraping_request', methods: ['POST'])]
    public function approveScrapingRequest(
        int $requestId,
        Request $request,
        AdminApiGuard $adminApiGuard,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $scrapingRequest = $entityManager->find(B2BScrapingRequest::class, $requestId);
        if (!$scrapingRequest instanceof B2BScrapingRequest) {
            return $this->json(['error' => 'Scraping request not found.'], 404);
        }

        $scrapingRequest->setStatus('APPROVED');
        $scrapingRequest->setUpdatedAt(new \DateTimeImmutable());

        $entityManager->flush();

        return $this->json([
            'id' => $scrapingRequest->getId(),
            'status' => 'APPROVED',
        ]);
    }

    #[Route('/scraping-requests/{requestId}/reject', name: 'b2b_admin_reject_scraping_request', methods: ['POST'])]
    public function rejectScrapingRequest(
        int $requestId,
        Request $request,
        AdminApiGuard $adminApiGuard,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $scrapingRequest = $entityManager->find(B2BScrapingRequest::class, $requestId);
        if (!$scrapingRequest instanceof B2BScrapingRequest) {
            return $this->json(['error' => 'Scraping request not found.'], 404);
        }

        $body = json_decode((string) $request->getContent(), true);
        $rejectionReason = is_array($body) ? trim((string) ($body['reason'] ?? '')) : '';

        $scrapingRequest->setStatus('REJECTED');
        if ($rejectionReason !== '') {
            $scrapingRequest->setNotes($rejectionReason);
        }
        $scrapingRequest->setUpdatedAt(new \DateTimeImmutable());

        $entityManager->flush();

        return $this->json(['status' => 'REJECTED']);
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

        return $this->json([
            'items' => array_map(fn (B2BReport $r) => [
                'id' => $r->getId(),
                'type' => $r->getReportType(),
                'status' => $r->getStatus(),
                'period_start' => $r->getPeriodStart()?->format(\DateTimeInterface::ATOM),
                'period_end' => $r->getPeriodEnd()?->format(\DateTimeInterface::ATOM),
                'company_name' => $r->getCompany()?->getCompanyName(),
                'market_name' => $r->getMarket()?->getCompanyName(),
                'created_at' => $r->getCreatedAt()?->format(\DateTimeInterface::ATOM),
                'file_url' => $r->getFilePath(),
            ], $items),
            'pagination' => ['limit' => $limit, 'offset' => $offset, 'total' => $total],
        ]);
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

        $qb = $entityManager->createQueryBuilder()
            ->select('sub')
            ->from(B2BSubscription::class, 'sub')
            ->orderBy('sub.created_at', 'DESC')
            ->setMaxResults($limit)
            ->setFirstResult($offset);

        if ($activeOnly) {
            $qb->andWhere('sub.active = true');
        }

        $items = $qb->getQuery()->getResult();
        $total = $entityManager->createQueryBuilder()
            ->select('COUNT(sub.id)')
            ->from(B2BSubscription::class, 'sub')
            ->getQuery()
            ->getSingleScalarResult();

        return $this->json([
            'items' => array_map(fn (B2BSubscription $sub) => [
                'id' => $sub->getId(),
                'owner_type' => $sub->getOwnerType(),
                'plan_type' => $sub->getPlanType(),
                'active' => $sub->isActive(),
                'duration_months' => $sub->getDurationMonths(),
                'start_date' => $sub->getStartDate()?->format(\DateTimeInterface::ATOM),
                'end_date' => $sub->getEndDate()?->format(\DateTimeInterface::ATOM),
                'created_at' => $sub->getCreatedAt()?->format(\DateTimeInterface::ATOM),
                'activated_at' => $sub->getActivatedAt()?->format(\DateTimeInterface::ATOM),
                'company_id' => $sub->getCompany()?->getId(),
                'market_id' => $sub->getMarket()?->getId(),
                'company_name' => $sub->getCompany()?->getCompanyName(),
                'market_name' => $sub->getMarket()?->getCompanyName(),
            ], $items),
            'pagination' => [
                'limit' => $limit,
                'offset' => $offset,
                'total' => $total,
            ],
        ]);
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

        return $this->json([
            'items' => array_map(fn (B2BAdsRequest $ar) => [
                'id' => $ar->getId(),
                'owner_type' => $ar->getOwnerType(),
                'request_type' => $ar->getRequestType(),
                'status' => $ar->getStatus(),
                'budget_proposal' => $ar->getBudgetProposal(),
                'duration_days' => $ar->getDurationDays(),
                'company_id' => $ar->getCompany()?->getId(),
                'company_name' => $ar->getCompany()?->getCompanyName(),
                'created_at' => $ar->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            ], $items),
            'pagination' => [
                'limit' => $limit,
                'offset' => $offset,
                'total' => $total,
            ],
        ]);
    }

    #[Route('/scraping-requests', name: 'b2b_admin_list_scraping_requests', methods: ['GET'])]
    public function listScrapingRequests(
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

        $qb = $entityManager->createQueryBuilder()
            ->select('sr')
            ->from(B2BScrapingRequest::class, 'sr')
            ->orderBy('sr.created_at', 'DESC')
            ->setMaxResults($limit)
            ->setFirstResult($offset);

        if ($status !== '') {
            $qb->andWhere('sr.status = :status')
                ->setParameter('status', strtoupper($status));
        }

        $items = $qb->getQuery()->getResult();
        $total = $entityManager->createQueryBuilder()
            ->select('COUNT(sr.id)')
            ->from(B2BScrapingRequest::class, 'sr')
            ->getQuery()
            ->getSingleScalarResult();

        return $this->json([
            'items' => array_map(fn (B2BScrapingRequest $sr) => [
                'id' => $sr->getId(),
                'owner_type' => $sr->getOwnerType(),
                'target_type' => $sr->getTargetType(),
                'target_url' => $sr->getTargetUrl(),
                'status' => $sr->getStatus(),
                'is_duplicate' => $sr->isDuplicate(),
                'company_id' => $sr->getCompany()?->getId(),
                'market_id' => $sr->getMarket()?->getId(),
                'company_name' => $sr->getCompany()?->getCompanyName(),
                'market_name' => $sr->getMarket()?->getCompanyName(),
                'created_at' => $sr->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            ], $items),
            'pagination' => [
                'limit' => $limit,
                'offset' => $offset,
                'total' => $total,
            ],
        ]);
    }

    #[Route('/subscriptions', name: 'b2b_admin_create_subscription', methods: ['POST'])]
    public function createSubscription(
        Request $request,
        AdminApiGuard $adminApiGuard,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $body = json_decode((string) $request->getContent(), true);
        if (!is_array($body)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        $ownerType = strtoupper((string) ($body['ownerType'] ?? 'COMPANY'));
        $planType = strtoupper((string) ($body['planType'] ?? 'SILVER'));
        $durationMonths = max(1, (int) ($body['durationMonths'] ?? 12));

        $subscription = new B2BSubscription();
        $subscription->setOwnerType($ownerType);
        $subscription->setPlanType($planType);
        $subscription->setDurationMonths($durationMonths);
        $subscription->setStartDate(new \DateTimeImmutable());
        $subscription->setEndDate((new \DateTimeImmutable())->modify("+{$durationMonths} months"));
        $subscription->setActive(true);
        $subscription->setCreatedAt(new \DateTimeImmutable());

        if ($ownerType === 'COMPANY' && !empty($body['companyId'])) {
            $company = $entityManager->find(B2BCompany::class, (int) $body['companyId']);
            if ($company instanceof B2BCompany) {
                $subscription->setCompany($company);
            }
        } elseif ($ownerType === 'MARKET' && !empty($body['marketId'])) {
            $market = $entityManager->find(B2BMarket::class, (int) $body['marketId']);
            if ($market instanceof B2BMarket) {
                $subscription->setMarket($market);
            }
        }

        $entityManager->persist($subscription);
        $entityManager->flush();

        return $this->json(['id' => $subscription->getId(), 'status' => 'created'], 201);
    }

    #[Route('/subscriptions/{id}', name: 'b2b_admin_update_subscription', methods: ['PATCH'])]
    public function updateSubscription(
        int $id,
        Request $request,
        AdminApiGuard $adminApiGuard,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $subscription = $entityManager->find(B2BSubscription::class, $id);
        if (!$subscription instanceof B2BSubscription) {
            return $this->json(['error' => 'Subscription not found.'], 404);
        }

        $body = json_decode((string) $request->getContent(), true);
        if (isset($body['active'])) {
            $subscription->setActive((bool) $body['active']);
        }
        $subscription->setUpdatedAt(new \DateTimeImmutable());
        $entityManager->flush();

        return $this->json(['id' => $subscription->getId(), 'active' => $subscription->isActive()]);
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

        $qb = $entityManager->createQueryBuilder()
            ->select('c')
            ->from(B2BCompany::class, 'c')
            ->orderBy('c.joinedAt', 'DESC')
            ->setMaxResults($limit)
            ->setFirstResult($offset);

        $items = $qb->getQuery()->getResult();

        $scrapingRepo = $entityManager->getRepository(B2BScrapingRequest::class);
        $reportRepo = $entityManager->getRepository(B2BReport::class);
        $listingRepo = $entityManager->getRepository(\App\Entity\ProductListing::class);

        $total = $entityManager->createQueryBuilder()->select('COUNT(c.id)')->from(B2BCompany::class, 'c')->getQuery()->getSingleScalarResult();

        return $this->json([
            'items' => array_map(function (B2BCompany $c) use ($scrapingRepo, $reportRepo, $listingRepo) {
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
                    'company_name' => $c->getCompanyName(),
                    'status' => $c->getB2bStatus(),
                    'is_verified' => $c->isVerified(),
                    'joined_at' => $c->getJoinedAt()?->format(\DateTimeInterface::ATOM),
                    'listings_count' => $listingsCount,
                    'scraping_requests_count' => (int) $scrapingRepo->createQueryBuilder('sr')->select('COUNT(sr.id)')->where('sr.company = :company')->setParameter('company', $c)->getQuery()->getSingleScalarResult(),
                    'reports_count' => (int) $reportRepo->createQueryBuilder('r')->select('COUNT(r.id)')->where('r.company = :company')->setParameter('company', $c)->getQuery()->getSingleScalarResult(),
                ];
            }, $items),
            'pagination' => ['limit' => $limit, 'offset' => $offset, 'total' => $total],
        ]);
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

        $qb = $entityManager->createQueryBuilder()
            ->select('m')
            ->from(B2BMarket::class, 'm')
            ->orderBy('m.joinedAt', 'DESC')
            ->setMaxResults($limit)
            ->setFirstResult($offset);

        $items = $qb->getQuery()->getResult();
        $scrapingRepo = $entityManager->getRepository(B2BScrapingRequest::class);
        $reportRepo = $entityManager->getRepository(B2BReport::class);

        $total = $entityManager->createQueryBuilder()->select('COUNT(m.id)')->from(B2BMarket::class, 'm')->getQuery()->getSingleScalarResult();

        return $this->json([
            'items' => array_map(function (B2BMarket $m) use ($scrapingRepo, $reportRepo) {
                return [
                    'id' => $m->getId(),
                    'email' => $m->getEmail(),
                    'company_name' => $m->getCompanyName(),
                    'status' => $m->getB2bStatus(),
                    'is_verified' => $m->isVerified(),
                    'joined_at' => $m->getJoinedAt()?->format(\DateTimeInterface::ATOM),
                    'scraping_requests_count' => (int) $scrapingRepo->createQueryBuilder('sr')->select('COUNT(sr.id)')->where('sr.market = :market')->setParameter('market', $m)->getQuery()->getSingleScalarResult(),
                    'reports_count' => (int) $reportRepo->createQueryBuilder('r')->select('COUNT(r.id)')->where('r.market = :market')->setParameter('market', $m)->getQuery()->getSingleScalarResult(),
                ];
            }, $items),
            'pagination' => ['limit' => $limit, 'offset' => $offset, 'total' => $total],
        ]);
    }

    private function normalizeNullableFloat(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }
}
