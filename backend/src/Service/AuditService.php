<?php

namespace App\Service;

use App\Entity\Admin;
use App\Entity\AdminActivityLog;
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
    ): AdminActivityLog {
        $log = new AdminActivityLog();
        $log->setAdmin($admin);
        $log->setAction($action);
        $log->setEntityType($entityType);
        $log->setEntityId($entityId);
        $log->setBeforeJson($before);
        $log->setAfterJson($after);
        $log->setCreatedAt(new \DateTimeImmutable());
        $log->setIpAddress($ipAddress);

        $this->entityManager->persist($log);
        $this->entityManager->flush();

        return $log;
    }

    /**
     * Get recent activity for entity
     */
    public function getEntityHistory(string $entityType, int $entityId, int $limit = 20): array
    {
        return $this->entityManager->getRepository(AdminActivityLog::class)
            ->findBy(
                ['entityType' => $entityType, 'entityId' => $entityId],
                ['createdAt' => 'DESC'],
                $limit,
            );
    }
}
