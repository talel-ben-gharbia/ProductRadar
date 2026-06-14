<?php

namespace App\Repository;

use App\Entity\Product;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class ProductRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Product::class);
    }

    public function findWithListingsAndSellers(int $id): ?Product
    {
        return $this->createQueryBuilder('p')
            ->leftJoin('p.productListings', 'pl')
            ->addSelect('pl')
            ->leftJoin('pl.seller', 's')
            ->addSelect('s')
            ->where('p.id = :id')
            ->setParameter('id', $id)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
