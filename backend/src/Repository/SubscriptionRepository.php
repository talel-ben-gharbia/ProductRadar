<?php

namespace App\Repository;

use App\Entity\B2BCompany;
use App\Entity\B2BMarket;
use App\Entity\Customer;
use App\Entity\SubscriptionB2C;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<SubscriptionB2C>
 */
class SubscriptionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, SubscriptionB2C::class);
    }

    /**
     * @return array{items: SubscriptionB2C[], total: int}
     */
    public function paginateForAdmin(array $filters, int $limit, int $offset): array
    {
        $qb = $this->createQueryBuilder('s')
            ->leftJoin('s.client', 'u')
            ->addSelect('u')
            ->orderBy('s.start_date', 'DESC')
            ->addOrderBy('s.id', 'DESC')
            ->setFirstResult($offset)
            ->setMaxResults($limit);

        $countQb = $this->createQueryBuilder('s')
            ->leftJoin('s.client', 'u')
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

        $this->applyAccountTypeFilter($qb, 'u', (string) ($filters['accountType'] ?? ''));
        $this->applyAccountTypeFilter($countQb, 'u', (string) ($filters['accountType'] ?? ''));

        /** @var SubscriptionB2C[] $items */
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

    private function applyAccountTypeFilter(\Doctrine\ORM\QueryBuilder $qb, string $userAlias, string $accountTypeRaw): void
    {
        $accountType = strtoupper(trim($accountTypeRaw));
        if ($accountType === '') {
            return;
        }

        if ($accountType === 'B2B') {
            $qb->andWhere(sprintf('(%1$s INSTANCE OF %2$s OR %1$s INSTANCE OF %3$s)', $userAlias, B2BCompany::class, B2BMarket::class));
            return;
        }

        if ($accountType === 'B2C' || $accountType === 'CUSTOMER') {
            $qb->andWhere(sprintf('%s INSTANCE OF %s', $userAlias, Customer::class));
            return;
        }

        if ($accountType === 'B2B_COMPANY') {
            $qb->andWhere(sprintf('%s INSTANCE OF %s', $userAlias, B2BCompany::class));
            return;
        }

        if ($accountType === 'B2B_MARKET') {
            $qb->andWhere(sprintf('%s INSTANCE OF %s', $userAlias, B2BMarket::class));
        }
    }

    //    /**
    //     * @return Subscription[] Returns an array of Subscription objects
    //     */
    //    public function findByExampleField($value): array
    //    {
    //        return $this->createQueryBuilder('s')
    //            ->andWhere('s.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->orderBy('s.id', 'ASC')
    //            ->setMaxResults(10)
    //            ->getQuery()
    //            ->getResult()
    //        ;
    //    }

    //    public function findOneBySomeField($value): ?Subscription
    //    {
    //        return $this->createQueryBuilder('s')
    //            ->andWhere('s.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->getQuery()
    //            ->getOneOrNullResult()
    //        ;
    //    }
}
