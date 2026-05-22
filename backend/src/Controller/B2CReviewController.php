<?php

namespace App\Controller;

use App\Entity\Review;
use App\Repository\ProductRepository;
use App\Repository\ReviewRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/b2c/reviews')]
final class B2CReviewController extends AbstractController
{
    #[Route('', name: 'b2c_reviews_list', methods: ['GET'])]
    public function list(Request $request, ReviewRepository $reviewRepository): JsonResponse
    {
        $productId = $request->query->getInt('productId', 0);
        if ($productId <= 0) {
            return $this->json(['error' => 'productId is required.'], 400);
        }

        $limit = max(1, min(50, $request->query->getInt('limit', 20)));
        $offset = max(0, $request->query->getInt('offset', 0));

        $result = $reviewRepository->paginateApprovedForProduct($productId, $limit, $offset);
        $summary = $reviewRepository->getApprovedSummaryForProduct($productId);
        $distribution = $reviewRepository->getApprovedRatingDistributionForProduct($productId);

        return $this->json([
            'summary' => [
                'average_rating' => $summary['average_rating'],
                'total_reviews' => $summary['total_reviews'],
                'rating_distribution' => [
                    ['rating' => 5, 'count' => $distribution[5] ?? 0],
                    ['rating' => 4, 'count' => $distribution[4] ?? 0],
                    ['rating' => 3, 'count' => $distribution[3] ?? 0],
                    ['rating' => 2, 'count' => $distribution[2] ?? 0],
                    ['rating' => 1, 'count' => $distribution[1] ?? 0],
                ],
            ],
            'items' => array_map(fn (Review $review): array => $this->serializePublicReview($review), $result['items']),
            'pagination' => [
                'limit' => $limit,
                'offset' => $offset,
                'total' => $result['total'],
            ],
        ]);
    }

    #[Route('', name: 'b2c_reviews_create', methods: ['POST'])]
    public function create(
        Request $request,
        UserRepository $userRepository,
        ProductRepository $productRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $payload = json_decode((string) $request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        $clientId = (int) ($payload['clientId'] ?? 0);
        $productId = (int) ($payload['productId'] ?? 0);
        $rating = (int) ($payload['rating'] ?? 0);
        $comment = isset($payload['comment']) && is_string($payload['comment']) ? trim($payload['comment']) : null;

        if ($clientId <= 0 || $productId <= 0) {
            return $this->json(['error' => 'clientId and productId are required.'], 400);
        }

        if ($rating < 1 || $rating > 5) {
            return $this->json(['error' => 'rating must be between 1 and 5.'], 422);
        }

        $client = $userRepository->find($clientId);
        if ($client === null || $client->isActive() !== true) {
            return $this->json(['error' => 'Client not found or inactive.'], 404);
        }

        $product = $productRepository->find($productId);
        if ($product === null) {
            return $this->json(['error' => 'Product not found.'], 404);
        }

        $review = new Review();
        $review->setClient($client);
        $review->setProduct($product);
        $review->setRating($rating);
        $review->setComment($comment === '' ? null : $comment);
        $review->setStatus('PENDING');
        $review->setCreatedAt(new \DateTimeImmutable());
        $review->setUpdatedAt(null);

        $entityManager->persist($review);
        $entityManager->flush();

        return $this->json([
            'message' => 'Review submitted successfully. It is pending admin approval.',
            'review' => [
                'id' => $review->getId(),
                'status' => $review->getStatus(),
                'rating' => $review->getRating(),
                'comment' => $review->getComment(),
                'created_at' => $review->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            ],
        ], 201);
    }

    private function serializePublicReview(Review $review): array
    {
        $email = $review->getClient()?->getEmail();
        $displayName = $email !== null && $email !== ''
            ? explode('@', $email)[0]
            : 'Anonymous';

        return [
            'id' => $review->getId(),
            'rating' => $review->getRating(),
            'comment' => $review->getComment(),
            'status' => $review->getStatus(),
            'created_at' => $review->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            'client' => [
                'id' => $review->getClient()?->getId(),
                'name' => $displayName,
            ],
        ];
    }
}
