<?php

namespace App\EventSubscriber;

use App\Entity\B2BCompany;
use App\Entity\ProductListing;
use App\Service\B2BNotificationService;
use App\Service\TrustScoreCalculationService;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsDoctrineListener;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Events;
use Doctrine\ORM\Event\PostPersistEventArgs;
use Doctrine\ORM\Event\PostUpdateEventArgs;

#[AsDoctrineListener(Events::postPersist)]
#[AsDoctrineListener(Events::postUpdate)]
final class ProductListingChangeSubscriber
{
    public function __construct(
        private readonly TrustScoreCalculationService $trustScoreService,
        private readonly B2BNotificationService $notificationService,
        private readonly EntityManagerInterface $entityManager,
    ) {}

    public function postPersist(PostPersistEventArgs $args): void
    {
        $entity = $args->getObject();
        if (!$entity instanceof ProductListing || $entity->isActive() === false) {
            return;
        }

        $result = $this->trustScoreService->calculateAndUpdateListing($entity);
        $args->getObjectManager()->flush();
        $this->checkTrustDrop($entity, $result);
    }

    public function postUpdate(PostUpdateEventArgs $args): void
    {
        $entity = $args->getObject();
        if (!$entity instanceof ProductListing || $entity->isActive() === false) {
            return;
        }

        $changeSet = $args->getObjectManager()->getUnitOfWork()->getEntityChangeSet($entity);
        $relevantFields = ['price', 'old_price', 'availability', 'is_active'];
        $hasRelevantChange = !empty(array_intersect($relevantFields, array_keys($changeSet)));

        if ($hasRelevantChange) {
            $result = $this->trustScoreService->calculateAndUpdateListing($entity);
            $args->getObjectManager()->flush();
            $this->checkTrustDrop($entity, $result);
        }
    }

    private function checkTrustDrop(ProductListing $listing, array $result): void
    {
        if (!isset($result['delta']) || $result['delta'] >= 0) {
            return;
        }
        $delta = (float) $result['delta'];
        if ($delta > -10) {
            return;
        }
        $seller = $listing->getSeller();
        if ($seller === null) {
            return;
        }
        $company = $this->entityManager->getRepository(B2BCompany::class)->findOneBy(['seller' => $seller]);
        if ($company === null) {
            return;
        }

        $this->notificationService->alertTrustDrop(
            $company,
            $listing,
            (float) ($result['old_score'] ?? 0),
            (float) ($result['new_score'] ?? 0),
            $result['breakdown_changes'] ?? []
        );
    }
}
