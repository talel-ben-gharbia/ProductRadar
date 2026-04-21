<?php

namespace App\Repository;

use App\Entity\Customer;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Customer>
 */
class CustomerRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Customer::class);
    }

    /**
     * @return array{items: Customer[], total: int}
     */
    public function paginateForAdmin(array $filters, int $limit, int $offset): array
    {
        $qb = $this->createQueryBuilder('c')
            ->leftJoin('c.subscription', 's')
            ->addSelect('s')
            ->orderBy('c.joinedAt', 'DESC')
            ->addOrderBy('c.id', 'DESC')
            ->setFirstResult($offset)
            ->setMaxResults($limit);

        $countQb = $this->createQueryBuilder('c')
            ->select('COUNT(c.id)');

        if (!empty($filters['search'])) {
            $qb->andWhere('LOWER(c.email) LIKE :search OR LOWER(c.full_name) LIKE :search')
                ->setParameter('search', '%' . strtolower((string) $filters['search']) . '%');

            $countQb->andWhere('LOWER(c.email) LIKE :search OR LOWER(c.full_name) LIKE :search')
                ->setParameter('search', '%' . strtolower((string) $filters['search']) . '%');
        }

        if (!empty($filters['accountType'])) {
            $accountType = strtoupper((string) $filters['accountType']);

            if ($accountType !== 'B2C' && $accountType !== 'CUSTOMER') {
                return ['items' => [], 'total' => 0];
            }
        }

        if (!empty($filters['status'])) {
            $qb->andWhere('c.account_status = :status')
                ->setParameter('status', strtoupper((string) $filters['status']));

            $countQb->andWhere('c.account_status = :status')
                ->setParameter('status', strtoupper((string) $filters['status']));
        }

        if (!empty($filters['b2bStatus'])) {
            return ['items' => [], 'total' => 0];
        }

        /** @var Customer[] $items */
        $items = $qb->getQuery()->getResult();

        return [
            'items' => $items,
            'total' => (int) $countQb->getQuery()->getSingleScalarResult(),
        ];
    }

    /**
     * @return array{items: Customer[], total: int}
     */
    public function paginatePendingB2B(int $limit, int $offset, ?string $search = null): array
    {
        return [
            'items' => [],
            'total' => 0,
        ];
    }

    //    /**
    //     * @return Customer[] Returns an array of Customer objects
    //     */
    //    public function findByExampleField($value): array
    //    {
    //        return $this->createQueryBuilder('c')
    //            ->andWhere('c.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->orderBy('c.id', 'ASC')
    //            ->setMaxResults(10)
    //            ->getQuery()
    //            ->getResult()
    //        ;
    //    }

    //    public function findOneBySomeField($value): ?Customer
    //    {
    //        return $this->createQueryBuilder('c')
    //            ->andWhere('c.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->getQuery()
    //            ->getOneOrNullResult()
    //        ;
    //    }
}
