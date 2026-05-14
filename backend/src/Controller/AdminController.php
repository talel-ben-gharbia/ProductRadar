<?php

namespace App\Controller;

use App\Entity\Admin;
use App\Repository\AdminRepository;
use App\Security\AdminApiGuard;
use App\Service\AuditService;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Cache\CacheItemPoolInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/admin/api/admins')]
final class AdminController extends AbstractController
{
    use CachedResponseTrait;

    private const ALLOWED_ROLES = ['ROLE_SUPER_ADMIN', 'ROLE_SUB_ADMIN'];
    private const CACHE_KEY_ADMINS = 'admins.all';

    public function __construct(
        #[Autowire(service: 'general.cache')]
        private readonly CacheItemPoolInterface $cache,
    ) {
    }

    #[Route('', name: 'admin_list', methods: ['GET'])]
    public function list(
        Request $request,
        AdminRepository $adminRepository,
        AdminApiGuard $adminApiGuard,
    ): JsonResponse
    {
        $authError = $adminApiGuard->assertAuthorized($request, true);
        if ($authError !== null) {
            return $authError;
        }

        return $this->cachedGet($this->cache, self::CACHE_KEY_ADMINS, static function () use ($adminRepository): array {
            $admins = $adminRepository->findBy([], ['created_at' => 'DESC']);

            return array_map(static fn(Admin $admin) => [
                'id'         => $admin->getId(),
                'email'      => $admin->getEmail(),
                'role'       => $admin->getRole(),
                'created_at' => $admin->getCreatedAt()->format(\DateTimeInterface::ATOM),
                'updated_at' => $admin->getUpdatedAt()->format(\DateTimeInterface::ATOM),
            ], $admins);
        });
    }

    #[Route('', name: 'admin_create', methods: ['POST'])]
    public function create(
        Request $request,
        AdminRepository $adminRepository,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $passwordHasher,
        AdminApiGuard $adminApiGuard,
        AuditService $auditService,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request, true);
        if ($authError !== null) {
            return $authError;
        }

        $data = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        $email    = trim((string) ($data['email'] ?? ''));
        $password = (string) ($data['password'] ?? '');
        $role     = (string) ($data['role'] ?? 'ROLE_SUB_ADMIN');

        if ($email === '' || $password === '') {
            return $this->json(['error' => 'Email and password are required.'], 400);
        }

        if (!in_array($role, self::ALLOWED_ROLES, true)) {
            return $this->json(['error' => 'Invalid role.'], 400);
        }

        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            return $this->json(['error' => 'Invalid email address.'], 400);
        }

        if (strlen($password) < 8) {
            return $this->json(['error' => 'Password must be at least 8 characters.'], 400);
        }

        if ($adminRepository->findOneBy(['email' => $email]) !== null) {
            return $this->json(['error' => 'An admin with this email already exists.'], 409);
        }

        $admin = new Admin();
        $admin->setEmail($email);
        $admin->setPassword($passwordHasher->hashPassword($admin, $password));
        $admin->setRole($role);

        $em->persist($admin);
        $em->flush();

        $this->invalidateCache($this->cache);

        $currentAdmin = $this->resolveCurrentAdmin($request, $adminApiGuard, $adminRepository);
        $auditService->logModeration(
            $currentAdmin,
            'ADMIN_CREATE',
            'ADMIN',
            (int) $admin->getId(),
            null,
            [
                'email' => $admin->getEmail(),
                'role' => $admin->getRole(),
            ],
            $request->getClientIp(),
        );

        return $this->json([
            'id'         => $admin->getId(),
            'email'      => $admin->getEmail(),
            'role'       => $admin->getRole(),
            'created_at' => $admin->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ], 201);
    }

    #[Route('/{id}/role', name: 'admin_update_role', methods: ['PATCH'])]
    public function updateRole(
        int $id,
        Request $request,
        AdminRepository $adminRepository,
        EntityManagerInterface $em,
        AdminApiGuard $adminApiGuard,
        AuditService $auditService,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request, true);
        if ($authError !== null) {
            return $authError;
        }

        $data = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        $role = (string) ($data['role'] ?? '');

        if (!in_array($role, self::ALLOWED_ROLES, true)) {
            return $this->json(['error' => 'Invalid role.'], 400);
        }

        $admin = $adminRepository->find($id);

        if ($admin === null) {
            return $this->json(['error' => 'Admin not found.'], 404);
        }

        $requestAdminId = $adminApiGuard->getAdminId($request);
        if ($requestAdminId !== null && $requestAdminId === $admin->getId()) {
            return $this->json(['error' => 'You cannot change your own role.'], 422);
        }

        if ($admin->getRole() === 'ROLE_SUPER_ADMIN' && $role !== 'ROLE_SUPER_ADMIN') {
            $superAdminCount = count($adminRepository->findBy(['role' => 'ROLE_SUPER_ADMIN']));
            if ($superAdminCount <= 1) {
                return $this->json(['error' => 'Cannot demote the last super admin.'], 422);
            }
        }

        if ($admin->getRole() === $role) {
            return $this->json([
                'id'    => $admin->getId(),
                'email' => $admin->getEmail(),
                'role'  => $admin->getRole(),
            ]);
        }

        $beforeRole = $admin->getRole();

        $admin->setRole($role);
        $em->flush();

        $this->invalidateCache($this->cache);

        $currentAdmin = $this->resolveCurrentAdmin($request, $adminApiGuard, $adminRepository);
        $auditService->logModeration(
            $currentAdmin,
            'ADMIN_ROLE_UPDATE',
            'ADMIN',
            (int) $admin->getId(),
            ['role' => $beforeRole],
            ['role' => $role],
            $request->getClientIp(),
        );

        return $this->json([
            'id'    => $admin->getId(),
            'email' => $admin->getEmail(),
            'role'  => $admin->getRole(),
        ]);
    }

    #[Route('/{id}', name: 'admin_delete', methods: ['DELETE'])]
    public function delete(
        int $id,
        Request $request,
        AdminRepository $adminRepository,
        EntityManagerInterface $em,
        AdminApiGuard $adminApiGuard,
        AuditService $auditService,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request, true);
        if ($authError !== null) {
            return $authError;
        }

        $admin = $adminRepository->find($id);

        if ($admin === null) {
            return $this->json(['error' => 'Admin not found.'], 404);
        }

        $requestAdminId = $adminApiGuard->getAdminId($request);
        if ($requestAdminId !== null && $requestAdminId === $admin->getId()) {
            return $this->json(['error' => 'You cannot delete your own account.'], 422);
        }

        // Prevent deleting the last super admin
        if ($admin->getRole() === 'ROLE_SUPER_ADMIN') {
            $superAdminCount = count($adminRepository->findBy(['role' => 'ROLE_SUPER_ADMIN']));
            if ($superAdminCount <= 1) {
                return $this->json(['error' => 'Cannot delete the last super admin.'], 422);
            }
        }

        $before = [
            'email' => $admin->getEmail(),
            'role' => $admin->getRole(),
        ];

        $currentAdmin = $this->resolveCurrentAdmin($request, $adminApiGuard, $adminRepository);

        $em->remove($admin);
        $em->flush();

        $this->invalidateCache($this->cache);

        $auditService->logModeration(
            $currentAdmin,
            'ADMIN_DELETE',
            'ADMIN',
            $id,
            $before,
            null,
            $request->getClientIp(),
        );

        return $this->json(['success' => true]);
    }

    private function resolveCurrentAdmin(
        Request $request,
        AdminApiGuard $adminApiGuard,
        AdminRepository $adminRepository,
    ): ?Admin {
        $adminId = $adminApiGuard->getAdminId($request);
        if ($adminId === null) {
            return null;
        }

        return $adminRepository->find($adminId);
    }
}
