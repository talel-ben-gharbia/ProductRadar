<?php

namespace App\Security;

use App\Entity\Admin;
use App\Repository\AdminRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

final class AdminApiGuard
{
    private const ALLOWED_ROLES = ['ROLE_SUPER_ADMIN', 'ROLE_SUB_ADMIN'];

    private string $apiKey;

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {
        $this->apiKey = $_ENV['ADMIN_API_KEY'] ?? $_SERVER['ADMIN_API_KEY'] ?? 'dev-admin-api-key-change-me';
    }

    public function assertAuthorized(Request $request, bool $superAdminOnly = false): ?JsonResponse
    {
        $requestApiKey = trim((string) $request->headers->get('X-Admin-Api-Key', ''));
        if ($requestApiKey === '' || !hash_equals($this->apiKey, $requestApiKey)) {
            return new JsonResponse(['error' => 'Unauthorized admin request.'], 403);
        }

        $role = $this->getRole($request);
        if (!in_array($role, self::ALLOWED_ROLES, true)) {
            return new JsonResponse(['error' => 'Unauthorized admin role.'], 403);
        }

        if ($superAdminOnly && $role !== 'ROLE_SUPER_ADMIN') {
            return new JsonResponse(['error' => 'Only super admins can perform this action.'], 403);
        }

        // Check if the admin is suspended or banned
        $adminId = $this->getAdminId($request);
        if ($adminId !== null) {
            $adminRepository = $this->entityManager->getRepository(Admin::class);
            $admin = $adminRepository->find($adminId);
            if ($admin instanceof Admin) {
                $status = $admin->getStatus();
                if ($status === 'suspended') {
                    return new JsonResponse(['error' => 'Your account has been suspended.'], 403);
                }
                if ($status === 'banned') {
                    return new JsonResponse(['error' => 'Your account has been banned.'], 403);
                }
            }
        }

        return null;
    }

    public function getRole(Request $request): string
    {
        return strtoupper(trim((string) $request->headers->get('X-Admin-Role', '')));
    }

    public function getAdminId(Request $request): ?int
    {
        $adminId = $request->headers->get('X-Admin-Id');
        if ($adminId === null || !ctype_digit((string) $adminId)) {
            return null;
        }

        return (int) $adminId;
    }
}
