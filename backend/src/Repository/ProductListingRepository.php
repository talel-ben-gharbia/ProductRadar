<?php

namespace App\Repository;

use App\Entity\ProductListing;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
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
    public function findListingRows(?int $productId = null, ?int $sellerId = null): array
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

        return $queryBuilder
            ->orderBy('pl.id', 'DESC')
            ->getQuery()
            ->getArrayResult();
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

        $rows = $queryBuilder->getQuery()->getArrayResult();

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
            ->addSelect('pl.trust_score AS trust_score')
                ->addSelect('pl.trust_score_breakdown AS trust_score_breakdown')
                ->addSelect('pl.created_at AS created_at')
                ->addSelect('pl.updated_at AS updated_at')
            ->addSelect('pl.is_active AS is_active')
            ->addSelect('p.id AS productId')
            ->addSelect('p.name AS productName')
                ->addSelect('p.brand AS productBrand')
            ->addSelect('p.image_url AS productImageUrl')
                ->addSelect('c.id AS categoryId')
                ->addSelect('c.name AS categoryName')
            ->addSelect('s.id AS sellerId')
            ->addSelect('s.name AS sellerName')
            ->leftJoin('pl.product', 'p')
                ->leftJoin('p.category', 'c')
                ->leftJoin('pl.seller', 's');
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
            ->where('LOWER(p.brand) = :brand')
            ->setParameter('brand', mb_strtolower(trim($brandName)))
            ->getQuery()
            ->getResult();
    }
}
