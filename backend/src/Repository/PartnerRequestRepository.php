<?php

namespace App\Repository;

use App\Entity\PartnerRequest;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<PartnerRequest>
 */
class PartnerRequestRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, PartnerRequest::class);
    }

    /**
     * @return array{items: PartnerRequest[], total: int}
     */
    public function paginatePending(int $limit, int $offset, string $search = ''): array
    {
        $qb = $this->createQueryBuilder('pr')
            ->orderBy('pr.created_at', 'DESC')
            ->addOrderBy('pr.id', 'DESC')
            ->setFirstResult($offset)
            ->setMaxResults($limit);

        $countQb = $this->createQueryBuilder('pr')->select('COUNT(pr.id)');

        if ($search !== '') {
            $needle = '%' . mb_strtolower($search) . '%';
            $where = 'LOWER(pr.email) LIKE :search OR LOWER(pr.company_name) LIKE :search OR LOWER(pr.company_market) LIKE :search OR LOWER(pr.company_website) LIKE :search';
            $qb->andWhere($where)->setParameter('search', $needle);
            $countQb->andWhere($where)->setParameter('search', $needle);
        }

        /** @var PartnerRequest[] $items */
        $items = $qb->getQuery()->getResult();

        return [
            'items' => $items,
            'total' => (int) $countQb->getQuery()->getSingleScalarResult(),
        ];
    }
}
