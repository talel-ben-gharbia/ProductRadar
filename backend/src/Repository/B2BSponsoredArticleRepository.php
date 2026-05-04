<?php

namespace App\Repository;

use App\Entity\B2BSponsoredArticle;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<B2BSponsoredArticle>
 */
class B2BSponsoredArticleRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, B2BSponsoredArticle::class);
    }
}
