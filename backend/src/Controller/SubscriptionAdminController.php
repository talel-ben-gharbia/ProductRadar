<?php

namespace App\Controller;

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

            $subscription = $user->getSubscription();
            if (!$subscription instanceof Subscription) {
                $subscription = $subscriptionLifecycleService->ensureDefaultFreePlan($user);
                $entityManager->persist($subscription);
                $created++;
                continue;
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
            $stats = $subscriptionRepository->getAdminStats();

            return [
                'items' => array_map(fn(Subscription $subscription) => $this->serializeSubscription($subscription), $result['items']),
                'pagination' => [
                    'limit' => $limit,
                    'offset' => $offset,
                    'total' => $result['total'],
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

            return $this->serializeSubscription($subscription);
        });
    }

    private function serializeSubscription(Subscription $subscription): array
    {
        $ownerType = $subscription->getOwnerType();
        $ownerId = $subscription->getOwnerId();
        $ownerName = $this->resolveOwnerName($ownerType, $ownerId);

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

    private function resolveOwnerName(?string $ownerType, ?int $ownerId): string
    {
        if ($ownerType === null || $ownerId === null || $ownerId <= 0) {
            return 'Unknown';
        }

        return match (strtoupper($ownerType)) {
            'USER' => $this->resolveUserName($ownerId),
            'COMPANY', 'B2B_COMPANY' => $this->resolveCompanyName($ownerId),
            'MARKET', 'B2B_MARKET' => $this->resolveMarketName($ownerId),
            default => 'Unknown (' . $ownerType . ')',
        };
    }

    private function resolveUserName(int $userId): string
    {
        $user = $this->entityManager->find(User::class, $userId);
        if (!$user instanceof User) {
            return "User #{$userId}";
        }
        return (string) ($user->getEmail() ?? $user->getFirebaseUid() ?? "User #{$userId}");
    }

    private function resolveCompanyName(int $companyId): string
    {
        $company = $this->entityManager->find(B2BCompany::class, $companyId);
        if (!$company instanceof B2BCompany) {
            return "Company #{$companyId}";
        }
        return (string) ($company->getName() ?? $company->getFullName() ?? $company->getEmail() ?? "Company #{$companyId}");
    }

    private function resolveMarketName(int $marketId): string
    {
        $market = $this->entityManager->find(B2BMarket::class, $marketId);
        if (!$market instanceof B2BMarket) {
            return "Market #{$marketId}";
        }
        return (string) ($market->getName() ?? $market->getSector() ?? $market->getEmail() ?? "Market #{$marketId}");
    }

}
