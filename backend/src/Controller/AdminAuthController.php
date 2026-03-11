<?php

namespace App\Controller;

use App\Repository\AdminRepository;
use Psr\Cache\CacheItemPoolInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

final class AdminAuthController extends AbstractController
{
    private const MAX_ATTEMPTS = 5;
    private const LOCKOUT_SECONDS = 300;

    #[Route('/admin/api/login', name: 'admin_api_login', methods: ['POST'])]
    public function login(
        Request $request,
        AdminRepository $adminRepository,
        UserPasswordHasherInterface $passwordHasher,
        CacheItemPoolInterface $cache,
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        $email = trim((string) ($data['email'] ?? ''));
        $password = (string) ($data['password'] ?? '');

        if ($email === '' || $password === '') {
            return $this->json(['error' => 'Email and password are required.'], 400);
        }

        // Rate limiting by client IP
        $ip = $request->getClientIp() ?? 'unknown';
        $rateLimitKey = 'admin_login_' . hash('sha256', $ip);
        $cacheItem = $cache->getItem($rateLimitKey);
        $attempts = (int) ($cacheItem->get() ?? 0);

        if ($attempts >= self::MAX_ATTEMPTS) {
            return $this->json([
                'error' => 'Too many login attempts. Please try again later.',
            ], 429);
        }

        $admin = $adminRepository->findOneBy(['email' => $email]);

        // Always run password verification to prevent timing attacks on email enumeration
        if (!$admin) {
            $passwordHasher->hashPassword(
                new \App\Entity\Admin(),
                $password,
            );
            $cacheItem->set($attempts + 1);
            $cacheItem->expiresAfter(self::LOCKOUT_SECONDS);
            $cache->save($cacheItem);

            return $this->json(['error' => 'Invalid credentials.'], 401);
        }

        if (!$passwordHasher->isPasswordValid($admin, $password)) {
            $cacheItem->set($attempts + 1);
            $cacheItem->expiresAfter(self::LOCKOUT_SECONDS);
            $cache->save($cacheItem);

            return $this->json(['error' => 'Invalid credentials.'], 401);
        }

        // Reset rate limit on successful login
        $cache->deleteItem($rateLimitKey);

        return $this->json([
            'id' => $admin->getId(),
            'email' => $admin->getEmail(),
            'role' => $admin->getRole(),
        ]);
    }
}
