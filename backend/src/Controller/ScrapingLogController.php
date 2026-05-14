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
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/admin/api/scraping-logs')]
final class ScrapingLogController extends AbstractController
{
    use CachedResponseTrait;

    private const CACHE_KEY_LIST = 'scraping_logs.list';
    private const CACHE_KEY_RECENT = 'scraping_logs.recent';

    public function __construct(
        #[Autowire(service: 'general.cache')]
        private readonly CacheItemPoolInterface $cache,
    ) {
    }

    #[Route('', name: 'admin_scraping_logs_list', methods: ['GET'])]
    public function list(
        Request $request,
        ScrapingLogRepository $scrapingLogRepository,
        AdminApiGuard $adminApiGuard,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        $limit = max(1, min(100, $request->query->getInt('limit', 50)));
        $cacheKey = self::CACHE_KEY_LIST . ".l{$limit}";

        return $this->cachedGet($this->cache, $cacheKey, function () use ($scrapingLogRepository, $limit): array {
            $items = $scrapingLogRepository->findRecent($limit);

            return [
                'items' => array_map(fn (ScrapingLog $item) => $this->serializeLog($item), $items),
            ];
        });
    }

    #[Route('/recent', name: 'admin_scraping_logs_recent', methods: ['GET'])]
    public function recent(
        Request $request,
        ScrapingLogRepository $scrapingLogRepository,
        AdminApiGuard $adminApiGuard,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        $limit = max(1, min(20, $request->query->getInt('limit', 5)));
        $cacheKey = self::CACHE_KEY_RECENT . ".l{$limit}";

        return $this->cachedGet($this->cache, $cacheKey, function () use ($scrapingLogRepository, $limit): array {
            $items = $scrapingLogRepository->findRecent($limit);

            return [
                'items' => array_map(fn (ScrapingLog $item) => $this->serializeLog($item), $items),
            ];
        });
    }

    #[Route('/export', name: 'admin_scraping_logs_export', methods: ['GET'])]
    public function export(
        Request $request,
        ScrapingLogRepository $scrapingLogRepository,
        AdminApiGuard $adminApiGuard,
    ): StreamedResponse|JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        $items = $scrapingLogRepository->exportAll();

        $response = new StreamedResponse(function () use ($items): void {
            $output = fopen('php://output', 'wb');
            fputcsv($output, ['id', 'source_name', 'workflow_name', 'status', 'duration_ms', 'records_processed', 'error_message', 'executed_at']);

            foreach ($items as $item) {
                fputcsv($output, [
                    $item->getId(),
                    $item->getSourceName(),
                    $item->getWorkflowName(),
                    $item->getStatus(),
                    $item->getDurationMs(),
                    $item->getRecordsProcessed(),
                    $item->getErrorMessage(),
                    $item->getExecutedAt()?->format(\DateTimeInterface::ATOM),
                ]);
            }

            fclose($output);
        });

        $response->headers->set('Content-Type', 'text/csv; charset=UTF-8');
        $response->headers->set('Content-Disposition', ResponseHeaderBag::DISPOSITION_ATTACHMENT . '; filename="scraping-logs-export.csv"');

        return $response;
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
