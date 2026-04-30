<?php

namespace App\Repository;

use App\Entity\Seller;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Seller>
 */
class SellerRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Seller::class);
    }

    public function findOneByWebsiteHost(string $website): ?Seller
    {
        $requestedHost = $this->normalizeHost($website);
        if ($requestedHost === null) {
            return null;
        }

        /** @var Seller[] $sellers */
        $sellers = $this->findAll();
        foreach ($sellers as $seller) {
            $sellerHost = $this->normalizeHost((string) $seller->getUrl());
            if ($sellerHost === null) {
                continue;
            }

            if ($sellerHost === $requestedHost) {
                return $seller;
            }
        }

        return null;
    }

    private function normalizeHost(string $website): ?string
    {
        $value = strtolower(trim($website));
        if ($value === '') {
            return null;
        }

        $withScheme = preg_match('#^https?://#', $value) === 1 ? $value : 'https://' . $value;
        $host = parse_url($withScheme, PHP_URL_HOST);
        if (!is_string($host) || $host === '') {
            return null;
        }

        return preg_replace('/^www\./', '', $host);
    }

//    /**
//     * @return Seller[] Returns an array of Seller objects
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

//    public function findOneBySomeField($value): ?Seller
//    {
//        return $this->createQueryBuilder('s')
//            ->andWhere('s.exampleField = :val')
//            ->setParameter('val', $value)
//            ->getQuery()
//            ->getOneOrNullResult()
//        ;
//    }
}
