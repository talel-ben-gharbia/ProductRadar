<?php

namespace App\Controller;

use App\Repository\ProductListingRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class ProductListingController extends AbstractController
{
    #[Route('/product-listings', name: 'get_product_listings', methods: ['GET'])]
    public function getProductListings(Request $request, ProductListingRepository $productListingRepository): JsonResponse
    {
        $productId = $request->query->getInt('productId', 0);
        $sellerId = $request->query->getInt('sellerId', 0);

        $rows = $productId > 0
            ? $productListingRepository->findBestComparableRowsPerSeller(
                $productId,
                $sellerId > 0 ? $sellerId : null,
            )
            : $productListingRepository->findListingRows(
                null,
                $sellerId > 0 ? $sellerId : null,
            );

        $data = array_map(static function (array $row): array {
            $createdAt = $row['created_at'] ?? null;
            $updatedAt = $row['updatet_at'] ?? null;

            return [
                'id' => $row['id'] ?? null,
                'price' => $row['price'] ?? null,
                'old_price' => $row['old_price'] ?? null,
                'product_url' => $row['product_url'] ?? null,
                'availability' => $row['availability'] ?? null,
                'trust_score' => $row['trust_score'] ?? null,
                'created_at' => $createdAt instanceof \DateTimeInterface ? $createdAt->format(DATE_ATOM) : $createdAt,
                'updatet_at' => $updatedAt instanceof \DateTimeInterface ? $updatedAt->format(DATE_ATOM) : $updatedAt,
                'is_active' => $row['is_active'] ?? null,
                'productId' => $row['productId'] ?? null,
                'productName' => $row['productName'] ?? null,
                'productImageUrl' => $row['productImageUrl'] ?? null,
                'sellerId' => $row['sellerId'] ?? null,
                'sellerName' => $row['sellerName'] ?? null,
            ];
        }, $rows);

        return $this->json($data);
    }
}
