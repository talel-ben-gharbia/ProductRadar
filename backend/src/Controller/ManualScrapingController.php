<?php

namespace App\Controller;

use App\Entity\CategoryLink;
use App\Repository\CategoryRepository;
use App\Repository\SellerRepository;
use App\Security\AdminApiGuard;
use App\Service\ManualScrapeTriggerService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/admin/api/scraping/manual')]
final class ManualScrapingController extends AbstractController
{
    #[Route('/default-link', name: 'admin_manual_scrape_default_link', methods: ['GET'])]
    public function defaultLink(
        Request $request,
        AdminApiGuard $adminApiGuard,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        $sellerId = $request->query->getInt('seller_id', 0);
        $categoryId = $request->query->getInt('category_id', 0);

        if ($sellerId <= 0 || $categoryId <= 0) {
            return $this->json(['error' => 'seller_id and category_id are required.'], 422);
        }

        $link = $this->findCategoryLink($entityManager, $sellerId, $categoryId);

        return $this->json([
            'exists' => $link !== null,
            'link' => $link,
        ]);
    }

    #[Route('/trigger', name: 'admin_manual_scrape_trigger', methods: ['POST'])]
    public function trigger(
        Request $request,
        SellerRepository $sellerRepository,
        CategoryRepository $categoryRepository,
        EntityManagerInterface $entityManager,
        AdminApiGuard $adminApiGuard,
        ManualScrapeTriggerService $manualScrapeTriggerService,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        $payload = json_decode((string) $request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        $sellerId = (int) ($payload['seller_id'] ?? 0);
        $categoryId = (int) ($payload['category_id'] ?? 0);
        $manualLink = trim((string) ($payload['link'] ?? ''));
        $useCategoryLink = (bool) ($payload['use_category_link'] ?? true);

        if ($sellerId <= 0 || $categoryId <= 0) {
            return $this->json(['error' => 'seller_id and category_id are required.'], 422);
        }

        $seller = $sellerRepository->find($sellerId);
        if ($seller === null) {
            return $this->json(['error' => 'Seller not found.'], 404);
        }

        $category = $categoryRepository->find($categoryId);
        if ($category === null) {
            return $this->json(['error' => 'Category not found.'], 404);
        }

        $resolvedLink = $manualLink;
        $categoryLink = null;
        if ($useCategoryLink || $resolvedLink === '') {
            $categoryLink = $this->findCategoryLink($entityManager, $sellerId, $categoryId);
            if ($resolvedLink === '' && $categoryLink !== null) {
                $resolvedLink = $categoryLink;
            }
        }

        if ($resolvedLink === '' || filter_var($resolvedLink, FILTER_VALIDATE_URL) === false) {
            return $this->json([
                'error' => 'A valid scraping URL is required. Provide link or configure category_link.',
            ], 422);
        }

        $webhookPayload = [
            'trigger' => 'manual_admin_scrape',
            'seller' => [
                'id' => $seller->getId(),
                'name' => $seller->getName(),
            ],
            'category' => [
                'id' => $category->getId(),
                'name' => $category->getName(),
            ],
            'source_name' => strtoupper(str_replace(' ', '_', (string) $seller->getName())),
            'workflow_name' => 'manual-admin-scrape',
            'url' => $resolvedLink,
            'resolved_from_category_link' => $categoryLink !== null && $resolvedLink === $categoryLink,
            'requested_by' => [
                'admin_id' => $adminApiGuard->getAdminId($request),
                'admin_role' => $adminApiGuard->getRole($request),
                'ip' => $request->getClientIp(),
            ],
            'requested_at' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
        ];

        $result = $manualScrapeTriggerService->trigger($webhookPayload);
        if ($result['ok'] === false) {
            return $this->json([
                'error' => 'Failed to trigger n8n webhook.',
                'details' => $result['body'],
                'status_code' => $result['statusCode'],
            ], 502);
        }

        return $this->json([
            'message' => 'Manual scraping job triggered successfully.',
            'status_code' => $result['statusCode'],
            'resolved_link' => $resolvedLink,
            'resolved_from_category_link' => $categoryLink !== null && $resolvedLink === $categoryLink,
            'n8n_response' => $result['body'],
        ], 202);
    }

    private function findCategoryLink(
        EntityManagerInterface $entityManager,
        int $sellerId,
        int $categoryId,
    ): ?string {
        $row = $entityManager->getRepository(CategoryLink::class)
            ->createQueryBuilder('cl')
            ->select('cl.url AS url')
            ->andWhere('IDENTITY(cl.seller) = :sellerId')
            ->andWhere('IDENTITY(cl.category) = :categoryId')
            ->setParameter('sellerId', $sellerId)
            ->setParameter('categoryId', $categoryId)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();

        if (!is_array($row)) {
            return null;
        }

        $url = trim((string) ($row['url'] ?? ''));
        return $url === '' ? null : $url;
    }
}
