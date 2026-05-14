<?php

namespace App\Controller;

use App\Repository\CategoryRepository;
use App\Repository\ProductListingRepository;
use App\Repository\ProductRepository;
use App\Security\AdminApiGuard;
use App\Service\ProductMergeService;
use App\Service\ProductSplitService;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Cache\CacheItemPoolInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/admin/api/quality')]
final class ProductQualityController extends AbstractController
{
    public function __construct(
        #[Autowire(service: 'products.cache')]
        private readonly CacheItemPoolInterface $productsCache,
        #[Autowire(service: 'listings.cache')]
        private readonly CacheItemPoolInterface $listingsCache,
    ) {
    }

    #[Route('/products/merge', name: 'admin_quality_products_merge', methods: ['POST'])]
    public function mergeProducts(
        Request $request,
        ProductRepository $productRepository,
        ProductMergeService $productMergeService,
        AdminApiGuard $adminApiGuard,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request, true);
        if ($authError !== null) {
            return $authError;
        }

        $payload = json_decode((string) $request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        $primaryId = (int) ($payload['primary_product_id'] ?? 0);
        $listingConflictStrategy = (string) ($payload['listing_conflict_strategy'] ?? ProductMergeService::LISTING_CONFLICT_KEEP_DUPLICATE);
        $listingSurvivorBySellerRaw = is_array($payload['listing_survivor_by_seller'] ?? null)
            ? (array) $payload['listing_survivor_by_seller']
            : [];
        $listingSurvivorBySeller = [];
        foreach ($listingSurvivorBySellerRaw as $sellerId => $listingId) {
            $normalizedSellerId = (int) $sellerId;
            $normalizedListingId = (int) $listingId;

            if ($normalizedSellerId > 0 && $normalizedListingId > 0) {
                $listingSurvivorBySeller[$normalizedSellerId] = $normalizedListingId;
            }
        }
        $duplicateIdsRaw = (array) ($payload['duplicate_product_ids'] ?? []);
        $duplicateIds = array_values(array_unique(array_filter(array_map(
            static fn (mixed $value): int => (int) $value,
            $duplicateIdsRaw,
        ), static fn (int $value): bool => $value > 0)));

        if ($primaryId <= 0 || $duplicateIds === []) {
            return $this->json(['error' => 'primary_product_id and duplicate_product_ids are required.'], 422);
        }

        if (!in_array($listingConflictStrategy, [ProductMergeService::LISTING_CONFLICT_KEEP_PRIMARY, ProductMergeService::LISTING_CONFLICT_KEEP_DUPLICATE], true)) {
            return $this->json(['error' => 'listing_conflict_strategy must be keep-primary or keep-duplicate.'], 422);
        }

        if (in_array($primaryId, $duplicateIds, true)) {
            return $this->json(['error' => 'Primary product cannot appear in duplicate list.'], 422);
        }

        $primary = $productRepository->find($primaryId);
        if ($primary === null) {
            return $this->json(['error' => 'Primary product not found.'], 404);
        }

        $duplicates = [];
        foreach ($duplicateIds as $duplicateId) {
            $duplicate = $productRepository->find($duplicateId);
            if ($duplicate !== null) {
                $duplicates[] = $duplicate;
            }
        }

        if ($duplicates === []) {
            return $this->json(['error' => 'No duplicate products found to merge.'], 404);
        }

        $entityManager->getConnection()->beginTransaction();
        try {
            $summary = $productMergeService->mergeProducts($primary, $duplicates, $listingConflictStrategy, $listingSurvivorBySeller);
            $summary['merged_count'] = count($duplicates);

            $entityManager->getConnection()->commit();
        } catch (\Throwable $exception) {
            $entityManager->getConnection()->rollBack();

            return $this->json([
                'error' => 'Merge operation failed.',
                'details' => $exception->getMessage(),
            ], 500);
        }

        $this->productsCache->clear();
        $this->listingsCache->clear();

        return $this->json([
            'primary_product_id' => $primaryId,
            'listing_conflict_strategy' => $listingConflictStrategy,
            'listing_survivor_by_seller' => $listingSurvivorBySeller,
            'summary' => $summary,
        ]);
    }

    #[Route('/product-listings/{id}/split', name: 'admin_quality_listing_split', methods: ['POST'])]
    public function splitListing(
        int $id,
        Request $request,
        ProductListingRepository $productListingRepository,
        CategoryRepository $categoryRepository,
        ProductSplitService $productSplitService,
        AdminApiGuard $adminApiGuard,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request, true);
        if ($authError !== null) {
            return $authError;
        }

        $listing = $productListingRepository->find($id);
        if ($listing === null) {
            return $this->json(['error' => 'Listing not found.'], 404);
        }

        $payload = json_decode((string) $request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        $newName = trim((string) ($payload['name'] ?? ''));
        if ($newName === '') {
            return $this->json(['error' => 'name is required.'], 422);
        }

        $category = null;
        if (array_key_exists('categoryId', $payload) && $payload['categoryId'] !== null && $payload['categoryId'] !== '') {
            $category = $categoryRepository->find((int) $payload['categoryId']);
            if ($category === null) {
                return $this->json(['error' => 'categoryId not found.'], 404);
            }
        }

        try {
            $newProduct = $productSplitService->splitListingToNewProduct(
                $listing,
                $newName,
                array_key_exists('brand', $payload) ? (string) $payload['brand'] : null,
                array_key_exists('description', $payload) ? (string) $payload['description'] : null,
                array_key_exists('image_url', $payload) ? (string) $payload['image_url'] : null,
                $category,
            );
        } catch (\InvalidArgumentException $exception) {
            return $this->json(['error' => $exception->getMessage()], 422);
        }

        $this->productsCache->clear();
        $this->listingsCache->clear();

        return $this->json([
            'message' => 'Listing split successfully.',
            'listing_id' => $listing->getId(),
            'new_product' => [
                'id' => $newProduct->getId(),
                'name' => $newProduct->getName(),
                'brand' => $newProduct->getBrand(),
                'categoryId' => $newProduct->getCategory()?->getId(),
            ],
        ], 201);
    }
}
