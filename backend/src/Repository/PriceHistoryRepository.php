<?php

namespace App\Repository;

use App\Entity\PriceHistory;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\DBAL\ArrayParameterType;
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

        return $qb->getQuery()->setCacheable(true)->setLifetime(300)->getArrayResult();
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
            ->setCacheable(true)
            ->setLifetime(300)
            ->getArrayResult();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function findTrainingRows(): array
    {
        $rows = $this->createQueryBuilder('ph')
            ->select('p.id AS productId')
            ->addSelect('IDENTITY(ph.productListing) AS listingId')
            ->addSelect('ph.recorded_at AS recordedAt')
            ->addSelect('ph.recorded_price AS recordedPrice')
            ->addSelect('ph.out_of_stock AS outOfStock')
            ->addSelect('ph.anomaly AS anomaly')
            ->join('ph.productListing', 'pl')
            ->leftJoin('pl.product', 'p')
            ->orderBy('ph.recorded_at', 'ASC')
            ->addOrderBy('ph.id', 'ASC')
            ->getQuery()
            ->setCacheable(true)
            ->setLifetime(300)
            ->getArrayResult();

        $listingIds = array_values(array_unique(array_filter(
            array_map(fn(array $r) => isset($r['listingId']) ? (int) $r['listingId'] : null, $rows)
        )));
        $scoreMap = [];
        if (!empty($listingIds)) {
            $conn = $this->getEntityManager()->getConnection();
            $scoreRows = $conn->fetchAllAssociative(
                'SELECT DISTINCT ON (listing_id) listing_id, score
                 FROM trust_score_history
                 WHERE listing_id IN (:ids)
                 ORDER BY listing_id, created_at DESC',
                ['ids' => $listingIds],
                ['ids' => ArrayParameterType::INTEGER]
            );
            foreach ($scoreRows as $sr) {
                $scoreMap[(int) $sr['listing_id']] = $sr['score'] !== null ? (float) $sr['score'] : null;
            }
        }

        foreach ($rows as &$row) {
            $lid = isset($row['listingId']) ? (int) $row['listingId'] : null;
            $row['trustScore'] = $lid !== null && isset($scoreMap[$lid]) ? $scoreMap[$lid] : null;
        }

        return $rows;
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
