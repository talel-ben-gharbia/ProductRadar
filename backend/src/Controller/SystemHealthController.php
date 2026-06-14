<?php

declare(strict_types=1);

namespace App\Controller;

use App\Security\AdminApiGuard;
use App\Service\AnalyticsService;
use Doctrine\ORM\EntityManagerInterface;
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
        EntityManagerInterface $em,
        AdminApiGuard $adminApiGuard,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request, true);
        if ($authError !== null) {
            return $authError;
        }

        return $this->cachedGet($this->cache, self::CACHE_KEY_INDEX, function () use ($analyticsService, $em): array {
            try {
                $conn = $em->getConnection();

                return [
                    'status' => 'ok',
                    'checked_at' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
                    'database' => $this->safeGetDbStats($conn),
                    'cache' => $this->getCacheStats(),
                    'scraping_health' => $this->safeGetScrapingHealth($analyticsService),
                ];
            } catch (\Throwable) {
                return [
                    'status' => 'degraded',
                    'checked_at' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
                    'database' => ['size' => 'N/A', 'active_connections' => 0, 'total_connections' => 0],
                    'cache' => ['hits' => 0, 'misses' => 0, 'hit_rate' => 0, 'adapter' => 'Unknown'],
                    'scraping_health' => ['total_runs' => 0, 'success_rate' => 0, 'failed_runs' => 0, 'avg_duration_ms' => 0],
                ];
            }
        }, 30);
    }

    private function safeGetDbStats($conn): array
    {
        $dbSize = $this->fetchSafe($conn, "SELECT pg_size_pretty(pg_database_size(current_database()))");
        $activeConns = $this->fetchSafe($conn, "SELECT count(*) FROM pg_stat_activity WHERE state = 'active'");
        $totalConns = $this->fetchSafe($conn, "SELECT count(*) FROM pg_stat_activity");

        return [
            'size' => $dbSize !== false ? $dbSize : 'N/A',
            'active_connections' => $activeConns !== false ? (int) $activeConns : 0,
            'total_connections' => $totalConns !== false ? (int) $totalConns : 0,
        ];
    }

    private function getCacheStats(): array
    {
        $adapterClass = (new \ReflectionClass($this->cache))->getShortName();
        $adapterName = match(true) {
            str_contains($adapterClass, 'Redis') => 'Redis',
            str_contains($adapterClass, 'Filesystem') => 'Filesystem',
            str_contains($adapterClass, 'Array') => 'Array',
            default => $adapterClass,
        };

        // FilesystemAdapter doesn't have getStats() in Symfony
        if ($adapterName === 'Filesystem' || $adapterName === 'Array') {
            return ['hits' => 0, 'misses' => 0, 'hit_rate' => 0, 'adapter' => $adapterName, 'stats_available' => false];
        }

        try {
            $stats = $this->cache->getStats();
            $hits = $stats?->getHits() ?? 0;
            $misses = $stats?->getMisses() ?? 0;
            $total = $hits + $misses;

            return [
                'hits' => $hits,
                'misses' => $misses,
                'hit_rate' => $total > 0 ? round(($hits / $total) * 100, 1) : 0,
                'adapter' => $adapterName,
                'stats_available' => true,
            ];
        } catch (\Throwable) {
            return ['hits' => 0, 'misses' => 0, 'hit_rate' => 0, 'adapter' => $adapterName, 'stats_available' => false];
        }
    }

    private function fetchSafe($conn, string $sql)
    {
        try {
            return $conn->fetchOne($sql);
        } catch (\Throwable) {
            return false;
        }
    }

    private function safeGetScrapingHealth(AnalyticsService $analyticsService): array
    {
        try {
            $health = $analyticsService->getScrapingHealth();
            unset($health['sources']);
            return $health;
        } catch (\Throwable) {
            return ['total_runs' => 0, 'success_rate' => 0, 'failed_runs' => 0, 'avg_duration_ms' => 0];
        }
    }
}
