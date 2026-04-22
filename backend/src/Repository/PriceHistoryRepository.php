<?php

namespace App\Repository;

use App\Entity\PriceHistory;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<PriceHistory>
 */
class PriceHistoryRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, PriceHistory::class);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function findHistoryRows(?int $productId = null, ?int $listingId = null): array
    {
        $qb = $this->createQueryBuilder('ph')
            ->select('ph.id AS id')
            ->addSelect('ph.recorded_price AS recordedPrice')
            ->addSelect('ph.recorded_at AS recordedAt')
            ->addSelect('ph.out_of_stock AS outOfStock')
            ->addSelect('ph.anomaly AS anomaly')
            ->addSelect('ph.seller AS sellerFromHistory')
            ->addSelect('pl.id AS listingId')
            ->addSelect('IDENTITY(pl.seller) AS sellerFromListing')
            ->addSelect('s.name AS sellerFromListingName')
            ->join('ph.productListing', 'pl')
            ->leftJoin('pl.product', 'p')
            ->leftJoin('pl.seller', 's')
            ->orderBy('ph.recorded_at', 'ASC')
            ->addOrderBy('ph.id', 'ASC');

        if ($productId !== null) {
            $qb
                ->andWhere('p.id = :productId')
                ->setParameter('productId', $productId);
        }

        if ($listingId !== null) {
            $qb
                ->andWhere('pl.id = :listingId')
                ->setParameter('listingId', $listingId);
        }

        return $qb->getQuery()->getArrayResult();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function findRecentRowsByListing(
        \DateTimeImmutable $since,
    ): array {
        return $this->createQueryBuilder('ph')
            ->select('IDENTITY(ph.productListing) AS listingId')
            ->addSelect('ph.recorded_price AS recordedPrice')
            ->addSelect('ph.recorded_at AS recordedAt')
            ->addSelect('ph.out_of_stock AS outOfStock')
            ->addSelect('ph.anomaly AS anomaly')
            ->where('ph.recorded_at >= :since')
            ->setParameter('since', $since)
            ->orderBy('ph.recorded_at', 'ASC')
            ->addOrderBy('ph.id', 'ASC')
            ->getQuery()
            ->getArrayResult();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function findTrainingRows(): array
    {
        return $this->createQueryBuilder('ph')
            ->select('p.id AS productId')
            ->select('IDENTITY(ph.productListing) AS listingId')
            ->addSelect('ph.recorded_at AS recordedAt')
            ->addSelect('ph.recorded_price AS recordedPrice')
            ->addSelect('ph.out_of_stock AS outOfStock')
            ->addSelect('ph.anomaly AS anomaly')
            ->addSelect('pl.trust_score AS trustScore')
            ->join('ph.productListing', 'pl')
            ->leftJoin('pl.product', 'p')
            ->orderBy('ph.recorded_at', 'ASC')
            ->addOrderBy('ph.id', 'ASC')
            ->getQuery()
            ->getArrayResult();
    }

    //    /**
    //     * @return PriceHistory[] Returns an array of PriceHistory objects
    //     */
    //    public function findByExampleField($value): array
    //    {
    //        return $this->createQueryBuilder('p')
    //            ->andWhere('p.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->orderBy('p.id', 'ASC')
    //            ->setMaxResults(10)
    //            ->getQuery()
    //            ->getResult()
    //        ;
    //    }

    //    public function findOneBySomeField($value): ?PriceHistory
    //    {
    //        return $this->createQueryBuilder('p')
    //            ->andWhere('p.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->getQuery()
    //            ->getOneOrNullResult()
    //        ;
    //    }
}
