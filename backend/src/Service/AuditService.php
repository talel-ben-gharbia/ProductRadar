<?php

namespace App\Service;

use App\Entity\Activity;
use App\Entity\Admin;
use Doctrine\ORM\EntityManagerInterface;

final class AuditService
{
    public function __construct(private EntityManagerInterface $entityManager) {}

    /**
     * Log admin activity for moderation actions
     */
    public function logModeration(
        ?Admin $admin,
        string $action,
        string $entityType,
        int $entityId,
        ?array $before = null,
        ?array $after = null,
        ?string $ipAddress = null,
    ): Activity {
        $log = new Activity();
        $log->setActorType('ADMIN');
        $log->setActorId($admin?->getId());
        $log->setAdmin($admin);
        $log->setVerb($action);
        $log->setAction($action);
        $log->setSubjectType($entityType);
        $log->setSubjectId($entityId);
        $log->setContext($before);
        $log->setMetadata($after);
        $log->setIpAddress($ipAddress);
        $log->setCreatedAt(new \DateTimeImmutable());

        $this->entityManager->persist($log);
        $this->entityManager->flush();

        return $log;
    }

    /**
     * Get recent activity for entity
     */
    public function getEntityHistory(string $entityType, int $entityId, int $limit = 20): array
    {
        return $this->entityManager->getRepository(Activity::class)
            ->findBy(
                ['subject_type' => $entityType, 'subject_id' => $entityId],
                ['created_at' => 'DESC'],
                $limit,
            );
    }
}
