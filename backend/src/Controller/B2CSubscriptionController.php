<?php

namespace App\Controller;

use App\Entity\B2BCompany;
use App\Entity\B2BMarket;
use App\Entity\Customer;
use App\Entity\Subscription;
use App\Repository\UserRepository;
use App\Service\SubscriptionLifecycleService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class B2CSubscriptionController extends AbstractController
{
    #[Route('/api/b2c/subscription/{firebaseUid}', name: 'b2c_subscription_get', methods: ['GET'])]
    public function getSubscription(
        string $firebaseUid,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
        SubscriptionLifecycleService $subscriptionLifecycleService,
    ): JsonResponse {
        $user = $userRepository->findOneBy(['firebase_uid' => $firebaseUid]);
        if (!$user instanceof Customer && !$user instanceof B2BCompany && !$user instanceof B2BMarket) {
            return $this->json(['error' => 'User not found.'], 404);
        }

        $subscription = $subscriptionLifecycleService->ensureDefaultFreePlan($user);
        $entityManager->persist($subscription);
        $entityManager->flush();

        return $this->json([
            'subscription' => $this->serializeSubscription($subscription),
        ]);
    }

    #[Route('/api/b2c/subscription/{firebaseUid}', name: 'b2c_subscription_update', methods: ['PATCH'])]
    public function updateSubscription(
        string $firebaseUid,
        Request $request,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
        SubscriptionLifecycleService $subscriptionLifecycleService,
    ): JsonResponse {
        $user = $userRepository->findOneBy(['firebase_uid' => $firebaseUid]);
        if (!$user instanceof Customer && !$user instanceof B2BCompany && !$user instanceof B2BMarket) {
            return $this->json(['error' => 'User not found.'], 404);
        }

        $payload = json_decode((string) $request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        $planTypeRaw = (string) ($payload['planType'] ?? '');
        if ($planTypeRaw === '' || !$subscriptionLifecycleService->isAllowedPlan($planTypeRaw)) {
            return $this->json(['error' => 'Invalid plan type.'], 422);
        }

        $subscription = $subscriptionLifecycleService->applySelectedPlan($user, $planTypeRaw);

        $entityManager->persist($subscription);
        $entityManager->flush();

        return $this->json([
            'subscription' => $this->serializeSubscription($subscription),
        ]);
    }

    private function serializeSubscription(Subscription $subscription): array
    {
        return [
            'id' => $subscription->getId(),
            'plan_type' => $subscription->getPlanType(),
            'active' => $subscription->isActive(),
            'start_date' => $subscription->getStartDate()?->format(\DateTimeInterface::ATOM),
            'end_date' => $subscription->getEndDate()?->format(\DateTimeInterface::ATOM),
            'alerts_limit' => $subscription->getAlertsLimit(),
            'favorites_limit' => $subscription->getFavoritesLimit(),
            'price_history_access' => $subscription->getPriceHistoryAccess(),
        ];
    }
}
