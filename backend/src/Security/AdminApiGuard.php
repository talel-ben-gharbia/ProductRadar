<?php

namespace App\Security;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

final class AdminApiGuard
{
    private const ALLOWED_ROLES = ['ROLE_SUPER_ADMIN', 'ROLE_SUB_ADMIN'];

    private string $apiKey;

    public function __construct()
    {
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
