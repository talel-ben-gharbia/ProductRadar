<?php

namespace App\Repository;

use App\Entity\Review;
use Doctrine\DBAL\Types\Types;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Review>
 */
class ReviewRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Review::class);
    }

    /**
     * @return array{items: Review[], total: int}
     */
    public function paginateForAdmin(int $limit, int $offset, string $status = '', string $search = ''): array
    {
        $qb = $this->createQueryBuilder('r')
            ->leftJoin('r.client', 'u')
            ->addSelect('u')
            ->leftJoin('r.productListing', 'pl')
            ->addSelect('pl')
            ->leftJoin('pl.product', 'p')
            ->addSelect('p')
            ->orderBy('r.created_at', 'DESC')
            ->addOrderBy('r.id', 'DESC')
            ->setFirstResult($offset)
            ->setMaxResults($limit);

        $countQb = $this->createQueryBuilder('r')
            ->leftJoin('r.client', 'u')
            ->leftJoin('r.productListing', 'pl')
            ->leftJoin('pl.product', 'p')
            ->select('COUNT(r.id)');

        if ($status !== '') {
            $normalizedStatus = strtoupper($status);
            $qb->andWhere('r.status = :status')->setParameter('status', $normalizedStatus);
            $countQb->andWhere('r.status = :status')->setParameter('status', $normalizedStatus);
        }

        if ($search !== '') {
            $needle = '%' . mb_strtolower($search) . '%';
            $where = "LOWER(COALESCE(u.email, '')) LIKE :search OR LOWER(COALESCE(p.name, '')) LIKE :search OR LOWER(COALESCE(r.comment, '')) LIKE :search";
            $qb->andWhere($where)->setParameter('search', $needle);
            $countQb->andWhere($where)->setParameter('search', $needle);
        }

        /** @var Review[] $items */
        $items = $qb->getQuery()->getResult();

        return [
            'items' => $items,
            'total' => (int) $countQb->getQuery()->getSingleScalarResult(),
        ];
    }

    /**
     * @return Review[]
     */
    public function exportForAdmin(string $status = '', string $search = ''): array
    {
        $qb = $this->createQueryBuilder('r')
            ->leftJoin('r.client', 'u')
            ->addSelect('u')
            ->leftJoin('r.productListing', 'pl')
            ->addSelect('pl')
            ->leftJoin('pl.product', 'p')
            ->addSelect('p')
            ->orderBy('r.created_at', 'DESC')
            ->addOrderBy('r.id', 'DESC');

        if ($status !== '') {
            $qb->andWhere('r.status = :status')->setParameter('status', strtoupper($status));
        }

        if ($search !== '') {
            $needle = '%' . mb_strtolower($search) . '%';
            $where = "LOWER(COALESCE(u.email, '')) LIKE :search OR LOWER(COALESCE(p.name, '')) LIKE :search OR LOWER(COALESCE(r.comment, '')) LIKE :search";
            $qb->andWhere($where)->setParameter('search', $needle);
        }

        /** @var Review[] $items */
        return $qb->getQuery()->getResult();
    }

    public function getAnalytics(): array
    {
        $total = (int) $this->createQueryBuilder('r')
            ->select('COUNT(r.id)')
            ->getQuery()
            ->setCacheable(true)
            ->setLifetime(300)
            ->getSingleScalarResult();

        $approved = (int) $this->createQueryBuilder('r')
            ->select('COUNT(r.id)')
            ->andWhere('r.status = :status')
            ->setParameter('status', 'APPROVED')
            ->getQuery()
            ->setCacheable(true)
            ->setLifetime(300)
            ->getSingleScalarResult();

        $rejected = (int) $this->createQueryBuilder('r')
            ->select('COUNT(r.id)')
            ->andWhere('r.status = :status')
            ->setParameter('status', 'REJECTED')
            ->getQuery()
            ->setCacheable(true)
            ->setLifetime(300)
            ->getSingleScalarResult();

        $pending = (int) $this->createQueryBuilder('r')
            ->select('COUNT(r.id)')
            ->andWhere('r.status = :status')
            ->setParameter('status', 'PENDING')
            ->getQuery()
            ->setCacheable(true)
            ->setLifetime(300)
            ->getSingleScalarResult();

        $avgRating = $this->createQueryBuilder('r')
            ->select('AVG(r.rating)')
            ->getQuery()
            ->setCacheable(true)
            ->setLifetime(300)
            ->getSingleScalarResult() ?? 0;

        $approvalRate = $total > 0 ? round(($approved / $total) * 100, 2) : 0;

        return [
            'total' => $total,
            'approved' => $approved,
            'rejected' => $rejected,
            'pending' => $pending,
            'approval_rate' => $approvalRate,
            'average_rating' => round((float) $avgRating, 2),
        ];
    }

    /**
     * @return array<array{rating: int, count: int}>
     */
    public function getRatingDistribution(): array
    {
        return $this->createQueryBuilder('r')
            ->select('r.rating as rating, COUNT(r.id) as count')
            ->groupBy('r.rating')
            ->orderBy('r.rating', 'ASC')
            ->getQuery()
            ->setCacheable(true)
            ->setLifetime(300)
            ->getResult();
    }

    /**
     * @return array<array{date: string, count: int}>
     */
    public function getReviewsPerDay(int $days = 30): array
    {
        $safeDays = max(1, $days);
        $since = new \DateTimeImmutable(sprintf('-%d days', $safeDays));

        $sql = <<<'SQL'
            SELECT
                TO_CHAR(DATE_TRUNC('day', r.created_at), 'YYYY-MM-DD') AS date,
                COUNT(r.id) AS count
            FROM review r
            WHERE r.created_at >= :since
            GROUP BY DATE_TRUNC('day', r.created_at)
            ORDER BY DATE_TRUNC('day', r.created_at) ASC
        SQL;

        $rows = $this->getEntityManager()->getConnection()->fetchAllAssociative(
            $sql,
            ['since' => $since],
            ['since' => Types::DATETIME_IMMUTABLE],
        );

        return array_map(
            static fn (array $row): array => [
                'date' => (string) ($row['date'] ?? ''),
                'count' => (int) ($row['count'] ?? 0),
            ],
            $rows,
        );
    }
}
