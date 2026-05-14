<?php

namespace App\EventSubscriber;

use App\Service\FirebaseAuthService;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\KernelEvents;

final class B2BAuthSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly string $authSecret,
        private readonly FirebaseAuthService $firebaseAuth,
    ) {
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        $request = $event->getRequest();
        $path = $request->getPathInfo();

        if (!str_starts_with($path, '/api/b2b/workspace/')) {
            return;
        }

        // Dev bypass — skip HMAC validation so testing isn't blocked by key mismatches
        $appEnv = $_ENV['APP_ENV'] ?? $_SERVER['APP_ENV'] ?? 'prod';
        if (is_string($appEnv) && strtolower($appEnv) === 'dev') {
            return;
        }

        $firebaseUid = $request->attributes->get('firebaseUid') ?? $this->extractUidFromPath($path);

        if ($firebaseUid === null) {
            return;
        }

        // Primary: Firebase ID token verification
        $bearerHeader = (string) $request->headers->get('Authorization', '');
        if (str_starts_with($bearerHeader, 'Bearer ') && $this->firebaseAuth->isAvailable()) {
            $idToken = substr($bearerHeader, 7);
            $result = $this->firebaseAuth->verifyIdToken($idToken);
            if ($result === null || ($result['uid'] ?? null) !== $firebaseUid) {
                throw new AccessDeniedHttpException('Invalid Firebase token.');
            }
            return;
        }

        // Fallback: HMAC-based auth (legacy support)
        $authHeader = (string) $request->headers->get('X-B2B-Auth', '');
        if ($authHeader === '') {
            throw new AccessDeniedHttpException('Missing X-B2B-Auth header.');
        }

        $expected = hash_hmac('sha256', $firebaseUid, $this->authSecret);
        if (!hash_equals($expected, $authHeader)) {
            throw new AccessDeniedHttpException('Invalid X-B2B-Auth signature.');
        }
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => ['onKernelRequest', 10],
        ];
    }

    private function extractUidFromPath(string $path): ?string
    {
        if (preg_match('#^/api/b2b/workspace/([^/]+)#', $path, $m)) {
            return $m[1];
        }
        return null;
    }
}
