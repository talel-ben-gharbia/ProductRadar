<?php

namespace App\Controller;

use App\Entity\Activity;
use App\Repository\ActivityRepository;
use App\Security\AdminApiGuard;
use Psr\Cache\CacheItemPoolInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/admin/api/activity-log')]
final class AdminActivityLogController extends AbstractController
{
    use CachedResponseTrait;

    private const CACHE_KEY_PREFIX = 'admin.activity_log.';

    public function __construct(
        #[Autowire(service: 'general.cache')]
        private readonly CacheItemPoolInterface $cache,
    ) {
    }

    #[Route('', name: 'admin_activity_log_list', methods: ['GET'])]
    public function list(
        Request $request,
        ActivityRepository $activityRepository,
        AdminApiGuard $adminApiGuard,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        $limit = max(1, min(100, $request->query->getInt('limit', 25)));
        $offset = max(0, $request->query->getInt('offset', 0));
        $search = trim((string) $request->query->get('search', ''));
        $entityType = strtoupper(trim((string) $request->query->get('entity_type', '')));
        $action = strtoupper(trim((string) $request->query->get('action', '')));

        $cacheKey = self::CACHE_KEY_PREFIX . md5("l{$limit}o{$offset}s{$search}e{$entityType}a{$action}");

        return $this->cachedGet($this->cache, $cacheKey, static function () use ($activityRepository, $limit, $offset, $search, $entityType, $action): array {
            $qb = $activityRepository->createQueryBuilder('log')
                ->leftJoin('log.admin', 'admin')
                ->addSelect('admin')
                ->andWhere('log.admin_id IS NOT NULL')
                ->orderBy('log.created_at', 'DESC')
                ->addOrderBy('log.id', 'DESC')
                ->setFirstResult($offset)
                ->setMaxResults($limit);

            $countQb = $activityRepository->createQueryBuilder('log')
                ->select('COUNT(log.id)')
                ->andWhere('log.admin_id IS NOT NULL');

            if ($entityType !== '') {
                $qb->andWhere('log.subject_type = :entityType')->setParameter('entityType', $entityType);
                $countQb->andWhere('log.subject_type = :entityType')->setParameter('entityType', $entityType);
            }

            if ($action !== '') {
                $qb->andWhere('log.action = :action')->setParameter('action', $action);
                $countQb->andWhere('log.action = :action')->setParameter('action', $action);
            }

            if ($search !== '') {
                $needle = '%' . mb_strtolower($search) . '%';
                $where = "LOWER(COALESCE(admin.email, '')) LIKE :search OR LOWER(COALESCE(log.action, '')) LIKE :search OR LOWER(COALESCE(log.subject_type, '')) LIKE :search";
                $qb->andWhere($where)->setParameter('search', $needle);
                $countQb->andWhere($where)->setParameter('search', $needle);
            }

            /** @var Activity[] $items */
            $items = $qb->getQuery()->setCacheable(true)->setLifetime(300)->getResult();

            return [
                'items' => array_map(
                    static fn (Activity $log): array => [
                        'id' => $log->getId(),
                        'action' => $log->getAction() ?? $log->getVerb(),
                        'entity_type' => $log->getSubjectType(),
                        'entity_id' => $log->getSubjectId(),
                        'admin' => [
                            'id' => $log->getAdmin()?->getId(),
                            'email' => $log->getAdmin()?->getEmail(),
                            'role' => $log->getAdmin()?->getRole(),
                        ],
                        'before' => $log->getContext(),
                        'after' => $log->getMetadata(),
                        'ip_address' => $log->getIpAddress(),
                        'created_at' => $log->getCreatedAt()?->format(\DateTimeInterface::ATOM),
                    ],
                    $items,
                ),
                'pagination' => [
                    'limit' => $limit,
                    'offset' => $offset,
                    'total' => (int) $countQb->getQuery()->setCacheable(true)->setLifetime(300)->getSingleScalarResult(),
                ],
            ];
        });
    }
}
