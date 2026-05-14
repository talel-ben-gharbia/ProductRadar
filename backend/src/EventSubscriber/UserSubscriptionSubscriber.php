<?php

namespace App\EventSubscriber;

use App\Entity\B2BCompany;
use App\Entity\B2BMarket;
use App\Entity\Subscription;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsDoctrineListener;
use Doctrine\ORM\Events;
use Doctrine\ORM\Event\PostLoadEventArgs;

#[AsDoctrineListener(Events::postLoad)]
final class UserSubscriptionSubscriber
{
    public function postLoad(PostLoadEventArgs $args): void
    {
        $entity = $args->getObject();
        if (!$entity instanceof User || $entity instanceof B2BCompany || $entity instanceof B2BMarket) {
            return;
        }

        $id = $entity->getId();
        if ($id === null) {
            return;
        }

        $em = $args->getObjectManager();
        $subscription = $em->getRepository(Subscription::class)->findOneBy(
            ['owner_type' => 'USER', 'owner_id' => $id],
            ['created_at' => 'DESC', 'id' => 'DESC']
        );

        if ($subscription instanceof Subscription) {
            $entity->setSubscription($subscription);
        }
    }
}
