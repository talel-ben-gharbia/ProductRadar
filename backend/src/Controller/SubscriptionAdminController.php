<?php

namespace App\Controller;

use App\Entity\B2BCompany;
use App\Entity\B2BMarket;
use App\Entity\Customer;
use App\Entity\SubscriptionB2C;
use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\SubscriptionLifecycleService;
use Doctrine\ORM\EntityManagerInterface;
use App\Repository\SubscriptionRepository;
use App\Security\AdminApiGuard;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/admin/api/subscriptions')]
final class SubscriptionAdminController extends AbstractController
{
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
            if (!$subscription instanceof SubscriptionB2C) {
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

        $result = $subscriptionRepository->paginateForAdmin($filters, $limit, $offset);
        $stats = $subscriptionRepository->getAdminStats();

        return $this->json([
            'items' => array_map(fn(SubscriptionB2C $subscription) => $this->serializeSubscription($subscription), $result['items']),
            'pagination' => [
                'limit' => $limit,
                'offset' => $offset,
                'total' => $result['total'],
            ],
            'stats' => $stats,
        ]);
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

        $subscription = $subscriptionRepository->find($id);
        if (!$subscription instanceof SubscriptionB2C) {
            return $this->json(['error' => 'Subscription not found.'], 404);
        }

        return $this->json($this->serializeSubscription($subscription));
    }

    private function serializeSubscription(SubscriptionB2C $subscription): array
    {
        $client = $subscription->getClient();
        $customer = $client instanceof Customer ? $client : null;
        $b2bClient = $client instanceof B2BCompany || $client instanceof B2BMarket ? $client : null;

        return [
            'id' => $subscription->getId(),
            'plan_type' => $subscription->getPlanType(),
            'active' => $subscription->isActive(),
            'start_date' => $subscription->getStartDate()?->format(\DateTimeInterface::ATOM),
            'end_date' => $subscription->getEndDate()?->format(\DateTimeInterface::ATOM),
            'alerts_limit' => $subscription->getAlertsLimit(),
            'favorites_limit' => $subscription->getFavoritesLimit(),
            'price_history_access' => $subscription->getPriceHistoryAccess(),
            'client' => $client !== null ? [
                'id' => $client->getId(),
                'email' => $client->getEmail(),
                'is_active' => $client->isActive(),
                'account_type' => $this->getAccountType($client),
                'account_status' => $client->getAccountStatus(),
                'company_name' => $b2bClient?->getCompanyName(),
            ] : null,
        ];
    }

    private function getAccountType(User $user): string
    {
        return match (true) {
            $user instanceof B2BCompany => 'B2B_COMPANY',
            $user instanceof B2BMarket => 'B2B_MARKET',
            default => 'B2C',
        };
    }
}
