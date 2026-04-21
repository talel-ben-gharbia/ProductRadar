<?php

namespace App\Repository;

use App\Entity\DataSource;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<DataSource>
 */
class DataSourceRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, DataSource::class);
    }

    /**
     * @return array{items: DataSource[], total: int}
     */
    public function paginateForAdmin(int $limit, int $offset, string $search = '', ?bool $isActive = null): array
    {
        $qb = $this->createQueryBuilder('ds')
            ->orderBy('ds.id', 'DESC')
            ->setFirstResult($offset)
            ->setMaxResults($limit);

        $countQb = $this->createQueryBuilder('ds')
            ->select('COUNT(ds.id)');

        if ($search !== '') {
            $needle = '%' . mb_strtolower($search) . '%';
            $where = "LOWER(ds.name) LIKE :search OR LOWER(ds.base_url) LIKE :search OR LOWER(ds.type) LIKE :search";
            $qb->andWhere($where)->setParameter('search', $needle);
            $countQb->andWhere($where)->setParameter('search', $needle);
        }

        if ($isActive !== null) {
            $qb->andWhere('ds.is_active = :isActive')->setParameter('isActive', $isActive);
            $countQb->andWhere('ds.is_active = :isActive')->setParameter('isActive', $isActive);
        }

        /** @var DataSource[] $items */
        $items = $qb->getQuery()->getResult();

        return [
            'items' => $items,
            'total' => (int) $countQb->getQuery()->getSingleScalarResult(),
        ];
    }
}
