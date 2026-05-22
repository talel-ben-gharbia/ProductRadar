<?php

namespace App\Controller;

use App\Entity\Review;
use App\Repository\AdminRepository;
use App\Repository\ReviewRepository;
use App\Security\AdminApiGuard;
use App\Service\AnalyticsService;
use App\Service\AuditService;
use App\Service\AutoModerationService;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Cache\CacheItemPoolInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/admin/api/reviews')]
final class ReviewController extends AbstractController
{
    use CachedResponseTrait;

    private const CACHE_KEY_LIST = 'reviews.list';
    private const CACHE_KEY_DETAIL = 'reviews.detail.';
    private const CACHE_KEY_ANALYTICS = 'reviews.analytics';
    private const CACHE_KEY_AUTO_MODERATE = 'reviews.auto_moderate.';

    public function __construct(
        #[Autowire(service: 'general.cache')]
        private readonly CacheItemPoolInterface $cache,
    ) {
    }

    #[Route('', name: 'admin_reviews_list', methods: ['GET'])]
    public function list(
        Request $request,
        ReviewRepository $reviewRepository,
        AdminApiGuard $adminApiGuard,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        $limit = max(1, min(100, $request->query->getInt('limit', 25)));
        $offset = max(0, $request->query->getInt('offset', 0));
        $status = strtoupper(trim((string) $request->query->get('status', '')));
        $search = trim((string) $request->query->get('search', ''));
        $cacheKey = self::CACHE_KEY_LIST . ".l{$limit}.o{$offset}." . md5($status) . '.' . md5($search);

        return $this->cachedGet($this->cache, $cacheKey, function () use ($reviewRepository, $limit, $offset, $status, $search): array {
            $result = $reviewRepository->paginateForAdmin($limit, $offset, $status, $search);

            return [
                'items' => array_map(fn (Review $review) => $this->serializeReview($review), $result['items']),
                'pagination' => [
                    'limit' => $limit,
                    'offset' => $offset,
                    'total' => $result['total'],
                ],
            ];
        });
    }

    #[Route('/{id}', name: 'admin_reviews_detail', methods: ['GET'])]
    public function detail(
        int $id,
        Request $request,
        ReviewRepository $reviewRepository,
        AdminApiGuard $adminApiGuard,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        return $this->cachedGet($this->cache, self::CACHE_KEY_DETAIL . $id, function () use ($id, $reviewRepository): array {
            $review = $reviewRepository->find($id);
            if (!$review instanceof Review) {
                throw new \RuntimeException('Review not found.');
            }

            return $this->serializeReview($review);
        });
    }

    #[Route('/{id}/status', name: 'admin_reviews_status_update', methods: ['PATCH'])]
    public function updateStatus(
        int $id,
        Request $request,
        ReviewRepository $reviewRepository,
        EntityManagerInterface $entityManager,
        AdminApiGuard $adminApiGuard,
        AuditService $auditService,
        AdminRepository $adminRepository,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        $payload = json_decode((string) $request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        $status = strtoupper(trim((string) ($payload['status'] ?? '')));
        if (!in_array($status, ['PENDING', 'APPROVED', 'REJECTED'], true)) {
            return $this->json(['error' => 'Invalid review status.'], 422);
        }

        $moderationNote = trim((string) ($payload['moderation_note'] ?? ''));
        if ($moderationNote === '') {
            $moderationNote = null;
        }

        $review = $reviewRepository->find($id);
        if (!$review instanceof Review) {
            return $this->json(['error' => 'Review not found.'], 404);
        }

        $beforeStatus = $review->getStatus();
        $beforeModerationNote = $review->getModerationNote();

        $review->setStatus($status);
        $review->setModerationNote($moderationNote);
        $review->setUpdatedAt(new \DateTimeImmutable());

        $admin = null;
        $adminId = $adminApiGuard->getAdminId($request);
        if ($adminId !== null) {
            $admin = $adminRepository->find($adminId);
        }

        $auditService->logModeration(
            $admin,
            'REVIEW_STATUS_UPDATE',
            'REVIEW',
            (int) $review->getId(),
            [
                'status' => $beforeStatus,
                'moderation_note' => $beforeModerationNote,
            ],
            [
                'status' => $status,
                'moderation_note' => $moderationNote,
            ],
            $request->getClientIp(),
        );

        $entityManager->flush();

        $this->invalidateCache($this->cache);

        return $this->json($this->serializeReview($review));
    }

    #[Route('/analytics', name: 'admin_reviews_analytics', methods: ['GET'])]
    public function analytics(
        Request $request,
        AnalyticsService $analyticsService,
        AdminApiGuard $adminApiGuard,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        return $this->cachedGet($this->cache, self::CACHE_KEY_ANALYTICS, function () use ($analyticsService): array {
            return [
                'analytics' => $analyticsService->getReviewAnalytics(),
                'rating_distribution' => $analyticsService->getRatingDistribution(),
                'reviews_per_day' => $analyticsService->getReviewsPerDay(30),
            ];
        });
    }

    #[Route('/export', name: 'admin_reviews_export', methods: ['GET'])]
    public function export(
        Request $request,
        ReviewRepository $reviewRepository,
        AdminApiGuard $adminApiGuard,
    ): StreamedResponse|JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        $status = strtoupper(trim((string) $request->query->get('status', '')));
        $search = trim((string) $request->query->get('search', ''));
        $reviews = $reviewRepository->exportForAdmin($status, $search);

        $response = new StreamedResponse(function () use ($reviews): void {
            $output = fopen('php://output', 'wb');
            fputcsv($output, ['id', 'status', 'rating', 'comment', 'moderation_note', 'customer_email', 'product_name', 'created_at', 'updated_at']);

            foreach ($reviews as $review) {
                $product = $review->getProduct();

                fputcsv($output, [
                    $review->getId(),
                    $review->getStatus(),
                    $review->getRating(),
                    $review->getComment(),
                    $review->getModerationNote(),
                    $review->getClient()?->getEmail(),
                    $product?->getName(),
                    $review->getCreatedAt()?->format(\DateTimeInterface::ATOM),
                    $review->getUpdatedAt()?->format(\DateTimeInterface::ATOM),
                ]);
            }

            fclose($output);
        });

        $response->headers->set('Content-Type', 'text/csv; charset=UTF-8');
        $response->headers->set('Content-Disposition', ResponseHeaderBag::DISPOSITION_ATTACHMENT . '; filename="reviews-export.csv"');

        return $response;
    }

    #[Route('/batch-status', name: 'admin_reviews_batch_status', methods: ['PATCH'])]
    public function batchUpdateStatus(
        Request $request,
        ReviewRepository $reviewRepository,
        EntityManagerInterface $entityManager,
        AdminApiGuard $adminApiGuard,
        AuditService $auditService,
        AdminRepository $adminRepository,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        $payload = json_decode((string) $request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        $reviewIds = (array) ($payload['review_ids'] ?? []);
        $status = strtoupper(trim((string) ($payload['status'] ?? '')));
        $moderationNote = trim((string) ($payload['moderation_note'] ?? ''));

        if (empty($reviewIds)) {
            return $this->json(['error' => 'At least one review ID is required.'], 422);
        }

        if (!in_array($status, ['PENDING', 'APPROVED', 'REJECTED'], true)) {
            return $this->json(['error' => 'Invalid review status.'], 422);
        }

        $updated = 0;
        $failed = 0;

        $admin = null;
        $adminId = $adminApiGuard->getAdminId($request);
        if ($adminId !== null) {
            $admin = $adminRepository->find($adminId);
        }

        foreach ($reviewIds as $reviewId) {
            $review = $reviewRepository->find((int) $reviewId);
            if (!$review instanceof Review) {
                $failed++;
                continue;
            }

            $beforeStatus = $review->getStatus();
            $beforeModerationNote = $review->getModerationNote();

            $review->setStatus($status);
            if ($moderationNote !== '') {
                $review->setModerationNote($moderationNote);
            }
            $review->setUpdatedAt(new \DateTimeImmutable());

            // Log to audit trail
            $auditService->logModeration(
                $admin,
                'BATCH_REVIEW_MODERATION',
                'Review',
                $review->getId(),
                [
                    'status' => $beforeStatus,
                    'moderation_note' => $beforeModerationNote,
                ],
                [
                    'status' => $status,
                    'moderation_note' => $review->getModerationNote(),
                ],
                $request->getClientIp(),
            );

            $updated++;
        }

        $entityManager->flush();

        $this->invalidateCache($this->cache);

        return $this->json([
            'message' => 'Batch operation completed.',
            'updated' => $updated,
            'failed' => $failed,
        ]);
    }

    #[Route('/{id}/auto-moderate', name: 'admin_reviews_auto_moderate', methods: ['GET'])]
    public function getAutoModerationSuggestion(
        int $id,
        Request $request,
        ReviewRepository $reviewRepository,
        AdminApiGuard $adminApiGuard,
        AutoModerationService $autoModerationService,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        return $this->cachedGet($this->cache, self::CACHE_KEY_AUTO_MODERATE . $id, function () use ($id, $reviewRepository, $autoModerationService): array {
            $review = $reviewRepository->find($id);
            if (!$review instanceof Review) {
                throw new \RuntimeException('Review not found.');
            }

            $suggestion = $autoModerationService->getAutoModerationSuggestion($review);

            return [
                'review_id' => $id,
                'suggestion' => $suggestion,
            ];
        });
    }

    private function serializeReview(Review $review): array
    {
        $product = $review->getProduct();

        return [
            'id' => $review->getId(),
            'status' => $review->getStatus(),
            'rating' => $review->getRating(),
            'comment' => $review->getComment(),
            'moderation_note' => $review->getModerationNote(),
            'created_at' => $review->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            'updated_at' => $review->getUpdatedAt()?->format(\DateTimeInterface::ATOM),
            'client' => [
                'id' => $review->getClient()?->getId(),
                'email' => $review->getClient()?->getEmail(),
            ],
            'product_listing' => [
                'id' => null,
                'price' => null,
            ],
            'product' => [
                'id' => $product?->getId(),
                'name' => $product?->getName(),
            ],
        ];
    }
}
