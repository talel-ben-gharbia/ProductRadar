<?php

namespace App\Repository;

use App\Entity\AdminActivityLog;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<AdminActivityLog>
 */
class AdminActivityLogRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, AdminActivityLog::class);
    }

    /**
     * @return array{items: AdminActivityLog[], total: int}
     */
    public function paginateForAdmin(
        int $limit,
        int $offset,
        string $search = '',
        string $entityType = '',
        string $action = '',
    ): array {
        $qb = $this->createQueryBuilder('log')
            ->leftJoin('log.admin', 'admin')
            ->addSelect('admin')
            ->orderBy('log.createdAt', 'DESC')
            ->addOrderBy('log.id', 'DESC')
            ->setFirstResult($offset)
            ->setMaxResults($limit);

        $countQb = $this->createQueryBuilder('log')
            ->leftJoin('log.admin', 'admin')
            ->select('COUNT(log.id)');

        if ($entityType !== '') {
            $normalizedEntityType = strtoupper($entityType);
            $qb->andWhere('log.entityType = :entityType')->setParameter('entityType', $normalizedEntityType);
            $countQb->andWhere('log.entityType = :entityType')->setParameter('entityType', $normalizedEntityType);
        }

        if ($action !== '') {
            $normalizedAction = strtoupper($action);
            $qb->andWhere('log.action = :action')->setParameter('action', $normalizedAction);
            $countQb->andWhere('log.action = :action')->setParameter('action', $normalizedAction);
        }

        if ($search !== '') {
            $needle = '%' . mb_strtolower($search) . '%';
            $where = "LOWER(COALESCE(admin.email, '')) LIKE :search OR LOWER(COALESCE(log.action, '')) LIKE :search OR LOWER(COALESCE(log.entityType, '')) LIKE :search";
            $qb->andWhere($where)->setParameter('search', $needle);
            $countQb->andWhere($where)->setParameter('search', $needle);
        }

        /** @var AdminActivityLog[] $items */
        $items = $qb->getQuery()->getResult();

        return [
            'items' => $items,
            'total' => (int) $countQb->getQuery()->getSingleScalarResult(),
        ];
    }
}
