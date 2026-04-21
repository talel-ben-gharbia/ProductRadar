<?php

namespace App\Controller;

use App\Entity\AdminActivityLog;
use App\Repository\AdminActivityLogRepository;
use App\Security\AdminApiGuard;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/admin/api/activity-log')]
final class AdminActivityLogController extends AbstractController
{
    #[Route('', name: 'admin_activity_log_list', methods: ['GET'])]
    public function list(
        Request $request,
        AdminActivityLogRepository $adminActivityLogRepository,
        AdminApiGuard $adminApiGuard,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        $limit = max(1, min(100, $request->query->getInt('limit', 25)));
        $offset = max(0, $request->query->getInt('offset', 0));
        $search = trim((string) $request->query->get('search', ''));
        $entityType = strtoupper(trim((string) $request->query->get('entity_type', '')));
        $action = strtoupper(trim((string) $request->query->get('action', '')));

        $result = $adminActivityLogRepository->paginateForAdmin(
            $limit,
            $offset,
            $search,
            $entityType,
            $action,
        );

        return $this->json([
            'items' => array_map(
                static fn (AdminActivityLog $log): array => [
                    'id' => $log->getId(),
                    'action' => $log->getAction(),
                    'entity_type' => $log->getEntityType(),
                    'entity_id' => $log->getEntityId(),
                    'admin' => [
                        'id' => $log->getAdmin()?->getId(),
                        'email' => $log->getAdmin()?->getEmail(),
                        'role' => $log->getAdmin()?->getRole(),
                    ],
                    'before' => $log->getBeforeJson(),
                    'after' => $log->getAfterJson(),
                    'ip_address' => $log->getIpAddress(),
                    'created_at' => $log->getCreatedAt()?->format(\DateTimeInterface::ATOM),
                ],
                $result['items'],
            ),
            'pagination' => [
                'limit' => $limit,
                'offset' => $offset,
                'total' => $result['total'],
            ],
        ]);
    }
}
