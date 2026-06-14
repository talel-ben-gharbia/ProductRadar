<?php

namespace App\Controller;

use App\Entity\B2B;
use App\Entity\B2BCompany;
use App\Entity\B2BMarket;
use App\Entity\Subscription;
use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\SubscriptionLifecycleService;
use Doctrine\ORM\EntityManagerInterface;
use App\Repository\SubscriptionRepository;
use App\Security\AdminApiGuard;
use Psr\Cache\CacheItemPoolInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/admin/api/subscriptions')]
final class SubscriptionAdminController extends AbstractController
{
    use CachedResponseTrait;

    private const CACHE_KEY_LIST = 'subscriptions.list';
    private const CACHE_KEY_DETAIL = 'subscriptions.detail.';

    public function __construct(
        #[Autowire(service: 'general.cache')]
        private readonly CacheItemPoolInterface $cache,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    #[Route('/resync', name: 'admin_subscriptions_resync', methods: ['POST'])]
    public function resync(
        Request $request,
        UserRepository $userRepository,
        SubscriptionLifecycleService $subscriptionLifecycleService,
        EntityManagerInterface $entityManager,
        AdminApiGuard $adminApiGuard,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request, true);
        if ($authError !== null) {
            return $authError;
        }

        $users = $userRepository->findAll();

        $created = 0;
        $updated = 0;
        $unchanged = 0;

        foreach ($users as $user) {
            if (!$user instanceof User) {
                continue;
            }

            if ($user instanceof B2B) {
                $subscription = $this->entityManager->getRepository(Subscription::class)->findActiveByOwner(
                    $user instanceof B2BMarket ? 'MARKET' : 'COMPANY',
                    (int) $user->getId()
                );
                if ($subscription === null) {
                    continue;
                }
            } else {
                $subscription = $user->getSubscription();
                if (!$subscription instanceof Subscription) {
                    $subscription = $subscriptionLifecycleService->ensureDefaultFreePlan($user);
                    $entityManager->persist($subscription);
                    $created++;
                    continue;
                }
            }

            $changed = $subscriptionLifecycleService->resyncExistingSubscription($subscription);
            if ($changed) {
                $updated++;
            } else {
                $unchanged++;
            }
        }

        $entityManager->flush();

        $this->invalidateCache($this->cache);

        return $this->json([
            'message' => 'Subscription resync completed.',
            'summary' => [
                'processed_users' => count($users),
                'created' => $created,
                'updated' => $updated,
                'unchanged' => $unchanged,
            ],
        ]);
    }

    #[Route('', name: 'admin_subscriptions_list', methods: ['GET'])]
    public function list(
        Request $request,
        SubscriptionRepository $subscriptionRepository,
        AdminApiGuard $adminApiGuard,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        $limit = max(1, min(100, $request->query->getInt('limit', 25)));
        $offset = max(0, $request->query->getInt('offset', 0));

        $filters = [
            'planType' => $request->query->get('planType'),
            'active' => $request->query->get('active'),
            'accountType' => $request->query->get('accountType') ?? $request->query->get('scope'),
        ];

        $cacheKey = self::CACHE_KEY_LIST . ".l{$limit}.o{$offset}." . md5(serialize($filters));

        return $this->cachedGet($this->cache, $cacheKey, function () use ($subscriptionRepository, $filters, $limit, $offset): array {
            $result = $subscriptionRepository->paginateForAdmin($filters, $limit, $offset);

            $b2bOwnerIds = [];
            foreach ($result['items'] as $sub) {
                $type = strtoupper((string) $sub->getOwnerType());
                if (in_array($type, ['COMPANY', 'B2B_COMPANY', 'MARKET', 'B2B_MARKET'], true)) {
                    $b2bOwnerIds[(int) $sub->getOwnerId()] = true;
                }
            }

            if (!empty($b2bOwnerIds)) {
                $filtered = [];
                foreach ($result['items'] as $sub) {
                    $type = strtoupper((string) $sub->getOwnerType());
                    if ($type === 'USER' && $sub->getPlanType() === 'FREE' && isset($b2bOwnerIds[(int) $sub->getOwnerId()])) {
                        continue;
                    }
                    $filtered[] = $sub;
                }
                $result['items'] = $filtered;
            }

            $stats = $subscriptionRepository->getAdminStats();
            $owners = $this->loadOwners($result['items']);

            return [
                'items' => array_map(fn(Subscription $subscription) => $this->serializeSubscription($subscription, $owners), $result['items']),
                'pagination' => [
                    'limit' => $limit,
                    'offset' => $offset,
                    'total' => count($result['items']),
                ],
                'stats' => $stats,
            ];
        });
    }

    #[Route('/{id}', name: 'admin_subscriptions_detail', methods: ['GET'])]
    public function detail(
        int $id,
        Request $request,
        SubscriptionRepository $subscriptionRepository,
        AdminApiGuard $adminApiGuard,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        return $this->cachedGet($this->cache, self::CACHE_KEY_DETAIL . $id, function () use ($id, $subscriptionRepository): array {
            $subscription = $subscriptionRepository->find($id);
            if (!$subscription instanceof Subscription) {
                throw new \RuntimeException('Subscription not found.');
            }

            return $this->serializeSubscription($subscription, $this->loadOwners([$subscription]));
        });
    }

    private function serializeSubscription(Subscription $subscription, array $owners): array
    {
        $ownerType = $subscription->getOwnerType();
        $ownerId = $subscription->getOwnerId();
        $ownerKey = strtoupper((string) $ownerType) . ':' . $ownerId;
        $ownerName = $owners[$ownerKey] ?? 'Unknown';

        return [
            'id' => $subscription->getId(),
            'owner_type' => $ownerType,
            'owner_id' => $ownerId,
            'owner_name' => $ownerName,
            'plan_type' => $subscription->getPlanType(),
            'active' => $subscription->isActive(),
            'start_date' => $subscription->getStartDate()?->format(\DateTimeInterface::ATOM),
            'end_date' => $subscription->getEndDate()?->format(\DateTimeInterface::ATOM),
            'alerts_limit' => $subscription->getAlertsLimit(),
            'favorites_limit' => $subscription->getFavoritesLimit(),
            'price_history_access' => $subscription->getPriceHistoryAccess(),
            'duration_months' => $subscription->getDurationMonths(),
            'activated_at' => $subscription->getActivatedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }

    private function loadOwners(array $subscriptions): array
    {
        $userIds = [];
        $companyIds = [];
        $marketIds = [];

        foreach ($subscriptions as $sub) {
            $type = strtoupper((string) $sub->getOwnerType());
            $id = $sub->getOwnerId();
            if ($id === null || $id <= 0) continue;

            match ($type) {
                'USER' => $userIds[] = $id,
                'COMPANY', 'B2B_COMPANY' => $companyIds[] = $id,
                'MARKET', 'B2B_MARKET' => $marketIds[] = $id,
                default => null,
            };
        }

        $owners = [];

        if (!empty($userIds)) {
            $users = $this->entityManager->createQueryBuilder()
                ->select('u.id, u.email, u.firebase_uid')
                ->from(User::class, 'u')
                ->where('u.id IN (:ids)')
                ->setParameter('ids', array_unique($userIds))
                ->getQuery()
                ->getScalarResult();
            foreach ($users as $u) {
                $owners['USER:' . $u['id']] = (string) ($u['email'] ?? $u['firebase_uid'] ?? "User #{$u['id']}");
            }
        }

        if (!empty($companyIds)) {
            $companies = $this->entityManager->createQueryBuilder()
                ->select('c.id, c.name, c.full_name, c.email')
                ->from(B2BCompany::class, 'c')
                ->where('c.id IN (:ids)')
                ->setParameter('ids', array_unique($companyIds))
                ->getQuery()
                ->getScalarResult();
            foreach ($companies as $c) {
                $owners['COMPANY:' . $c['id']] = (string) ($c['name'] ?? $c['full_name'] ?? $c['email'] ?? "Company #{$c['id']}");
            }
        }

        if (!empty($marketIds)) {
            $markets = $this->entityManager->createQueryBuilder()
                ->select('m.id, m.name, m.sector, m.email')
                ->from(B2BMarket::class, 'm')
                ->where('m.id IN (:ids)')
                ->setParameter('ids', array_unique($marketIds))
                ->getQuery()
                ->getScalarResult();
            foreach ($markets as $m) {
                $owners['MARKET:' . $m['id']] = (string) ($m['name'] ?? $m['sector'] ?? $m['email'] ?? "Market #{$m['id']}");
            }
        }

        return $owners;
    }

}
