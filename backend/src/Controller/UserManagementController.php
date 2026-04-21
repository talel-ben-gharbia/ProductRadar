<?php

namespace App\Controller;

use App\Entity\B2BCompany;
use App\Entity\B2BMarket;
use App\Entity\Customer;
use App\Entity\Subscription;
use App\Entity\User;
use App\Repository\AlertRepository;
use App\Repository\FavoriteRepository;
use App\Repository\PartnerRequestRepository;
use App\Repository\SubscriptionRepository;
use App\Repository\UserRepository;
use App\Security\AdminApiGuard;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Doctrine\ORM\EntityManagerInterface;

#[Route('/admin/api/users')]
final class UserManagementController extends AbstractController
{
    #[Route('/stats', name: 'admin_users_stats', methods: ['GET'])]
    public function stats(
        Request $request,
        UserRepository $userRepository,
        SubscriptionRepository $subscriptionRepository,
        PartnerRequestRepository $partnerRequestRepository,
        AdminApiGuard $adminApiGuard,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        return $this->json([
            'users' => $userRepository->getAdminStats(),
            'subscriptions' => $subscriptionRepository->getAdminStats(),
            'pending_b2b_requests' => $partnerRequestRepository->count([]),
        ]);
    }

    #[Route('', name: 'admin_users_list', methods: ['GET'])]
    public function list(
        Request $request,
        UserRepository $userRepository,
        AlertRepository $alertRepository,
        FavoriteRepository $favoriteRepository,
        AdminApiGuard $adminApiGuard,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        $limit = max(1, min(100, $request->query->getInt('limit', 25)));
        $offset = max(0, $request->query->getInt('offset', 0));

        $filters = [
            'search' => trim((string) $request->query->get('search', '')),
            'accountType' => trim((string) $request->query->get('accountType', '')),
            'status' => trim((string) $request->query->get('status', '')),
            'b2bStatus' => trim((string) $request->query->get('b2bStatus', '')),
        ];

        $result = $userRepository->paginateForAdmin($filters, $limit, $offset);
        $userIds = array_values(array_filter(array_map(
            static fn (User $user): ?int => $user->getId(),
            $result['items'],
        )));
        $alertsCountMap = $alertRepository->getCountMapByUserIds($userIds);
        $favoritesCountMap = $favoriteRepository->getCountMapByUserIds($userIds);

        return $this->json([
            'items' => array_map(
                fn (User $user) => $this->serializeUser(
                    $user,
                    $alertsCountMap[$user->getId() ?? 0] ?? 0,
                    $favoritesCountMap[$user->getId() ?? 0] ?? 0,
                ),
                $result['items'],
            ),
            'pagination' => [
                'limit' => $limit,
                'offset' => $offset,
                'total' => $result['total'],
            ],
        ]);
    }

    #[Route('/{id}/status', name: 'admin_users_status_update', methods: ['PATCH'])]
    public function updateStatus(
        int $id,
        Request $request,
        UserRepository $userRepository,
        AlertRepository $alertRepository,
        FavoriteRepository $favoriteRepository,
        EntityManagerInterface $entityManager,
        AdminApiGuard $adminApiGuard,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        $payload = $this->decodeJsonPayload($request);
        $status = strtoupper((string) ($payload['status'] ?? ''));

        if (!in_array($status, ['ACTIVE', 'SUSPENDED', 'BANNED'], true)) {
            return $this->json(['error' => 'Invalid account status.'], 422);
        }

        $user = $userRepository->find($id);
        if (!$user instanceof User) {
            return $this->json(['error' => 'User not found.'], 404);
        }

        $user->setAccountStatus($status);
        $user->setIsActive($status === 'ACTIVE');

        $entityManager->flush();

        return $this->json($this->serializeUser(
            $user,
            $alertRepository->count(['alerter' => $user]),
            $favoriteRepository->count(['client' => $user]),
        ));
    }

    private function serializeUser(User $user, int $alertsUsed = 0, int $favoritesUsed = 0): array
    {
        $accountType = $this->getAccountType($user);

        return [
            'id' => $user->getId(),
            'email' => $user->getEmail(),
            'full_name' => $user instanceof Customer ? $user->getFullName() : ($user instanceof B2BCompany || $user instanceof B2BMarket ? $user->getFullName() : null),
            'joined_at' => $user instanceof Customer || $user instanceof B2BCompany || $user instanceof B2BMarket ? $user->getJoinedAt()?->format(\DateTimeInterface::ATOM) : null,
            'updated_at' => $user instanceof Customer || $user instanceof B2BCompany || $user instanceof B2BMarket ? $user->getUpdatedAt()?->format(\DateTimeInterface::ATOM) : null,
            'last_login' => $user->getLastLogin()?->format(\DateTimeInterface::ATOM),
            'is_active' => $user->isActive(),
            'is_verified' => $user instanceof Customer || $user instanceof B2BCompany || $user instanceof B2BMarket ? $user->isVerified() : null,
            'account_type' => $accountType,
            'account_status' => $user->getAccountStatus(),
            'b2b_status' => $this->getB2bStatus($user),
            'company_name' => $user instanceof B2BCompany || $user instanceof B2BMarket ? $user->getCompanyName() : null,
            'company_market' => $user instanceof B2BCompany || $user instanceof B2BMarket ? $user->getCompanyMarket() : null,
            'company_country' => $user instanceof B2BCompany || $user instanceof B2BMarket ? $user->getCompanyCountry() : null,
            'company_website' => $user instanceof B2BCompany || $user instanceof B2BMarket ? $user->getCompanyWebsite() : null,
            'subscription' => $this->serializeSubscription($user->getSubscription()),
            'usage' => [
                'alerts_used' => $alertsUsed,
                'favorites_used' => $favoritesUsed,
            ],
        ];
    }

    private function serializeSubscription(?Subscription $subscription): ?array
    {
        if (!$subscription instanceof Subscription) {
            return null;
        }

        return [
            'id' => $subscription->getId(),
            'plan_type' => $subscription->getPlanType(),
            'active' => $subscription->isActive(),
            'start_date' => $subscription->getStartDate()?->format(\DateTimeInterface::ATOM),
            'end_date' => $subscription->getEndDate()?->format(\DateTimeInterface::ATOM),
            'alerts_limit' => $subscription->getAlertsLimit(),
            'favorites_limit' => $subscription->getFavoritesLimit(),
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

    private function getB2bStatus(User $user): ?string
    {
        return $user instanceof B2BCompany || $user instanceof B2BMarket ? $user->getB2bStatus() : null;
    }

    private function decodeJsonPayload(Request $request): array
    {
        $payload = json_decode((string) $request->getContent(), true);

        return is_array($payload) ? $payload : [];
    }
}
