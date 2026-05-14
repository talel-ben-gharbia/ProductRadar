<?php

namespace App\Controller;

use App\Entity\ScrapingLog;
use App\Repository\ScrapingLogRepository;
use App\Security\AdminApiGuard;
use Psr\Cache\CacheItemPoolInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/admin/api/scraping-logs')]
final class ScrapingLogControllerEnhanced extends AbstractController
{
    use CachedResponseTrait;

    private const CACHE_KEY_FILTERED = 'scraping_logs.filtered';
    private const CACHE_KEY_HEALTH = 'scraping_logs.health.';

    public function __construct(
        #[Autowire(service: 'general.cache')]
        private readonly CacheItemPoolInterface $cache,
    ) {
    }

    #[Route('/filtered', name: 'admin_scraping_logs_filtered', methods: ['GET'])]
    public function filtered(
        Request $request,
        ScrapingLogRepository $scrapingLogRepository,
        AdminApiGuard $adminApiGuard,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        $limit = max(1, min(100, $request->query->getInt('limit', 50)));
        $offset = max(0, $request->query->getInt('offset', 0));
        $source = (string) $request->query->get('source', '');
        $status = (string) $request->query->get('status', '');
        $daysBack = max(1, $request->query->getInt('days', 7));

        $cacheKey = self::CACHE_KEY_FILTERED . ".l{$limit}.o{$offset}." . md5($source) . '.' . md5($status) . ".d{$daysBack}";

        return $this->cachedGet($this->cache, $cacheKey, function () use ($scrapingLogRepository, $limit, $offset, $source, $status, $daysBack): array {
            $dateFrom = (new \DateTimeImmutable())->modify("-{$daysBack} days");
            $dateTo = new \DateTimeImmutable();

            $result = $scrapingLogRepository->paginateWithFilters($limit, $offset, $source, $status, $dateFrom, $dateTo);

            return [
                'items' => array_map(fn(ScrapingLog $log) => $this->serializeLog($log), $result['items']),
                'pagination' => [
                    'limit' => $limit,
                    'offset' => $offset,
                    'total' => $result['total'],
                ],
            ];
        });
    }

    #[Route('/source/{sourceName}/health', name: 'admin_scraping_log_source_health', methods: ['GET'])]
    public function sourceHealth(
        string $sourceName,
        Request $request,
        ScrapingLogRepository $scrapingLogRepository,
        AdminApiGuard $adminApiGuard,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        $cacheKey = self::CACHE_KEY_HEALTH . $sourceName;

        return $this->cachedGet($this->cache, $cacheKey, function () use ($scrapingLogRepository, $sourceName): array {
            return $scrapingLogRepository->getSourceHealth($sourceName);
        });
    }

    private function serializeLog(ScrapingLog $log): array
    {
        return [
            'id' => $log->getId(),
            'source_name' => $log->getSourceName(),
            'workflow_name' => $log->getWorkflowName(),
            'status' => $log->getStatus(),
            'duration_ms' => $log->getDurationMs(),
            'records_processed' => $log->getRecordsProcessed(),
            'error_message' => $log->getErrorMessage(),
            'executed_at' => $log->getExecutedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }
}
