<?php

namespace App\Controller;

use App\Entity\B2BCompany;
use App\Entity\ProductListing;
use App\Repository\ProductRepository;
use App\Repository\ProductListingRepository;
use App\Repository\SellerRepository;
use App\Service\B2BNotificationService;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Cache\CacheItemPoolInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class ProductListingController extends AbstractController
{
    private const CACHE_KEY_LISTINGS = 'listings.all';
    private const CACHE_KEY_LISTINGS_PREFIX = 'listings.';
    private const CACHE_TTL = 300;

    public function __construct(
        private readonly B2BNotificationService $b2bNotificationService,
        #[Autowire(service: 'listings.cache')]
        private readonly CacheItemPoolInterface $listingsCache,
    ) {
    }

    private function buildListingsCacheKey(?int $productId, ?int $sellerId): string
    {
        $key = self::CACHE_KEY_LISTINGS;
        if ($productId !== null) {
            $key .= ".p{$productId}";
        }
        if ($sellerId !== null) {
            $key .= ".s{$sellerId}";
        }
        return $key ?: self::CACHE_KEY_LISTINGS;
    }

    #[Route('/product-listings', name: 'get_product_listings', methods: ['GET'])]
    public function getProductListings(Request $request, ProductListingRepository $productListingRepository): JsonResponse
    {
        $productId = $request->query->getInt('productId', 0);
        $sellerId = $request->query->getInt('sellerId', 0);
        $page = $request->query->getInt('page', 1);
        $limit = $request->query->getInt('limit', 0);

        $normalizedProductId = $productId > 0 ? $productId : null;
        $normalizedSellerId = $sellerId > 0 ? $sellerId : null;

        $cacheKey = $this->buildListingsCacheKey($normalizedProductId, $normalizedSellerId) . ".p{$page}" . ($limit > 0 ? ".l{$limit}" : "");

        $cacheItem = $this->listingsCache->getItem($cacheKey);
        if ($cacheItem->isHit()) {
            return $this->json($cacheItem->get());
        }

        $rows = $productListingRepository->findListingRows(
            $normalizedProductId,
            $normalizedSellerId,
            $page,
            $limit,
        );

        $decodeBreakdown = function (mixed $value): mixed {
            if (is_string($value)) {
                $decoded = json_decode($value, true);
                return is_array($decoded) ? $decoded : null;
            }
            return $value;
        };

        $data = array_map(function (array $row) use ($decodeBreakdown): array {
            $createdAt = $row['created_at'] ?? null;
            $updatedAt = $row['updated_at'] ?? null;

            return [
                'id' => $row['id'] ?? null,
                'ref' => $row['ref'] ?? null,
                'price' => $row['price'] ?? null,
                'old_price' => $row['old_price'] ?? null,
                'product_url' => $row['product_url'] ?? null,
                'availability' => $row['availability'] ?? null,
                'trust_score' => $row['trust_score'] ?? null,
                'trust_score_breakdown' => $decodeBreakdown($row['trust_score_breakdown'] ?? null),
                'created_at' => $createdAt instanceof \DateTimeInterface ? $createdAt->format(DATE_ATOM) : $createdAt,
                'updated_at' => $updatedAt instanceof \DateTimeInterface ? $updatedAt->format(DATE_ATOM) : $updatedAt,

                'is_active' => $row['is_active'] ?? null,
                'productId' => $row['productId'] ?? null,
                'productName' => $row['productName'] ?? null,
                'productBrand' => $row['productBrand'] ?? null,
                'productImageUrl' => $row['productImageUrl'] ?? null,
                'categoryId' => $row['categoryId'] ?? null,
                'categoryName' => $row['categoryName'] ?? null,
                'sellerId' => $row['sellerId'] ?? null,
                'sellerName' => $row['sellerName'] ?? null,
            ];
        }, $rows);

        $cacheItem->set($data);
        $cacheItem->expiresAfter(self::CACHE_TTL);
        $this->listingsCache->save($cacheItem);

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
        $listing->setUpdatedAt(new \DateTimeImmutable());

        $entityManager->persist($listing);
        $entityManager->flush();

        $this->clearListingsCache();
        $this->detectNewCompetitor($listing, $entityManager);
        $this->detectCompetitorAlerts($listing, $entityManager);

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
            'updated_at' => $listing->getUpdatedAt()?->format(DATE_ATOM),

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
        $listing->setUpdatedAt(new \DateTimeImmutable());
        $entityManager->flush();

        $this->clearListingsCache();
        $this->detectCompetitorAlerts($listing, $entityManager);

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
        $listing->setUpdatedAt(new \DateTimeImmutable());
        $entityManager->flush();

        $this->clearListingsCache();
        $this->detectCompetitorAlerts($listing, $entityManager);

        return $this->json(['id' => $listing->getId(), 'availability' => $listing->isAvailability()]);
    }

    #[Route('/product-listings/{id}', name: 'update_product_listing', methods: ['PUT'])]
    public function updateProductListing(int $id, Request $request, ProductListingRepository $productListingRepository, ProductRepository $productRepository, SellerRepository $sellerRepository, EntityManagerInterface $entityManager): JsonResponse
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
        if (array_key_exists('is_active', $body)) {
            $listing->setIsActive((bool) $body['is_active']);
        }
        if (array_key_exists('availability', $body)) {
            $listing->setAvailability($body['availability'] !== null ? (bool) $body['availability'] : null);
        }
        if (array_key_exists('sellerId', $body) && (int) $body['sellerId'] > 0) {
            $seller = $sellerRepository->find((int) $body['sellerId']);
            if (!$seller) {
                return $this->json(['error' => 'Seller not found.'], 404);
            }

            $listing->setSeller($seller);
        }
        if (array_key_exists('productId', $body) && (int) $body['productId'] > 0) {
            $product = $productRepository->find((int) $body['productId']);
            if (!$product) {
                return $this->json(['error' => 'Product not found.'], 404);
            }

            $listing->setProduct($product);
        }

        $listing->setUpdatedAt(new \DateTimeImmutable());

        $entityManager->flush();

        $this->clearListingsCache();

        // Detect competitive alerts after price/availability changes
        $this->detectCompetitorAlerts($listing, $entityManager);

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

        $this->clearListingsCache();

        return $this->json(['success' => true]);
    }

    private function clearListingsCache(): void
    {
        $this->listingsCache->clear();
    }

    private function decodeTrustBreakdown(mixed $value): mixed
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : null;
        }
        return $value;
    }

    private function detectNewCompetitor(ProductListing $listing, EntityManagerInterface $entityManager): void
    {
        $product = $listing->getProduct();
        $seller = $listing->getSeller();
        if (!$product || !$seller) return;

        $listingSellerId = $seller->getId();

        // Check if there are existing companies that sell this same product
        $existingListings = $entityManager->getRepository(ProductListing::class)->findBy([
            'product' => $product,
            'is_active' => true,
        ]);

        $existingSellerIds = [];
        foreach ($existingListings as $existing) {
            $s = $existing->getSeller();
            if ($s && $s->getId() !== $listingSellerId) {
                $existingSellerIds[] = $s->getId();
            }
        }

        if (empty($existingSellerIds)) return;

        // Notify companies that sell this product about the new competitor
        $b2bCompanies = $entityManager->getRepository(B2BCompany::class)->findBy(['b2b_status' => 'ACTIVE', 'is_verified' => true]);
        foreach ($b2bCompanies as $company) {
            $companySeller = $company->getSeller();
            if (!$companySeller || !in_array($companySeller->getId(), $existingSellerIds, true)) continue;

            $this->b2bNotificationService->notifyCompany(
                $company,
                'NEW_COMPETITOR',
                sprintf('New competitor "%s" is now selling "%s" on the marketplace.', $seller->getName() ?? 'Unknown', $product->getName()),
                'MEDIUM',
                $listing
            );

            $this->b2bNotificationService->sendEmail(
                $company,
                sprintf('New Competitor Alert: "%s" is now selling "%s"', $seller->getName() ?? 'Unknown', $product->getName()),
                sprintf(
                    "Hello %s,\n\nA new competitor \"%s\" is now selling \"%s\" on the marketplace.\n\nLog in to your dashboard to monitor the competition.\n\nBest regards,\nProductRadar Team",
                    $company->getName() ?? 'Valued Partner',
                    $seller->getName() ?? 'Unknown',
                    $product->getName()
                )
            );
        }
    }

    private function detectCompetitorAlerts(ProductListing $listing, EntityManagerInterface $entityManager): void
    {
        $product = $listing->getProduct();
        $seller = $listing->getSeller();
        if (!$product || !$seller) return;

        $listingSellerId = $seller->getId();
        $listingPrice = $listing->getPrice();
        $listingAvailable = $listing->isAvailability();

        // Find all B2B companies whose seller matches the product's competitors
        $b2bCompanies = $entityManager->getRepository(B2BCompany::class)->findBy(['b2b_status' => 'ACTIVE', 'is_verified' => true]);

        foreach ($b2bCompanies as $company) {
            $companySeller = $company->getSeller();
            if (!$companySeller || $companySeller->getId() === $listingSellerId) continue;

            // Check if this company also sells the same product
            $companyListings = $entityManager->getRepository(ProductListing::class)->findBy([
                'product' => $product,
                'seller' => $companySeller,
                'is_active' => true,
            ]);

            foreach ($companyListings as $companyListing) {
                if ($listingPrice !== null && $companyListing->getPrice() !== null) {
                    // Alert 1: Competitor undercut — this listing is cheaper than the vendor's
                    if ($listingPrice < $companyListing->getPrice()) {
                        $this->b2bNotificationService->alertUndercut(
                            $company,
                            $companyListing,
                            $seller->getName() ?? 'Unknown',
                            $listingPrice
                        );

                        $this->b2bNotificationService->sendEmail(
                            $company,
                            sprintf('Price Alert: Competitor "%s" is now cheaper for "%s"', $seller->getName() ?? 'Unknown', $product->getName()),
                            sprintf(
                                "Hello %s,\n\nCompetitor \"%s\" has lowered their price for \"%s\" to %s DT.\n\nReview your pricing strategy in your dashboard.\n\nBest regards,\nProductRadar Team",
                                $company->getName() ?? 'Valued Partner',
                                $seller->getName() ?? 'Unknown',
                                $product->getName(),
                                number_format($listingPrice, 2)
                            )
                        );
                    }
                }

                // Alert 2: Competitor OOS — this listing went OOS and vendor is in stock
                if ($listingAvailable === false && $companyListing->isAvailability() === true) {
                    $this->b2bNotificationService->notifyCompany(
                        $company,
                        'STOCK_OPPORTUNITY',
                        sprintf('"%s" just went out of stock on "%s". You are in stock — consider promoting this product.', $seller->getName() ?? 'A competitor', $product->getName()),
                        'HIGH',
                        $companyListing
                    );

                    $this->b2bNotificationService->sendEmail(
                        $company,
                        sprintf('Stock Opportunity: "%s" is out of stock, you are in stock!', $product->getName()),
                        sprintf(
                            "Hello %s,\n\nCompetitor \"%s\" just went out of stock for \"%s\" but you are still in stock.\n\nThis is a great opportunity to promote this product and capture market share.\n\nBest regards,\nProductRadar Team",
                            $company->getName() ?? 'Valued Partner',
                            $seller->getName() ?? 'A competitor',
                            $product->getName()
                        )
                    );
                }

                // Alert 3: Pure competitor OOS — vendor is also OOS, no opportunity, but good to know
                if ($listingAvailable === false && $companyListing->isAvailability() === false) {
                    $this->b2bNotificationService->notifyCompany(
                        $company,
                        'COMPETITOR_OOS',
                        sprintf('Competitor "%s" is also out of stock for "%s".', $seller->getName() ?? 'Unknown', $product->getName()),
                        'LOW',
                        $companyListing
                    );

                    $this->b2bNotificationService->sendEmail(
                        $company,
                        sprintf('Market Update: "%s" also out of stock for "%s"', $seller->getName() ?? 'Unknown', $product->getName()),
                        sprintf(
                            "Hello %s,\n\nCompetitor \"%s\" is also out of stock for \"%s\".\n\nRestocking soon could give you a competitive advantage.\n\nBest regards,\nProductRadar Team",
                            $company->getName() ?? 'Valued Partner',
                            $seller->getName() ?? 'Unknown',
                            $product->getName()
                        )
                    );
                }
            }
        }
    }
}
