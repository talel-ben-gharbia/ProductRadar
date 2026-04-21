<?php

namespace App\Service;

use App\Entity\Product;
use Doctrine\ORM\EntityManagerInterface;

final class ProductMergeService
{
    public function __construct(private EntityManagerInterface $entityManager)
    {
    }

    /**
     * @return array{moved_listings: int, moved_alerts: int, moved_price_histories: int, moved_reviews: int, moved_favorites: int}
     */
    public function mergeProducts(Product $primary, Product $duplicate): array
    {
        if ($primary->getId() === null || $duplicate->getId() === null) {
            throw new \InvalidArgumentException('Both products must exist before merge.');
        }

        if ($primary->getId() === $duplicate->getId()) {
            throw new \InvalidArgumentException('Primary and duplicate product cannot be the same.');
        }

        $movedListings = 0;
        $movedAlerts = 0;
        $movedPriceHistories = 0;
        $movedReviews = 0;
        $movedFavorites = 0;

        $listings = $duplicate->getProductListings()->toArray();
        foreach ($listings as $listing) {
            $movedPriceHistories += $listing->getPriceHistories()->count();
            $movedFavorites += $listing->getFavorites()->count();

            $reviewCount = (int) $this->entityManager->createQueryBuilder()
                ->select('COUNT(r.id)')
                ->from('App\\Entity\\Review', 'r')
                ->andWhere('r.productListing = :listing')
                ->setParameter('listing', $listing)
                ->getQuery()
                ->getSingleScalarResult();

            $movedReviews += $reviewCount;
            $listing->setProduct($primary);
            $listing->setUpdatetAt(new \DateTimeImmutable());
            $movedListings++;
        }

        $alerts = $duplicate->getAlerts()->toArray();
        foreach ($alerts as $alert) {
            $alert->setProduct($primary);
            $movedAlerts++;
        }

        if (($primary->getBrand() === null || trim((string) $primary->getBrand()) === '') && $duplicate->getBrand() !== null) {
            $primary->setBrand($duplicate->getBrand());
        }

        if (($primary->getImageUrl() === null || trim((string) $primary->getImageUrl()) === '') && $duplicate->getImageUrl() !== null) {
            $primary->setImageUrl($duplicate->getImageUrl());
        }

        $this->entityManager->remove($duplicate);
        $this->entityManager->flush();

        return [
            'moved_listings' => $movedListings,
            'moved_alerts' => $movedAlerts,
            'moved_price_histories' => $movedPriceHistories,
            'moved_reviews' => $movedReviews,
            'moved_favorites' => $movedFavorites,
        ];
    }
}
