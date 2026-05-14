<?php

namespace App\Repository;

use App\Entity\Subscription;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Subscription>
 */
class SubscriptionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Subscription::class);
    }

    public function findActiveByOwner(string $ownerType, int $ownerId): ?Subscription
    {
        return $this->findOneBy([
            'owner_type' => $ownerType,
            'owner_id' => $ownerId,
            'active' => true,
        ]);
    }

    /**
     * @return Subscription[]
     */
    public function findByOwner(string $ownerType, int $ownerId): array
    {
        return $this->findBy([
            'owner_type' => $ownerType,
            'owner_id' => $ownerId,
        ]);
    }

    /**
     * @return array{items: Subscription[], total: int}
     */
    public function paginateForAdmin(array $filters, int $limit, int $offset): array
    {
        $qb = $this->createQueryBuilder('s')
            ->orderBy('s.start_date', 'DESC')
            ->addOrderBy('s.id', 'DESC')
            ->setFirstResult($offset)
            ->setMaxResults($limit);

        $countQb = $this->createQueryBuilder('s')
            ->select('COUNT(s.id)');

        if (!empty($filters['planType'])) {
            $planType = strtoupper((string) $filters['planType']);
            if ($planType === 'PREMIUM') {
                $qb->andWhere('UPPER(s.plan_type) LIKE :planTypePremium')->setParameter('planTypePremium', 'PREMIUM%');
                $countQb->andWhere('UPPER(s.plan_type) LIKE :planTypePremium')->setParameter('planTypePremium', 'PREMIUM%');
            } else {
                $qb->andWhere('UPPER(s.plan_type) = :planType')->setParameter('planType', $planType);
                $countQb->andWhere('UPPER(s.plan_type) = :planType')->setParameter('planType', $planType);
            }
        }

        if (array_key_exists('active', $filters) && $filters['active'] !== null && $filters['active'] !== '') {
            $active = filter_var($filters['active'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($active !== null) {
                $qb->andWhere('s.active = :active')->setParameter('active', $active);
                $countQb->andWhere('s.active = :active')->setParameter('active', $active);
            }
        }

        /** @var Subscription[] $items */
        $items = $qb->getQuery()->getResult();

        $total = (int) $countQb->getQuery()->getSingleScalarResult();

        return [
            'items' => $items,
            'total' => $total,
        ];
    }

    /**
     * @return array{total: int, active: int, premium: int, free: int}
     */
    public function getAdminStats(): array
    {
        $result = $this->createQueryBuilder('s')
            ->select(
                'COUNT(s.id) AS total',
                'SUM(CASE WHEN s.active = true THEN 1 ELSE 0 END) AS activeCount',
                'SUM(CASE WHEN UPPER(s.plan_type) LIKE :premiumPrefix THEN 1 ELSE 0 END) AS premiumCount'
            )
            ->setParameter('premiumPrefix', 'PREMIUM%')
            ->getQuery()
            ->getSingleResult();

        $total = (int) ($result['total'] ?? 0);
        $active = (int) ($result['activeCount'] ?? 0);
        $premium = (int) ($result['premiumCount'] ?? 0);

        return [
            'total' => $total,
            'active' => $active,
            'premium' => $premium,
            'free' => max(0, $total - $premium),
        ];
    }
}
