<?php

namespace App\Controller;

use App\Entity\B2BCompany;
use App\Entity\B2BMarket;
use App\Entity\Favorite;
use App\Repository\FavoriteRepository;
use App\Repository\ProductListingRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class FavoriteController extends AbstractController
{
    private const DEFAULT_FREEMIUM_FAVORITES_LIMIT = 5;

    #[Route('/favorites', name: 'get_favorites', methods: ['GET'])]
    public function getFavorites(Request $request, FavoriteRepository $favoriteRepository): JsonResponse
    {
        $clientId = $request->query->getInt('clientId', 0);
        $productListingId = $request->query->getInt('productListingId', 0);

        $qb = $favoriteRepository
            ->createQueryBuilder('f')
            ->leftJoin('f.product_listing', 'pl')
            ->leftJoin('pl.product', 'p')
            ->leftJoin('pl.seller', 's')
            ->leftJoin('f.client', 'u')
            ->select(
                'f.id AS id',
                'f.created_at AS created_at',
                'u.id AS clientId',
                'pl.id AS productListingId',
                'pl.ref AS ref',
                'pl.price AS price',
                'pl.old_price AS old_price',
                'pl.product_url AS product_url',
                'pl.availability AS availability',
                'pl.trust_score AS trust_score',
                'pl.is_active AS is_active',
                'p.id AS productId',
                'p.name AS productName',
                'p.image_url AS productImageUrl',
                's.id AS sellerId',
                's.name AS sellerName'
            )
            ->orderBy('f.created_at', 'DESC');

        if ($clientId > 0) {
            $qb
                ->andWhere('u.id = :clientId')
                ->setParameter('clientId', $clientId);
        }

        if ($productListingId > 0) {
            $qb
                ->andWhere('pl.id = :productListingId')
                ->setParameter('productListingId', $productListingId);
        }

        $rows = $qb->getQuery()->getArrayResult();

        $data = array_map(static function (array $row): array {
            $createdAt = $row['created_at'] ?? null;

            return [
                'id' => isset($row['id']) ? (int) $row['id'] : null,
                'created_at' => $createdAt instanceof \DateTimeInterface ? $createdAt->format(DATE_ATOM) : $createdAt,
                'clientId' => isset($row['clientId']) ? (int) $row['clientId'] : null,
                'productListingId' => isset($row['productListingId']) ? (int) $row['productListingId'] : null,
                'ref' => $row['ref'] ?? null,
                'price' => isset($row['price']) ? (float) $row['price'] : null,
                'old_price' => isset($row['old_price']) ? (float) $row['old_price'] : null,
                'product_url' => $row['product_url'] ?? null,
                'availability' => array_key_exists('availability', $row) && $row['availability'] !== null ? (bool) $row['availability'] : null,
                'trust_score' => isset($row['trust_score']) ? (float) $row['trust_score'] : null,
                'is_active' => array_key_exists('is_active', $row) && $row['is_active'] !== null ? (bool) $row['is_active'] : null,
                'productId' => isset($row['productId']) ? (int) $row['productId'] : null,
                'productName' => $row['productName'] ?? null,
                'productImageUrl' => $row['productImageUrl'] ?? null,
                'sellerId' => isset($row['sellerId']) ? (int) $row['sellerId'] : null,
                'sellerName' => $row['sellerName'] ?? null,
            ];
        }, $rows);

        return $this->json($data);
    }

    #[Route('/favorites', name: 'create_favorite', methods: ['POST'])]
    public function createFavorite(
        Request $request,
        FavoriteRepository $favoriteRepository,
        ProductListingRepository $productListingRepository,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return $this->json(['error' => 'Invalid body.'], 400);
        }

        $productListingId = (int) ($body['productListingId'] ?? 0);
        $clientId = (int) ($body['clientId'] ?? 0);

        if ($productListingId <= 0 || $clientId <= 0) {
            return $this->json(['error' => 'productListingId and clientId are required.'], 400);
        }

        $productListing = $productListingRepository->find($productListingId);
        if (!$productListing) {
            return $this->json(['error' => 'Product listing not found.'], 404);
        }

        $client = $userRepository->find($clientId);
        if (!$client) {
            return $this->json(['error' => 'Client not found.'], 404);
        }

        $isB2B = $client instanceof B2BCompany || $client instanceof B2BMarket;

        // Authenticated users without subscription are treated as Freemium.
        $favoritesLimit = (int) ($client->getSubscription()?->getFavoritesLimit() ?? self::DEFAULT_FREEMIUM_FAVORITES_LIMIT);
        if ($favoritesLimit <= 0) {
            $favoritesLimit = self::DEFAULT_FREEMIUM_FAVORITES_LIMIT;
        }

        // Check if this favorite already exists
        $existing = $favoriteRepository->findOneBy([
            'product_listing' => $productListing,
            'client' => $client,
        ]);

        // Only enforce limit if creating a new favorite
        if (!$isB2B && !$existing) {
            $currentFavoritesCount = $favoriteRepository->count(['client' => $client]);
            
            if ($currentFavoritesCount >= $favoritesLimit) {
                return $this->json([
                    'error' => 'Favorite limit reached.',
                    'message' => 'You have reached the maximum number of favorites (' . $favoritesLimit . ') for your plan.',
                    'limit' => $favoritesLimit,
                    'current' => $currentFavoritesCount,
                ], 429);
            }
        }

        $favorite = $existing instanceof Favorite ? $existing : new Favorite();
        $favorite->setProductListing($productListing);
        $favorite->setClient($client);

        if (!$existing instanceof Favorite) {
            $favorite->setCreatedAt(new \DateTimeImmutable());
            $entityManager->persist($favorite);
        }

        $entityManager->flush();

        return $this->json([
            'id' => $favorite->getId(),
            'created_at' => $favorite->getCreatedAt()?->format(DATE_ATOM),
            'clientId' => $client->getId(),
            'productListingId' => $productListing->getId(),
            'productId' => $productListing->getProduct()?->getId(),
            'productName' => $productListing->getProduct()?->getName(),
            'productImageUrl' => $productListing->getProduct()?->getImageUrl(),
            'sellerId' => $productListing->getSeller()?->getId(),
            'sellerName' => $productListing->getSeller()?->getName(),
        ], $existing instanceof Favorite ? 200 : 201);
    }

    #[Route('/favorites/{id}', name: 'delete_favorite', methods: ['DELETE'])]
    public function deleteFavorite(
        int $id,
        Request $request,
        FavoriteRepository $favoriteRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $favorite = $favoriteRepository->find($id);
        if (!$favorite) {
            return $this->json(['error' => 'Favorite not found.'], 404);
        }

        $clientId = $request->query->getInt('clientId', 0);
        if ($clientId > 0 && $favorite->getClient()?->getId() !== $clientId) {
            return $this->json(['error' => 'Forbidden.'], 403);
        }

        $entityManager->remove($favorite);
        $entityManager->flush();

        return $this->json(['success' => true]);
    }
}
