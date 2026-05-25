<?php

namespace App\Repository;

use App\Entity\ProductListing;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\DBAL\ArrayParameterType;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ProductListing>
 */
class ProductListingRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ProductListing::class);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    /**
     * @param int|null $productId
     * @param int|null $sellerId
     * @param int $page 1-based page number
     * @param int $limit number of items per page
     * @return array<int, array<string, mixed>>
     */
    public function findListingRows(?int $productId = null, ?int $sellerId = null, int $page = 1, int $limit = 0): array
    {
        $queryBuilder = $this->createBaseRowsQueryBuilder();

        if ($productId !== null && $productId > 0) {
            $queryBuilder
                ->andWhere('p.id = :productId')
                ->setParameter('productId', $productId);
        }

        if ($sellerId !== null && $sellerId > 0) {
            $queryBuilder
                ->andWhere('s.id = :sellerId')
                ->setParameter('sellerId', $sellerId);
        }

        // Apply ordering and pagination to bound memory usage.
        $query = $queryBuilder->orderBy('pl.id', 'DESC')->getQuery();

        // Normalize page/limit; limit=0 means no limit
        $page = max(1, $page);
        if ($limit > 0) {
            $limit = min(5000, $limit);
            $offset = ($page - 1) * $limit;
            $query->setFirstResult($offset)->setMaxResults($limit);
        }

        $rows = $query->setCacheable(true)->setLifetime(300)->getArrayResult();

        return $this->enrichWithTrustScores($rows);
    }

    public function findListingRowsByBrandId(int $brandId, ?int $marketSellerId = null, int $page = 1, int $limit = 0): array
    {
        $queryBuilder = $this->createBaseRowsQueryBuilder();

        $queryBuilder
            ->andWhere('b.id = :brandId')
            ->setParameter('brandId', $brandId);

        if ($marketSellerId !== null && $marketSellerId > 0) {
            $queryBuilder
                ->orWhere('s.id = :sellerId')
                ->setParameter('sellerId', $marketSellerId);
        }

        $query = $queryBuilder->orderBy('pl.id', 'DESC')->getQuery();

        // Normalize page/limit; limit=0 means no limit
        $page = max(1, $page);
        if ($limit > 0) {
            $limit = min(5000, $limit);
            $offset = ($page - 1) * $limit;
            $query->setFirstResult($offset)->setMaxResults($limit);
        }

        $rows = $query->setCacheable(true)->setLifetime(300)->getArrayResult();

        return $this->enrichWithTrustScores($rows);
    }

    

    /**
     * Return one best listing per seller for the target product.
        * Matching priority: id, then name+description, then name, then description.
     *
     * @return array<int, array<string, mixed>>
     */
    public function findBestComparableRowsPerSeller(int $productId, ?int $sellerId = null): array
    {
        $entityManager = $this->getEntityManager();
        $targetProduct = $entityManager
            ->createQueryBuilder()
            ->select('p.id AS id, p.name AS name, p.description AS description')
            ->from('App\\Entity\\Product', 'p')
            ->where('p.id = :productId')
            ->setParameter('productId', $productId)
            ->getQuery()
            ->getOneOrNullResult();

        if (!$targetProduct) {
            return [];
        }

        $targetName = mb_strtolower(trim((string) ($targetProduct['name'] ?? '')));
        $targetDescription = trim((string) ($targetProduct['description'] ?? ''));

        $queryBuilder = $this->createBaseRowsQueryBuilder()
            ->addSelect(
                "CASE\n" .
                " WHEN p.id = :targetProductId THEN 5\n" .
                " WHEN LOWER(p.name) = :targetName AND p.description = :targetDescription THEN 3\n" .
                " WHEN LOWER(p.name) = :targetName THEN 2\n" .
                " WHEN p.description = :targetDescription THEN 1\n" .
                " ELSE 0 END AS HIDDEN matchRank"
            )
            ->andWhere('p.id = :targetProductId OR LOWER(p.name) = :targetName OR p.description = :targetDescription')
            ->setParameter('targetProductId', $productId)
            ->setParameter('targetName', $targetName)
            ->setParameter('targetDescription', $targetDescription)
            ->orderBy('s.id', 'ASC')
            ->addOrderBy('matchRank', 'DESC')
            ->addOrderBy('pl.id', 'DESC');

        if ($sellerId !== null && $sellerId > 0) {
            $queryBuilder
                ->andWhere('s.id = :sellerId')
                ->setParameter('sellerId', $sellerId);
        }

            $rows = $queryBuilder->getQuery()->setCacheable(true)->setLifetime(300)->getArrayResult();
        $rows = $this->enrichWithTrustScores($rows);

        $bestPerSeller = [];
        foreach ($rows as $row) {
            $currentSellerId = $row['sellerId'] ?? null;
            if ($currentSellerId === null) {
                continue;
            }

            if (!array_key_exists((string) $currentSellerId, $bestPerSeller)) {
                $bestPerSeller[(string) $currentSellerId] = $row;
            }
        }

        return array_values($bestPerSeller);
    }

    private function createBaseRowsQueryBuilder(): QueryBuilder
    {
        return $this->createQueryBuilder('pl')
            ->select('pl.id AS id')
            ->addSelect('pl.ref AS ref')
            ->addSelect('pl.price AS price')
            ->addSelect('pl.old_price AS old_price')
            ->addSelect('pl.product_url AS product_url')
            ->addSelect('pl.availability AS availability')
            ->addSelect('pl.created_at AS created_at')
            ->addSelect('pl.updated_at AS updated_at')
            ->addSelect('pl.is_active AS is_active')
            ->addSelect('p.id AS productId')
            ->addSelect('p.name AS productName')
            ->addSelect('COALESCE(b.name, p.brand) AS productBrand')
            ->addSelect('p.image_url AS productImageUrl')
            ->addSelect('IDENTITY(p.brandEntity) AS brandId')
            ->addSelect('c.id AS categoryId')
            ->addSelect('c.name AS categoryName')
            ->addSelect('s.id AS sellerId')
            ->addSelect('s.name AS sellerName')
            ->leftJoin('pl.product', 'p')
            ->leftJoin('p.brandEntity', 'b')
            ->leftJoin('p.category', 'c')
            ->leftJoin('pl.seller', 's');
    }

    private function enrichWithTrustScores(array $rows): array
    {
        $listingIds = array_values(array_unique(array_filter(
            array_map(fn(array $r) => isset($r['id']) ? (int) $r['id'] : null, $rows)
        )));

        if (empty($listingIds)) {
            return $rows;
        }

        $conn = $this->getEntityManager()->getConnection();

        $scoreRows = $conn->fetchAllAssociative(
            'SELECT DISTINCT ON (listing_id) listing_id, score, breakdown
             FROM trust_score_history
             WHERE listing_id IN (:ids)
             ORDER BY listing_id, created_at DESC',
            ['ids' => $listingIds],
            ['ids' => ArrayParameterType::INTEGER]
        );

        $scoreMap = [];
        foreach ($scoreRows as $sr) {
            $scoreMap[(int) $sr['listing_id']] = [
                'score' => $sr['score'] !== null ? (float) $sr['score'] : null,
                'breakdown' => $sr['breakdown'] !== null ? json_decode($sr['breakdown'], true) : null,
            ];
        }

        foreach ($rows as &$row) {
            $id = isset($row['id']) ? (int) $row['id'] : null;
            if ($id !== null && isset($scoreMap[$id])) {
                $row['trust_score'] = $scoreMap[$id]['score'];
                $row['trust_score_breakdown'] = $scoreMap[$id]['breakdown'];
            } else {
                $row['trust_score'] = null;
                $row['trust_score_breakdown'] = null;
            }
        }

        return $rows;
    }

//    /**
//     * @return ProductListing[] Returns an array of ProductListing objects
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

    /**
     * @return ProductListing[]
     */
    public function findByBrandName(string $brandName): array
    {
        return $this->createQueryBuilder('pl')
            ->join('pl.product', 'p')
            ->leftJoin('p.brandEntity', 'b')
            ->where('LOWER(COALESCE(b.name, p.brand)) = :brand')
            ->setParameter('brand', mb_strtolower(trim($brandName)))
            ->getQuery()
            ->getResult();
    }
}
