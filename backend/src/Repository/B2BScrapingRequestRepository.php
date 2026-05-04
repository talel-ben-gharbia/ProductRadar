<?php

namespace App\Repository;

use App\Entity\B2BScrapingRequest;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<B2BScrapingRequest>
 */
class B2BScrapingRequestRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, B2BScrapingRequest::class);
    }
}
