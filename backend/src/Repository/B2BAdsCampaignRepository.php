<?php

namespace App\Repository;

use App\Entity\B2BAdsCampaign;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<B2BAdsCampaign>
 */
class B2BAdsCampaignRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, B2BAdsCampaign::class);
    }
}
