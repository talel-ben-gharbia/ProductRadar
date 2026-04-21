<?php

namespace App\Repository;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<User>
 */
class UserRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    /**
     * @return array{
     *     total: int,
     *     b2c: int,
     *     b2b_company: int,
     *     b2b_market: int,
     *     active: int,
     *     suspended: int,
     *     banned: int
     * }
     */
    public function getAdminStats(): array
    {
        $sql = <<<'SQL'
            SELECT
                COUNT(u.id) AS total,
                SUM(CASE WHEN u.type = 'customer' THEN 1 ELSE 0 END) AS b2c,
                SUM(CASE WHEN u.type = 'b2b_company' THEN 1 ELSE 0 END) AS b2b_company,
                SUM(CASE WHEN u.type = 'b2b_market' THEN 1 ELSE 0 END) AS b2b_market,
                SUM(CASE WHEN u.account_status = 'ACTIVE' THEN 1 ELSE 0 END) AS active,
                SUM(CASE WHEN u.account_status = 'SUSPENDED' THEN 1 ELSE 0 END) AS suspended,
                SUM(CASE WHEN u.account_status = 'BANNED' THEN 1 ELSE 0 END) AS banned
            FROM "user" u
        SQL;

        $result = $this->getEntityManager()->getConnection()->fetchAssociative($sql) ?: [];

        return [
            'total' => (int) ($result['total'] ?? 0),
            'b2c' => (int) ($result['b2c'] ?? 0),
            'b2b_company' => (int) ($result['b2b_company'] ?? 0),
            'b2b_market' => (int) ($result['b2b_market'] ?? 0),
            'active' => (int) ($result['active'] ?? 0),
            'suspended' => (int) ($result['suspended'] ?? 0),
            'banned' => (int) ($result['banned'] ?? 0),
        ];
    }

    /**
     * @return array{items: User[], total: int}
     */
    public function paginateForAdmin(array $filters, int $limit, int $offset): array
    {
        $connection = $this->getEntityManager()->getConnection();

        $where = [];
        $params = [];

        $search = trim((string) ($filters['search'] ?? ''));
        if ($search !== '') {
            $where[] = "(LOWER(u.email) LIKE :search OR LOWER(COALESCE(c.full_name, bc.full_name, bm.full_name, '')) LIKE :search OR LOWER(COALESCE(bc.company_name, bm.company_name, '')) LIKE :search OR LOWER(COALESCE(bc.company_market, bm.company_market, '')) LIKE :search OR LOWER(COALESCE(bc.company_website, bm.company_website, '')) LIKE :search)";
            $params['search'] = '%' . mb_strtolower($search) . '%';
        }

        $accountType = strtoupper(trim((string) ($filters['accountType'] ?? '')));
        if ($accountType !== '') {
            if ($accountType === 'B2B') {
                $where[] = "u.type IN ('b2b_company', 'b2b_market')";
            } elseif ($accountType === 'B2C' || $accountType === 'CUSTOMER') {
                $where[] = "u.type = 'customer'";
            } elseif ($accountType === 'B2B_COMPANY') {
                $where[] = "u.type = 'b2b_company'";
            } elseif ($accountType === 'B2B_MARKET') {
                $where[] = "u.type = 'b2b_market'";
            }
        }

        $status = strtoupper(trim((string) ($filters['status'] ?? '')));
        if ($status !== '') {
            $where[] = 'u.account_status = :status';
            $params['status'] = $status;
        }

        $b2bStatus = strtoupper(trim((string) ($filters['b2bStatus'] ?? '')));
        if ($b2bStatus !== '') {
            $where[] = "((u.type = 'b2b_company' AND bc.b2b_status = :b2bStatus) OR (u.type = 'b2b_market' AND bm.b2b_status = :b2bStatus))";
            $params['b2bStatus'] = $b2bStatus;
        }

        $baseFrom = ' FROM "user" u LEFT JOIN customer c ON c.id = u.id LEFT JOIN b2b_company bc ON bc.id = u.id LEFT JOIN b2b_market bm ON bm.id = u.id ';
        $whereSql = count($where) > 0 ? ' WHERE ' . implode(' AND ', $where) : '';

        $totalSql = 'SELECT COUNT(u.id)' . $baseFrom . $whereSql;
        $total = (int) $connection->fetchOne($totalSql, $params);

        if ($total === 0) {
            return ['items' => [], 'total' => 0];
        }

        $idsSql = 'SELECT u.id' . $baseFrom . $whereSql . ' ORDER BY COALESCE(c.joined_at, bc.joined_at, bm.joined_at) DESC NULLS LAST, u.id DESC LIMIT :limit OFFSET :offset';
        $ids = array_map(
            static fn (mixed $id): int => (int) $id,
            $connection->fetchFirstColumn($idsSql, array_merge($params, ['limit' => $limit, 'offset' => $offset]))
        );

        if (count($ids) === 0) {
            return ['items' => [], 'total' => $total];
        }

        /** @var User[] $fetched */
        $fetched = $this->findBy(['id' => $ids]);
        $byId = [];
        foreach ($fetched as $user) {
            $userId = $user->getId();
            if ($userId !== null) {
                $byId[$userId] = $user;
            }
        }

        $ordered = [];
        foreach ($ids as $id) {
            if (isset($byId[$id])) {
                $ordered[] = $byId[$id];
            }
        }

        return [
            'items' => $ordered,
            'total' => $total,
        ];
    }

    //    /**
    //     * @return User[] Returns an array of User objects
    //     */
    //    public function findByExampleField($value): array
    //    {
    //        return $this->createQueryBuilder('u')
    //            ->andWhere('u.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->orderBy('u.id', 'ASC')
    //            ->setMaxResults(10)
    //            ->getQuery()
    //            ->getResult()
    //        ;
    //    }

    //    public function findOneBySomeField($value): ?User
    //    {
    //        return $this->createQueryBuilder('u')
    //            ->andWhere('u.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->getQuery()
    //            ->getOneOrNullResult()
    //        ;
    //    }

    /**
     * Find a user by Firebase UID with subscription eager-loaded
     */
    public function findOneWithSubscriptionByFirebaseUid(string $firebaseUid): ?User
    {
        return $this->createQueryBuilder('u')
            ->leftJoin('u.subscription', 's')
            ->addSelect('s')
            ->andWhere('u.firebase_uid = :firebaseUid')
            ->setParameter('firebaseUid', $firebaseUid)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
