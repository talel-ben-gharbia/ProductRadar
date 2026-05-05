<?php

namespace App\Service;

use App\Entity\Product;
use App\Entity\ProductListing;
use Doctrine\ORM\EntityManagerInterface;

final class ProductMergeService
{
    public const LISTING_CONFLICT_KEEP_PRIMARY = 'keep-primary';
    public const LISTING_CONFLICT_KEEP_DUPLICATE = 'keep-duplicate';

    public function __construct(private EntityManagerInterface $entityManager)
    {
    }

    /**
     * @param array<int, Product> $duplicates
     * @return array{moved_listings: int, moved_alerts: int, moved_price_histories: int, moved_reviews: int, moved_favorites: int}
     */
    public function mergeProducts(
        Product $primary,
        array $duplicates,
        string $listingConflictStrategy = self::LISTING_CONFLICT_KEEP_DUPLICATE,
        array $listingSurvivorBySellerId = [],
    ): array
    {
        if ($primary->getId() === null) {
            throw new \InvalidArgumentException('Primary product must exist before merge.');
        }

        if ($duplicates === []) {
            throw new \InvalidArgumentException('At least one duplicate product must be provided.');
        }

        if (!in_array($listingConflictStrategy, [self::LISTING_CONFLICT_KEEP_PRIMARY, self::LISTING_CONFLICT_KEEP_DUPLICATE], true)) {
            throw new \InvalidArgumentException('Invalid listing conflict strategy.');
        }

        $duplicateIds = [];
        foreach ($duplicates as $duplicate) {
            if (!$duplicate instanceof Product || $duplicate->getId() === null) {
                continue;
            }

            if ($duplicate->getId() === $primary->getId()) {
                throw new \InvalidArgumentException('Primary and duplicate product cannot be the same.');
            }

            $duplicateIds[$duplicate->getId()] = true;
        }

        if ($duplicateIds === []) {
            throw new \InvalidArgumentException('Both products must exist before merge.');
        }

        $normalizedListingSurvivorBySellerId = [];
        foreach ($listingSurvivorBySellerId as $sellerId => $listingId) {
            $normalizedSellerId = (int) $sellerId;
            $normalizedListingId = (int) $listingId;

            if ($normalizedSellerId > 0 && $normalizedListingId > 0) {
                $normalizedListingSurvivorBySellerId[$normalizedSellerId] = $normalizedListingId;
            }
        }

        $movedListings = 0;
        $movedAlerts = 0;
        $movedPriceHistories = 0;
        $movedReviews = 0;
        $movedFavorites = 0;

        $products = array_merge([$primary], array_values($duplicates));
        $groups = [];

        foreach ($products as $product) {
            foreach ($product->getProductListings()->toArray() as $listing) {
                $seller = $listing->getSeller();
                $groupKey = $seller !== null && $seller->getId() !== null
                    ? 'seller:' . $seller->getId()
                    : 'listing:' . $listing->getId();

                if (!isset($groups[$groupKey])) {
                    $groups[$groupKey] = [
                        'sellerId' => $seller?->getId(),
                        'listings' => [],
                    ];
                }

                $groups[$groupKey]['listings'][] = [
                    'product' => $product,
                    'listing' => $listing,
                ];
            }
        }

        foreach ($groups as $group) {
            /** @var array<int, array{product: Product, listing: ProductListing}> $entries */
            $entries = $group['listings'];
            if ($entries === []) {
                continue;
            }

            $sellerId = $group['sellerId'];
            $selectedListingId = $sellerId !== null ? ($normalizedListingSurvivorBySellerId[$sellerId] ?? null) : null;

            $survivorEntry = null;
            if ($selectedListingId !== null) {
                foreach ($entries as $entry) {
                    if ($entry['listing']->getId() === $selectedListingId) {
                        $survivorEntry = $entry;
                        break;
                    }
                }
            }

            if ($survivorEntry === null) {
                foreach ($entries as $entry) {
                    if ($entry['product']->getId() === $primary->getId()) {
                        $survivorEntry = $entry;
                        break;
                    }
                }
            }

            if ($survivorEntry === null) {
                $survivorEntry = $entries[0];
            }

            $survivorListing = $survivorEntry['listing'];
            $survivorProduct = $survivorEntry['product'];

            foreach ($entries as $entry) {
                $listing = $entry['listing'];
                $product = $entry['product'];

                $this->moveListingOwnershipToPrimary($listing, $product, $primary);

                if ($listing !== $survivorListing) {
                    $this->mergeListingFields($survivorListing, $listing);
                    $movedPriceHistories += $this->moveListingRelations($listing, $survivorListing);
                    $movedReviews += $this->moveReviews($listing, $survivorListing);
                    $movedFavorites += $this->moveFavorites($listing, $survivorListing);
                    $movedAlerts += $this->moveNotifications($listing, $survivorListing);

                    $this->entityManager->remove($listing);
                    $movedListings++;
                    continue;
                }

                if ($survivorProduct->getId() !== $primary->getId()) {
                    $this->mergeListingFields($survivorListing, $listing);
                }

                $survivorListing->setUpdatedAt(new \DateTimeImmutable());
                $movedListings++;
            }

            $movedPriceHistories += $this->normalizeSurvivorPriceHistory($survivorListing);
        }

        foreach ($duplicates as $duplicate) {
            $alerts = $duplicate->getAlerts()->toArray();
            foreach ($alerts as $alert) {
                $alert->setProduct($primary);
                $movedAlerts++;
            }

            $this->entityManager->remove($duplicate);
        }

        if (($primary->getBrand() === null || trim((string) $primary->getBrand()) === '') && $duplicates !== [] && $duplicates[0]->getBrand() !== null) {
            $primary->setBrand($duplicates[0]->getBrand());
        }

        if (($primary->getImageUrl() === null || trim((string) $primary->getImageUrl()) === '') && $duplicates !== [] && $duplicates[0]->getImageUrl() !== null) {
            $primary->setImageUrl($duplicates[0]->getImageUrl());
        }

        $this->entityManager->flush();

        return [
            'moved_listings' => $movedListings,
            'moved_alerts' => $movedAlerts,
            'moved_price_histories' => $movedPriceHistories,
            'moved_reviews' => $movedReviews,
            'moved_favorites' => $movedFavorites,
        ];
    }

    private function moveListingOwnershipToPrimary(ProductListing $listing, Product $sourceProduct, Product $primary): void
    {
        if ($sourceProduct->getProductListings()->contains($listing)) {
            $sourceProduct->removeProductListing($listing);
        }

        if (!$primary->getProductListings()->contains($listing)) {
            $primary->addProductListing($listing);
        } else {
            $listing->setProduct($primary);
        }
    }

    private function mergeListingFields(ProductListing $target, ProductListing $source): void
    {
        if (($target->getRef() === null || trim((string) $target->getRef()) === '') && $source->getRef() !== null && trim((string) $source->getRef()) !== '') {
            $target->setRef($source->getRef());
        }

        if ($target->getPrice() === null && $source->getPrice() !== null) {
            $target->setPrice($source->getPrice());
        }

        if ($target->getOldPrice() === null && $source->getOldPrice() !== null) {
            $target->setOldPrice($source->getOldPrice());
        }

        if ($target->isAvailability() === null && $source->isAvailability() !== null) {
            $target->setAvailability($source->isAvailability());
        }

        if (($target->getProductUrl() === null || trim((string) $target->getProductUrl()) === '') && $source->getProductUrl() !== null && trim((string) $source->getProductUrl()) !== '') {
            $target->setProductUrl($source->getProductUrl());
        }

        if ($target->getTrustScore() === null && $source->getTrustScore() !== null) {
            $target->setTrustScore($source->getTrustScore());
        }

        if ($target->isActive() === null && $source->isActive() !== null) {
            $target->setIsActive((bool) $source->isActive());
        }

        if ($target->getCreatedAt() === null && $source->getCreatedAt() !== null) {
            $target->setCreatedAt($source->getCreatedAt());
        }

        if ($target->getUpdatedAt() === null && $source->getUpdatedAt() !== null) {
            $target->setUpdatedAt($source->getUpdatedAt());
        }

        $target->setUpdatedAt(new \DateTimeImmutable());
    }

    private function moveListingRelations(ProductListing $source, ProductListing $target): int
    {
        $histories = $source->getPriceHistories()->toArray();
        $movedCount = count($histories);

        foreach ($histories as $history) {
            $source->removePriceHistory($history);
            $target->addPriceHistory($history);
        }

        return $movedCount;
    }

    private function normalizeSurvivorPriceHistory(ProductListing $listing): int
    {
        $changedCount = 0;

        foreach ($listing->getPriceHistories()->toArray() as $history) {
            if ($history->getProductListing()?->getId() !== $listing->getId()) {
                $history->setProductListing($listing);
                $changedCount++;
            }
        }

        return $changedCount;
    }

    private function moveReviews(ProductListing $source, ProductListing $target): int
    {
        $reviewCount = (int) $this->entityManager->createQueryBuilder()
            ->select('COUNT(r.id)')
            ->from('App\\Entity\\Review', 'r')
            ->andWhere('r.productListing = :listing')
            ->setParameter('listing', $source)
            ->getQuery()
            ->getSingleScalarResult();

        if ($reviewCount > 0) {
            $this->entityManager->createQueryBuilder()
                ->update('App\\Entity\\Review', 'r')
                ->set('r.productListing', ':target')
                ->where('r.productListing = :source')
                ->setParameter('target', $target)
                ->setParameter('source', $source)
                ->getQuery()
                ->execute();
        }

        return $reviewCount;
    }

    private function moveFavorites(ProductListing $source, ProductListing $target): int
    {
        $favoriteCount = (int) $source->getFavorites()->count();

        if ($favoriteCount > 0) {
            $this->entityManager->createQueryBuilder()
                ->update('App\\Entity\\Favorite', 'f')
                ->set('f.product_listing', ':target')
                ->where('f.product_listing = :source')
                ->setParameter('target', $target)
                ->setParameter('source', $source)
                ->getQuery()
                ->execute();
        }

        return $favoriteCount;
    }

    private function moveNotifications(ProductListing $source, ProductListing $target): int
    {
        $notificationCount = (int) $source->getNotifications()->count();

        if ($notificationCount > 0) {
            $this->entityManager->createQueryBuilder()
                ->update('App\\Entity\\Notification', 'n')
                ->set('n.product_listing', ':target')
                ->where('n.product_listing = :source')
                ->setParameter('target', $target)
                ->setParameter('source', $source)
                ->getQuery()
                ->execute();
        }

        return $notificationCount;
    }
}
