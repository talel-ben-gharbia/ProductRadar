<?php

namespace App\Controller;

use App\Security\AdminApiGuard;
use App\Service\AnalyticsService;
use Psr\Cache\CacheItemPoolInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/admin/api/system-health')]
final class SystemHealthController extends AbstractController
{
    use CachedResponseTrait;

    private const CACHE_KEY_INDEX = 'system_health.index';

    public function __construct(
        #[Autowire(service: 'general.cache')]
        private readonly CacheItemPoolInterface $cache,
    ) {
    }

    #[Route('', name: 'admin_system_health', methods: ['GET'])]
    public function index(
        Request $request,
        AnalyticsService $analyticsService,
        AdminApiGuard $adminApiGuard,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        return $this->cachedGet($this->cache, self::CACHE_KEY_INDEX, static function () use ($analyticsService): array {
            return [
                'status' => 'ok',
                'checked_at' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
                'scraping_health' => $analyticsService->getScrapingHealth(),
            ];
        });
    }
}
