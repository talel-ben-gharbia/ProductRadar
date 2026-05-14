<?php

namespace App\Service;

use App\Entity\Activity;
use Doctrine\ORM\EntityManagerInterface;

final class ActivityLogger
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {}

    public function log(
        string $actorType,
        ?int $actorId,
        string $verb,
        string $subjectType,
        int $subjectId,
        ?array $context = null,
        ?array $metadata = null,
    ): Activity {
        $activity = new Activity();
        $activity->setActorType($actorType);
        $activity->setActorId($actorId);
        $activity->setVerb($verb);
        $activity->setSubjectType($subjectType);
        $activity->setSubjectId($subjectId);
        $activity->setContext($context);
        $activity->setMetadata($metadata);
        $activity->setCreatedAt(new \DateTimeImmutable());

        $this->entityManager->persist($activity);

        return $activity;
    }
}
