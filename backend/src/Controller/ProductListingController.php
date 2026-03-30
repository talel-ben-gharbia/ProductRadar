<?php

namespace App\Controller;

use App\Entity\ProductListing;
use App\Repository\ProductRepository;
use App\Repository\ProductListingRepository;
use App\Repository\SellerRepository;
use Doctrine\ORM\EntityManagerInterface;
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

        $rows = $productListingRepository->findListingRows(
            $productId > 0 ? $productId : null,
            $sellerId > 0 ? $sellerId : null,
        );

        $data = array_map(static function (array $row): array {
            $createdAt = $row['created_at'] ?? null;
            $updatedAt = $row['updatet_at'] ?? null;

            return [
                'id' => $row['id'] ?? null,
                'ref' => $row['ref'] ?? null,
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

    #[Route('/product-listings', name: 'create_product_listing', methods: ['POST'])]
    public function createProductListing(Request $request, ProductRepository $productRepository, SellerRepository $sellerRepository, EntityManagerInterface $entityManager): JsonResponse
    {
        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return $this->json(['error' => 'Invalid body.'], 400);
        }

        $productId = (int) ($body['productId'] ?? 0);
        $sellerId = (int) ($body['sellerId'] ?? 0);
        $ref = trim((string) ($body['ref'] ?? ''));
        $productUrl = trim((string) ($body['product_url'] ?? ''));
        $price = $body['price'] ?? null;

        if ($productId <= 0 || $sellerId <= 0 || $ref === '' || $productUrl === '' || !is_numeric($price)) {
            return $this->json(['error' => 'Product, seller, ref, price and product_url are required.'], 400);
        }

        $product = $productRepository->find($productId);
        if (!$product) {
            return $this->json(['error' => 'Product not found.'], 404);
        }

        $seller = $sellerRepository->find($sellerId);
        if (!$seller) {
            return $this->json(['error' => 'Seller not found.'], 404);
        }

        $listing = new ProductListing();
        $listing->setProduct($product);
        $listing->setSeller($seller);
        $listing->setRef($ref);
        $listing->setPrice((float) $price);
        $listing->setOldPrice(isset($body['old_price']) && $body['old_price'] !== '' && $body['old_price'] !== null ? (float) $body['old_price'] : null);
        $listing->setProductUrl($productUrl);
        $listing->setAvailability(array_key_exists('availability', $body) ? (bool) $body['availability'] : null);
        $listing->setIsActive(array_key_exists('is_active', $body) ? (bool) $body['is_active'] : true);
        $listing->setCreatedAt(new \DateTimeImmutable());
        $listing->setUpdatetAt(new \DateTimeImmutable());

        $entityManager->persist($listing);
        $entityManager->flush();

        return $this->json([
            'id' => $listing->getId(),
            'productId' => $listing->getProduct()?->getId(),
            'sellerId' => $listing->getSeller()?->getId(),
            'ref' => $listing->getRef(),
            'price' => $listing->getPrice(),
            'old_price' => $listing->getOldPrice(),
            'product_url' => $listing->getProductUrl(),
            'availability' => $listing->isAvailability(),
            'is_active' => $listing->isActive(),
            'created_at' => $listing->getCreatedAt()?->format(DATE_ATOM),
            'updatet_at' => $listing->getUpdatetAt()?->format(DATE_ATOM),
        ], 201);
    }

    #[Route('/product-listings/{id}/active', name: 'patch_product_listing_active', methods: ['PATCH'])]
    public function patchProductListingActive(int $id, Request $request, ProductListingRepository $productListingRepository, EntityManagerInterface $entityManager): JsonResponse
    {
        $listing = $productListingRepository->find($id);

        if (!$listing) {
            return $this->json(['error' => 'Product listing not found.'], 404);
        }

        $body = json_decode($request->getContent(), true);

        if (!is_array($body) || !array_key_exists('is_active', $body)) {
            return $this->json(['error' => 'Missing is_active field.'], 400);
        }

        $listing->setIsActive((bool) $body['is_active']);
        $entityManager->flush();

        return $this->json(['id' => $listing->getId(), 'is_active' => $listing->isActive()]);
    }

    #[Route('/product-listings/{id}/availability', name: 'patch_product_listing_availability', methods: ['PATCH'])]
    public function patchProductListingAvailability(int $id, Request $request, ProductListingRepository $productListingRepository, EntityManagerInterface $entityManager): JsonResponse
    {
        $listing = $productListingRepository->find($id);

        if (!$listing) {
            return $this->json(['error' => 'Product listing not found.'], 404);
        }

        $body = json_decode($request->getContent(), true);

        if (!is_array($body) || !array_key_exists('availability', $body)) {
            return $this->json(['error' => 'Missing availability field.'], 400);
        }

        $listing->setAvailability((bool) $body['availability']);
        $entityManager->flush();

        return $this->json(['id' => $listing->getId(), 'availability' => $listing->isAvailability()]);
    }

    #[Route('/product-listings/{id}', name: 'update_product_listing', methods: ['PUT'])]
    public function updateProductListing(int $id, Request $request, ProductListingRepository $productListingRepository, EntityManagerInterface $entityManager): JsonResponse
    {
        $listing = $productListingRepository->find($id);
        if (!$listing) {
            return $this->json(['error' => 'Product listing not found.'], 404);
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return $this->json(['error' => 'Invalid body.'], 400);
        }

        if (!empty($body['ref'])) {
            $listing->setRef($body['ref']);
        }
        if (array_key_exists('price', $body) && is_numeric($body['price'])) {
            $listing->setPrice((float) $body['price']);
        }
        if (array_key_exists('old_price', $body)) {
            $listing->setOldPrice($body['old_price'] !== null && $body['old_price'] !== '' ? (float) $body['old_price'] : null);
        }
        if (!empty($body['product_url'])) {
            $listing->setProductUrl($body['product_url']);
        }

        $entityManager->flush();

        return $this->json(['id' => $listing->getId()]);
    }

    #[Route('/product-listings/{id}', name: 'delete_product_listing', methods: ['DELETE'])]
    public function deleteProductListing(int $id, ProductListingRepository $productListingRepository, EntityManagerInterface $entityManager): JsonResponse
    {
        $listing = $productListingRepository->find($id);
        if (!$listing) {
            return $this->json(['error' => 'Product listing not found.'], 404);
        }

        $entityManager->remove($listing);
        $entityManager->flush();

        return $this->json(['success' => true]);
    }
}
