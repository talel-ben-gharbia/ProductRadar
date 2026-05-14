<?php

namespace App\Controller;

use App\Entity\Admin;
use App\Entity\B2BCompany;
use App\Entity\B2BMarket;
use App\Entity\B2BSponsoredArticle;
use App\Entity\Product;
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
            ->select('pl.id AS listing_id, p.id AS product_id, p.name AS product_name, p.brand AS product_brand, pl.ref')
            ->from(ProductListing::class, 'pl')
            ->join('pl.product', 'p')
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
        if (!is_array($body) || empty($body['product_id'])) {
            return $this->json(['error' => 'product_id is required.'], 422);
        }

        $productId = (int) $body['product_id'];
        $product = $entityManager->find(Product::class, $productId);
        if (!$product instanceof Product) {
            return $this->json(['error' => 'Product not found.'], 404);
        }

        // Check product belongs to vendor
        $sellerId = $user->getSeller()?->getId();
        if ($sellerId === null) {
            return $this->json(['error' => 'No seller account linked.'], 403);
        }

        $ownListing = $entityManager->getRepository(ProductListing::class)->findOneBy([
            'product' => $product,
            'seller' => $sellerId,
        ]);
        if (!$ownListing instanceof ProductListing) {
            return $this->json(['error' => 'You can only sponsor your own products.'], 403);
        }

        // Check not already submitted (pending or published)
        $existing = $entityManager->getRepository(B2BSponsoredArticle::class)->createQueryBuilder('a')
            ->where('a.company = :company')
            ->andWhere('a.product = :product')
            ->andWhere('a.status IN (:statuses)')
            ->setParameter('company', $user)
            ->setParameter('product', $product)
            ->setParameter('statuses', ['PENDING', 'PUBLISHED'])
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
        if ($existing instanceof B2BSponsoredArticle) {
            return $this->json(['error' => 'This product already has an active or pending sponsorship request.'], 409);
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
        $article->setProduct($product);
        $article->setTitle($product->getName());
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
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $now = new \DateTimeImmutable();

        $items = $entityManager->createQueryBuilder()
            ->select('a, p, c, s')
            ->from(B2BSponsoredArticle::class, 'a')
            ->join('a.product', 'p')
            ->leftJoin('a.company', 'c')
            ->leftJoin('c.seller', 's')
            ->where('a.status = :status')
            ->andWhere('a.ends_at IS NULL OR a.ends_at > :now')
            ->andWhere('c.id IS NOT NULL')
            ->setParameter('status', 'PUBLISHED')
            ->setParameter('now', $now)
            ->orderBy('a.published_at', 'DESC')
            ->getQuery()
            ->getResult();

        $results = [];
        foreach ($items as $article) {
            if (!$article instanceof B2BSponsoredArticle) continue;

            $product = $article->getProduct();
            $company = $article->getCompany();
            if (!$product || !$company) continue;

            $results[] = [
                'id' => $article->getId(),
                'product_id' => $product->getId(),
                'product_name' => $product->getName(),
                'product_image' => $product->getImageUrl(),
                'product_brand' => $product->getBrand(),
                'vendor_name' => $company->getCompanyName(),
                'published_at' => $article->getPublishedAt()?->format(\DateTimeInterface::ATOM),
                'ends_at' => $article->getEndsAt()?->format(\DateTimeInterface::ATOM),
            ];
        }

        return $this->json(['items' => $results]);
    }

    // ─────────────────────────────────────────────
    //  Helpers
    // ─────────────────────────────────────────────

    private function resolveUser(Request $request, UserRepository $userRepository): B2BCompany|B2BMarket|null
    {
        $firebaseUid = trim((string) $request->headers->get('X-Firebase-Uid', ''));
        if ($firebaseUid === '') return null;

        $user = $userRepository->findOneBy(['firebase_uid' => $firebaseUid]);
        return ($user instanceof B2BCompany || $user instanceof B2BMarket) ? $user : null;
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

    private function serialize(B2BSponsoredArticle $a): array
    {
        return [
            'id' => $a->getId(),
            'product_id' => $a->getProduct()?->getId(),
            'product_name' => $a->getProduct()?->getName() ?? $a->getTitle(),
            'product_brand' => $a->getProduct()?->getBrand(),
            'product_image' => $a->getProduct()?->getImageUrl(),
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
            'company_name' => $company?->getCompanyName(),
            'seller_id' => $company?->getSeller()?->getId(),
            'ads_request_id' => $a->getAdsRequest()?->getId(),
        ];
    }
}
