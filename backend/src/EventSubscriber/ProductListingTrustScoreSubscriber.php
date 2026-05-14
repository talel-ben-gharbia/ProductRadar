<?php

namespace App\EventSubscriber;

use App\Entity\ProductListing;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsDoctrineListener;
use Doctrine\ORM\Events;
use Doctrine\ORM\Event\PostLoadEventArgs;

#[AsDoctrineListener(Events::postLoad)]
final class ProductListingTrustScoreSubscriber
{
    public function postLoad(PostLoadEventArgs $args): void
    {
        $entity = $args->getObject();
        if (!$entity instanceof ProductListing || !$entity->getId()) {
            return;
        }

        $em = $args->getObjectManager();
        $conn = $em->getConnection();
        $row = $conn->fetchAssociative(
            'SELECT score, breakdown, created_at FROM trust_score_history WHERE listing_id = ? ORDER BY created_at DESC LIMIT 1',
            [$entity->getId()]
        );

        if ($row) {
            $entity->setTrustScore($row['score'] !== null ? (float) $row['score'] : null);
            $entity->setTrustScoreBreakdown($row['breakdown'] !== null ? json_decode($row['breakdown'], true) : null);
            $entity->setTrustScoreUpdatedAt(
                $row['created_at'] !== null ? new \DateTimeImmutable($row['created_at']) : null
            );
        }
    }
}
