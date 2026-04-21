<?php

namespace App\Controller;

use App\Repository\CategoryRepository;
use App\Repository\ProductListingRepository;
use App\Repository\ProductRepository;
use App\Security\AdminApiGuard;
use App\Service\ProductMergeService;
use App\Service\ProductSplitService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/admin/api/quality')]
final class ProductQualityController extends AbstractController
{
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
        $duplicateIdsRaw = (array) ($payload['duplicate_product_ids'] ?? []);
        $duplicateIds = array_values(array_unique(array_filter(array_map(
            static fn (mixed $value): int => (int) $value,
            $duplicateIdsRaw,
        ), static fn (int $value): bool => $value > 0)));

        if ($primaryId <= 0 || $duplicateIds === []) {
            return $this->json(['error' => 'primary_product_id and duplicate_product_ids are required.'], 422);
        }

        if (in_array($primaryId, $duplicateIds, true)) {
            return $this->json(['error' => 'Primary product cannot appear in duplicate list.'], 422);
        }

        $primary = $productRepository->find($primaryId);
        if ($primary === null) {
            return $this->json(['error' => 'Primary product not found.'], 404);
        }

        $summary = [
            'merged_count' => 0,
            'moved_listings' => 0,
            'moved_alerts' => 0,
            'moved_price_histories' => 0,
            'moved_reviews' => 0,
            'moved_favorites' => 0,
        ];

        $entityManager->getConnection()->beginTransaction();
        try {
            foreach ($duplicateIds as $duplicateId) {
                $duplicate = $productRepository->find($duplicateId);
                if ($duplicate === null) {
                    continue;
                }

                $result = $productMergeService->mergeProducts($primary, $duplicate);
                $summary['merged_count']++;
                $summary['moved_listings'] += $result['moved_listings'];
                $summary['moved_alerts'] += $result['moved_alerts'];
                $summary['moved_price_histories'] += $result['moved_price_histories'];
                $summary['moved_reviews'] += $result['moved_reviews'];
                $summary['moved_favorites'] += $result['moved_favorites'];
            }

            $entityManager->getConnection()->commit();
        } catch (\Throwable $exception) {
            $entityManager->getConnection()->rollBack();

            return $this->json([
                'error' => 'Merge operation failed.',
                'details' => $exception->getMessage(),
            ], 500);
        }

        return $this->json([
            'primary_product_id' => $primaryId,
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
