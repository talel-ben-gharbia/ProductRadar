<?php

namespace App\EventSubscriber;

use App\Entity\PriceHistory;
use App\Entity\ProductListing;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsDoctrineListener;
use Doctrine\ORM\Events;
use Doctrine\ORM\Event\OnFlushEventArgs;

#[AsDoctrineListener(Events::onFlush)]
final class PriceHistoryChangeSubscriber
{
    public function onFlush(OnFlushEventArgs $args): void
    {
        $em = $args->getObjectManager();
        $uow = $em->getUnitOfWork();
        $meta = $em->getClassMetadata(ProductListing::class);

        foreach ($uow->getScheduledEntityInsertions() as $entity) {
            if ($entity instanceof PriceHistory) {
                $this->markListingDirty($entity, $em, $uow, $meta);
            }
        }

        foreach ($uow->getScheduledEntityUpdates() as $entity) {
            if ($entity instanceof PriceHistory) {
                $this->markListingDirty($entity, $em, $uow, $meta);
            }
        }
    }

    private function markListingDirty(
        PriceHistory $priceHistory,
        $em,
        $uow,
        $meta,
    ): void {
        $listing = $priceHistory->getProductListing();
        if (!$listing || !$listing->getId()) {
            return;
        }

        $listing->setTrustScoreUpdatedAt(null);

        if (!$uow->isScheduledForUpdate($listing)) {
            $uow->scheduleForUpdate($listing);
        }

        $uow->recomputeSingleEntityChangeSet($meta, $listing);
    }
}
