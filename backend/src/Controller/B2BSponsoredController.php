<?php

namespace App\Controller;

use App\Entity\Admin;
use App\Entity\B2BAdsCampaign;
use App\Entity\B2BAdsRequest;
use App\Entity\B2B;
use App\Entity\B2BCompany;
use App\Entity\B2BMarket;
use App\Entity\B2BSponsoredArticle;
use App\Entity\ProductListing;
use App\Repository\UserRepository;
use App\Security\AdminApiGuard;
use App\Service\B2BNotificationService;
use App\Service\B2BPlanGatingService;
use App\Service\SubscriptionContextResolver;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/b2b')]
final class B2BSponsoredController extends AbstractController
{
    public function __construct(
        private readonly B2BPlanGatingService $gatingService,
        private readonly SubscriptionContextResolver $subscriptionResolver,
    ) {
    }

    // ─────────────────────────────────────────────
    //  Vendor endpoints
    // ─────────────────────────────────────────────

    #[Route('/sponsored/products', name: 'b2b_sponsored_list_vendor_products', methods: ['GET'])]
    public function listVendorProducts(
        Request $request,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->resolveUser($request, $userRepository);
        if (!$user instanceof B2BCompany) {
            return $this->json(['error' => 'Only B2B companies can sponsor products.'], 403);
        }

        $sellerId = $user->getSeller()?->getId();
        if ($sellerId === null) {
            return $this->json(['items' => []]);
        }

        $qb = $entityManager->createQueryBuilder()
            ->select('pl.id AS listing_id, p.id AS product_id, p.name AS product_name, COALESCE(b.name, p.brand) AS product_brand, pl.ref')
            ->from(ProductListing::class, 'pl')
            ->join('pl.product', 'p')
            ->leftJoin('p.brandEntity', 'b')
            ->where('pl.seller = :sellerId')
            ->andWhere('pl.is_active = true')
            ->setParameter('sellerId', $sellerId);

        $search = trim((string) $request->query->get('search', ''));
        $categoryId = $request->query->getInt('category_id', 0);

        if ($search !== '') {
            $qb->andWhere('LOWER(p.name) LIKE LOWER(:search) OR LOWER(pl.ref) LIKE LOWER(:search)')
                ->setParameter('search', '%' . $search . '%');
        }

        if ($categoryId > 0) {
            $qb->join('p.category', 'c')
                ->andWhere('c.id = :categoryId')
                ->setParameter('categoryId', $categoryId);
        }

        $qb->orderBy('p.name', 'ASC')->setMaxResults(50);

        $rows = $qb->getQuery()->getResult();

        return $this->json([
            'items' => array_map(static fn (array $r) => [
                'listing_id' => (int) $r['listing_id'],
                'product_id' => (int) $r['product_id'],
                'product_name' => $r['product_name'],
                'product_brand' => $r['product_brand'],
                'ref' => $r['ref'],
            ], $rows),
        ]);
    }

    #[Route('/workspace/{firebaseUid}/sponsored', name: 'b2b_workspace_sponsored_list', methods: ['GET'])]
    public function vendorList(
        string $firebaseUid,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->resolveWorkspaceUser($firebaseUid, $userRepository);
        if ($user instanceof JsonResponse) return $user;

        if (!$user instanceof B2BCompany) {
            return $this->json(['error' => 'Only B2B companies can sponsor products.'], 403);
        }

        $items = $entityManager->getRepository(B2BSponsoredArticle::class)->findBy(
            ['company' => $user],
            ['created_at' => 'DESC'],
            50
        );

        $quotaUsage = $this->subscriptionResolver->checkQuota($user, 'sponsored_products', 0);
        $activeCount = $entityManager->getRepository(B2BSponsoredArticle::class)->count([
            'company' => $user,
            'status' => 'PUBLISHED',
        ]);

        return $this->json([
            'items' => array_map(fn (B2BSponsoredArticle $a) => $this->serialize($a), $items),
            'quota' => $quotaUsage['usage'],
            'active_count' => $activeCount,
        ]);
    }

    #[Route('/workspace/{firebaseUid}/sponsored', name: 'b2b_workspace_sponsored_submit', methods: ['POST'])]
    public function vendorSubmit(
        string $firebaseUid,
        Request $request,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->resolveWorkspaceUser($firebaseUid, $userRepository);
        if ($user instanceof JsonResponse) return $user;

        if (!$user instanceof B2BCompany) {
            return $this->json(['error' => 'Only B2B companies can sponsor products.'], 403);
        }

        $body = json_decode((string) $request->getContent(), true);
        if (!is_array($body) || empty($body['listing_id'])) {
            return $this->json(['error' => 'listing_id is required.'], 422);
        }

        $listingId = (int) $body['listing_id'];
        $listing = $entityManager->find(ProductListing::class, $listingId);
        if (!$listing instanceof ProductListing) {
            return $this->json(['error' => 'Listing not found.'], 404);
        }

        // Check listing belongs to vendor
        $sellerId = $user->getSeller()?->getId();
        if ($sellerId === null) {
            return $this->json(['error' => 'No seller account linked.'], 403);
        }

        if ($listing->getSeller()?->getId() !== $sellerId) {
            return $this->json(['error' => 'You can only sponsor your own listings.'], 403);
        }

        // Check not already submitted (pending or published)
        $existing = $entityManager->getRepository(B2BSponsoredArticle::class)->createQueryBuilder('a')
            ->where('a.company = :company')
            ->andWhere('a.productListing = :listing')
            ->andWhere('a.status IN (:statuses)')
            ->setParameter('company', $user)
            ->setParameter('listing', $listing)
            ->setParameter('statuses', ['PENDING', 'PUBLISHED'])
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
        if ($existing instanceof B2BSponsoredArticle) {
            return $this->json(['error' => 'This listing already has an active or pending sponsorship request.'], 409);
        }

        // Check max active count by plan
        $isGold = $this->gatingService->isGoldPlan($user);
        $maxActive = $isGold ? 3 : 1;
        $activeCount = $entityManager->getRepository(B2BSponsoredArticle::class)->count([
            'company' => $user,
            'status' => 'PUBLISHED',
        ]);
        if ($activeCount >= $maxActive) {
            return $this->json([
                'error' => sprintf('You already have %d active sponsorship%s. Maximum is %d.', $activeCount, $activeCount > 1 ? 's' : '', $maxActive),
            ], 429);
        }

        // Check monthly quota
        $quotaCheck = $this->subscriptionResolver->checkQuota($user, 'sponsored_products', 1);
        if (!$quotaCheck['allowed']) {
            return $this->json([
                'error' => $quotaCheck['reason'] ?? 'Monthly sponsorship quota exceeded.',
                'usage' => $quotaCheck['usage'],
            ], 429);
        }

        $article = new B2BSponsoredArticle();
        $article->setCompany($user);
        $article->setProductListing($listing);
        $article->setTitle($listing->getProduct()?->getName() ?? 'Sponsored Listing');
        $article->setStatus('PENDING');
        $article->setCreatedAt(new \DateTimeImmutable());

        $entityManager->persist($article);
        $entityManager->flush();

        $this->subscriptionResolver->recordUsage($user, 'sponsored_products');

        return $this->json($this->serialize($article), 201);
    }

    #[Route('/workspace/{firebaseUid}/sponsored/{id}', name: 'b2b_workspace_sponsored_cancel', methods: ['DELETE'])]
    public function vendorCancel(
        string $firebaseUid,
        int $id,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->resolveWorkspaceUser($firebaseUid, $userRepository);
        if ($user instanceof JsonResponse) return $user;

        $article = $entityManager->find(B2BSponsoredArticle::class, $id);
        if (!$article instanceof B2BSponsoredArticle || $article->getCompany()?->getId() !== $user->getId()) {
            return $this->json(['error' => 'Sponsorship not found.'], 404);
        }

        if ($article->getStatus() !== 'PENDING') {
            return $this->json(['error' => 'Only pending requests can be cancelled.'], 409);
        }

        $entityManager->remove($article);
        $entityManager->flush();

        return $this->json(['status' => 'cancelled']);
    }

    // ─────────────────────────────────────────────
    //  Admin endpoints
    // ─────────────────────────────────────────────

    #[Route('/admin/sponsored', name: 'b2b_admin_sponsored_list', methods: ['GET'])]
    public function adminList(
        Request $request,
        AdminApiGuard $adminApiGuard,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $statusFilter = strtoupper(trim((string) $request->query->get('status', '')));
        $repo = $entityManager->getRepository(B2BSponsoredArticle::class);

        $criteria = [];
        if ($statusFilter !== '' && in_array($statusFilter, ['PENDING', 'PUBLISHED', 'REJECTED', 'EXPIRED'], true)) {
            $criteria['status'] = $statusFilter;
        }

        $items = $repo->findBy($criteria, ['created_at' => 'DESC'], 100);

        return $this->json([
            'items' => array_map(fn (B2BSponsoredArticle $a) => $this->serializeAdmin($a), $items),
        ]);
    }

    #[Route('/admin/sponsored/{id}/approve', name: 'b2b_admin_sponsored_approve', methods: ['POST'])]
    public function adminApprove(
        int $id,
        Request $request,
        AdminApiGuard $adminApiGuard,
        EntityManagerInterface $entityManager,
        B2BNotificationService $b2bNotificationService,
    ): JsonResponse {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $article = $entityManager->find(B2BSponsoredArticle::class, $id);
        if (!$article instanceof B2BSponsoredArticle) {
            return $this->json(['error' => 'Sponsorship not found.'], 404);
        }

        if ($article->getStatus() !== 'PENDING') {
            return $this->json(['error' => 'Only pending requests can be approved.'], 409);
        }

        $company = $article->getCompany();
        if (!$company instanceof B2BCompany) {
            return $this->json(['error' => 'Sponsorship has no associated company.'], 422);
        }

        // Check listing is in stock
        $listing = $article->getProductListing();
        if ($listing instanceof ProductListing && !$listing->getIsInStock()) {
            return $this->json(['error' => 'Cannot approve — the listing is currently out of stock.'], 409);
        }

        // Check max active
        $isGold = $this->gatingService->isGoldPlan($company);
        $maxActive = $isGold ? 3 : 1;
        $activeCount = $entityManager->getRepository(B2BSponsoredArticle::class)->count([
            'company' => $company,
            'status' => 'PUBLISHED',
        ]);
        if ($activeCount >= $maxActive) {
            return $this->json([
                'error' => sprintf('Company already has %d active sponsorship%s. Maximum is %d.', $activeCount, $activeCount > 1 ? 's' : '', $maxActive),
            ], 429);
        }

        // Calculate duration
        $durationDays = $isGold ? 30 : 7;
        $now = new \DateTimeImmutable();

        $article->setStatus('PUBLISHED');
        $article->setPublishedAt($now);
        $article->setEndsAt($now->modify("+{$durationDays} days"));

        $entityManager->flush();

        $adminId = $adminApiGuard->getAdminId($request);
        $admin = $adminId !== null ? $entityManager->find(Admin::class, $adminId) : null;
        if ($admin instanceof Admin) {
            $b2bNotificationService->notifySponsorshipApproved($article, $admin);
        }

        return $this->json($this->serializeAdmin($article));
    }

    #[Route('/admin/sponsored/{id}/reject', name: 'b2b_admin_sponsored_reject', methods: ['POST'])]
    public function adminReject(
        int $id,
        Request $request,
        AdminApiGuard $adminApiGuard,
        EntityManagerInterface $entityManager,
        B2BNotificationService $b2bNotificationService,
    ): JsonResponse {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $article = $entityManager->find(B2BSponsoredArticle::class, $id);
        if (!$article instanceof B2BSponsoredArticle) {
            return $this->json(['error' => 'Sponsorship not found.'], 404);
        }

        if ($article->getStatus() !== 'PENDING') {
            return $this->json(['error' => 'Only pending requests can be rejected.'], 409);
        }

        $article->setStatus('REJECTED');
        $entityManager->flush();

        $b2bNotificationService->notifySponsorshipRejected($article);

        return $this->json($this->serializeAdmin($article));
    }

    #[Route('/admin/sponsored/{id}', name: 'b2b_admin_sponsored_delete', methods: ['DELETE'])]
    public function adminDelete(
        int $id,
        Request $request,
        AdminApiGuard $adminApiGuard,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $article = $entityManager->find(B2BSponsoredArticle::class, $id);
        if (!$article instanceof B2BSponsoredArticle) {
            return $this->json(['error' => 'Sponsorship not found.'], 404);
        }

        $entityManager->remove($article);
        $entityManager->flush();

        return $this->json(['status' => 'deleted']);
    }

    // ─────────────────────────────────────────────
    //  Public (B2C) endpoint
    // ─────────────────────────────────────────────

    #[Route('/b2c/sponsored-products', name: 'b2c_sponsored_products', methods: ['GET'])]
    public function publicSponsoredProducts(
        Request $request,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $now = new \DateTimeImmutable();

        $qb = $entityManager->createQueryBuilder()
            ->select('a, pl, p, c, s')
            ->from(B2BSponsoredArticle::class, 'a')
            ->join('a.productListing', 'pl')
            ->join('pl.product', 'p')
            ->leftJoin('a.company', 'c')
            ->leftJoin('pl.seller', 's')
            ->where('a.status = :status')
            ->andWhere('a.ends_at IS NULL OR a.ends_at > :now')
            ->andWhere('c.id IS NOT NULL')
            ->andWhere('pl.availability = true')
            ->setParameter('status', 'PUBLISHED')
            ->setParameter('now', $now);

        $productId = $request->query->getInt('product_id', 0);
        if ($productId > 0) {
            $qb->andWhere('p.id = :productId')
               ->setParameter('productId', $productId);
        }

        $items = $qb->orderBy('a.published_at', 'DESC')
            ->getQuery()
            ->getResult();

        $results = [];
        foreach ($items as $article) {
            if (!$article instanceof B2BSponsoredArticle) continue;

            $listing = $article->getProductListing();
            $product = $listing?->getProduct();
            $company = $article->getCompany();
            $seller = $listing?->getSeller();
            if (!$product || !$company || !$listing) continue;

            $results[] = [
                'id' => $article->getId(),
                'listing_id' => $listing->getId(),
                'product_id' => $product->getId(),
                'product_name' => $product->getName(),
                'product_image' => $product->getImageUrl(),
                'product_brand' => $product->getBrand() ?? $product->getBrandEntity()?->getName(),
                'price' => $listing->getPrice(),
                'seller_name' => $seller?->getName(),
                'seller_id' => $seller?->getId(),
                'in_stock' => $listing->getIsInStock(),
                'published_at' => $article->getPublishedAt()?->format(\DateTimeInterface::ATOM),
                'ends_at' => $article->getEndsAt()?->format(\DateTimeInterface::ATOM),
            ];
        }

        return $this->json(['items' => $results]);
    }

    #[Route('/b2c/banners', name: 'b2c_banners', methods: ['GET'])]
    public function publicBanners(
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $now = new \DateTimeImmutable();

        $campaigns = $entityManager->createQueryBuilder()
            ->select('c, ar, comp')
            ->from(B2BAdsCampaign::class, 'c')
            ->join('c.adsRequest', 'ar')
            ->leftJoin('ar.company', 'comp')
            ->where('c.active = :active')
            ->andWhere('c.status = :status')
            ->andWhere('c.ends_at IS NOT NULL AND c.ends_at > :now')
            ->setParameter('active', true)
            ->setParameter('status', 'ACTIVE')
            ->setParameter('now', $now)
            ->orderBy('c.created_at', 'DESC')
            ->getQuery()
            ->getResult();

        $items = [];
        foreach ($campaigns as $campaign) {
            if (!$campaign instanceof B2BAdsCampaign) continue;

            $adsRequest = $campaign->getAdsRequest();
            if (!$adsRequest) continue;

            $items[] = [
                'id' => $campaign->getId(),
                'image_url' => $adsRequest->getImageUrl(),
                'link_url' => $adsRequest->getLinkUrl(),
                'width' => $campaign->getWidth(),
                'height' => $campaign->getHeight(),
                'starts_at' => $campaign->getStartsAt()?->format(\DateTimeInterface::ATOM),
                'ends_at' => $campaign->getEndsAt()?->format(\DateTimeInterface::ATOM),
                'name' => $adsRequest->getCompany()?->getName(),
            ];
        }

        return $this->json(['items' => $items]);
    }

    // ─────────────────────────────────────────────
    //  Helpers
    // ─────────────────────────────────────────────

    private function resolveUser(Request $request, UserRepository $userRepository): B2B|null
    {
        $firebaseUid = trim((string) $request->headers->get('X-Firebase-Uid', ''));
        if ($firebaseUid === '') return null;

        $user = $userRepository->findOneBy(['firebase_uid' => $firebaseUid]);
        return ($user instanceof B2BCompany || $user instanceof B2BMarket) ? $user : null;
    }

    private function resolveWorkspaceUser(string $firebaseUid, UserRepository $userRepository): B2B|JsonResponse
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

    private function serialize(B2BSponsoredArticle $a): array
    {
        $listing = $a->getProductListing();
        $product = $listing?->getProduct();
        return [
            'id' => $a->getId(),
            'listing_id' => $listing?->getId(),
            'product_id' => $product?->getId(),
            'product_name' => $product?->getName() ?? $a->getTitle(),
            'product_brand' => $product?->getBrand() ?? $product?->getBrandEntity()?->getName(),
            'product_image' => $product?->getImageUrl(),
            'price' => $listing?->getPrice(),
            'seller_id' => $listing?->getSeller()?->getId(),
            'seller_name' => $listing?->getSeller()?->getName(),
            'status' => $a->getStatus(),
            'published_at' => $a->getPublishedAt()?->format(\DateTimeInterface::ATOM),
            'ends_at' => $a->getEndsAt()?->format(\DateTimeInterface::ATOM),
            'created_at' => $a->getCreatedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }

    private function serializeAdmin(B2BSponsoredArticle $a): array
    {
        $company = $a->getCompany();
        return $this->serialize($a) + [
            'company_id' => $company?->getId(),
            'name' => $company?->getName(),
            'seller_id' => $company?->getSeller()?->getId(),
            'ads_request_id' => $a->getAdsRequest()?->getId(),
        ];
    }
}
