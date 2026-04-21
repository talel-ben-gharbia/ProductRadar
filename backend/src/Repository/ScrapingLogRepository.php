<?php

namespace App\Repository;

use App\Entity\ScrapingLog;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ScrapingLog>
 */
class ScrapingLogRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ScrapingLog::class);
    }

    /**
     * @return ScrapingLog[]
     */
    public function findRecent(int $limit = 20): array
    {
        return $this->createQueryBuilder('l')
            ->orderBy('l.executed_at', 'DESC')
            ->addOrderBy('l.id', 'DESC')
            ->setMaxResults(max(1, min(100, $limit)))
            ->getQuery()
            ->getResult();
    }

    /**
     * @return ScrapingLog[]
     */
    public function exportAll(): array
    {
        return $this->createQueryBuilder('l')
            ->orderBy('l.executed_at', 'DESC')
            ->addOrderBy('l.id', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * @return array{items: ScrapingLog[], total: int}
     */
    public function paginateWithFilters(
        int $limit,
        int $offset,
        ?string $source = null,
        ?string $status = null,
        ?\DateTimeImmutable $dateFrom = null,
        ?\DateTimeImmutable $dateTo = null,
    ): array {
        $qb = $this->createQueryBuilder('l');

        if ($source !== null && $source !== '') {
            $qb->andWhere('l.source_name LIKE :source')
                ->setParameter('source', '%' . $source . '%');
        }

        if ($status !== null && $status !== '') {
            $qb->andWhere('l.status = :status')
                ->setParameter('status', strtoupper($status));
        }

        if ($dateFrom !== null) {
            $qb->andWhere('l.executed_at >= :dateFrom')
                ->setParameter('dateFrom', $dateFrom);
        }

        if ($dateTo !== null) {
            $qb->andWhere('l.executed_at <= :dateTo')
                ->setParameter('dateTo', $dateTo);
        }

        $countQb = clone $qb;
        $countQb->select('COUNT(l.id)');

        $qb->orderBy('l.executed_at', 'DESC')
            ->setFirstResult($offset)
            ->setMaxResults($limit);

        $items = $qb->getQuery()->getResult();
        $total = (int) $countQb->getQuery()->getSingleScalarResult();

        return ['items' => $items, 'total' => $total];
    }

    /**
     * Get health metrics for a specific data source
     */
    public function getSourceHealth(string $sourceName, int $limit = 50): array
    {
        $logs = $this->createQueryBuilder('l')
            ->andWhere('l.source_name = :source')
            ->setParameter('source', $sourceName)
            ->orderBy('l.executed_at', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        if (empty($logs)) {
            return [
                'source_name' => $sourceName,
                'total_runs' => 0,
                'success_count' => 0,
                'failure_count' => 0,
                'success_rate' => 0,
                'last_status' => null,
                'consecutive_failures' => 0,
                'avg_duration_ms' => 0,
                'last_errors' => [],
            ];
        }

        $totalRuns = count($logs);
        $successCount = count(array_filter($logs, fn($l) => $l->getStatus() === 'SUCCESS'));
        $failureCount = $totalRuns - $successCount;

        $consecutiveFailures = 0;
        foreach ($logs as $log) {
            if ($log->getStatus() !== 'SUCCESS') {
                $consecutiveFailures++;
            } else {
                break;
            }
        }

        $avgDuration = 0;
        $durationCount = 0;
        $lastErrors = [];

        foreach ($logs as $log) {
            if ($log->getDurationMs() !== null) {
                $avgDuration += $log->getDurationMs();
                $durationCount++;
            }
            if ($log->getErrorMessage() && count($lastErrors) < 5) {
                $lastErrors[] = [
                    'executed_at' => $log->getExecutedAt()?->format(\DateTimeInterface::ATOM),
                    'error' => $log->getErrorMessage(),
                ];
            }
        }

        $avgDuration = $durationCount > 0 ? round($avgDuration / $durationCount, 2) : 0;

        return [
            'source_name' => $sourceName,
            'total_runs' => $totalRuns,
            'success_count' => $successCount,
            'failure_count' => $failureCount,
            'success_rate' => round(($successCount / $totalRuns) * 100, 2),
            'last_status' => $logs[0]->getStatus(),
            'consecutive_failures' => $consecutiveFailures,
            'avg_duration_ms' => $avgDuration,
            'last_errors' => $lastErrors,
        ];
    }
}
