<?php

namespace App\EventSubscriber;

use App\Entity\ProductListing;
use App\Service\TrustScoreCalculationService;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsDoctrineListener;
use Doctrine\ORM\Events;
use Doctrine\ORM\Event\PostPersistEventArgs;

#[AsDoctrineListener(Events::postPersist)]
final class ProductListingChangeSubscriber
{
    public function __construct(
        private readonly TrustScoreCalculationService $trustScoreService,
    ) {}

    /**
     * When a new listing is created, calculate its initial trust score immediately.
     * This runs once and won't recurse (postPersist can't re-trigger postPersist).
     */
    public function postPersist(PostPersistEventArgs $args): void
    {
        $entity = $args->getObject();
        if (!$entity instanceof ProductListing || $entity->isActive() === false) {
            return;
        }

        $this->trustScoreService->calculateAndUpdateListing($entity);
        $args->getObjectManager()->flush();
    }
}
