<?php

namespace App\Service;

use App\Entity\B2B;
use App\Entity\B2BMarket;
use App\Entity\Subscription;
use App\Entity\User;
use App\Repository\SubscriptionRepository;

final class SubscriptionLifecycleService
{
    public const PLAN_FREE = 'FREE';
    public const PLAN_PREMIUM_MONTHLY = 'PREMIUM_MONTHLY';
    public const PLAN_PREMIUM_YEARLY = 'PREMIUM_YEARLY';

    public function __construct(
        private readonly SubscriptionRepository $subscriptionRepository,
    ) {
    }

    public function ensureDefaultFreePlan(User $user): Subscription
    {
        if ($user instanceof B2B) {
            $ownerType = $user instanceof B2BMarket ? 'MARKET' : 'COMPANY';
            $existing = $this->subscriptionRepository->findActiveByOwner($ownerType, (int) $user->getId());
            if ($existing !== null) {
                $user->setSubscription($existing);
                return $existing;
            }
            $subscription = new Subscription();
            $subscription->setOwnerType($ownerType);
            $subscription->setOwnerId((int) $user->getId());
            $subscription->setPlanType('B2B_SILVER');
            $subscription->setStartDate(new \DateTimeImmutable());
            $subscription->setEndDate((new \DateTimeImmutable())->modify('+100 years'));
            $subscription->setCreatedAt(new \DateTimeImmutable());
            $subscription->setActive(true);
            $subscription->setFavoritesLimit(999);
            $subscription->setAlertsLimit(20);
            $subscription->setPriceHistoryAccess(12);
            $user->setSubscription($subscription);
            return $subscription;
        }

        $subscription = $user->getSubscription();
        if ($subscription instanceof Subscription) {
            return $subscription;
        }

        $subscription = new Subscription();
        $subscription->setOwnerType('USER');
        $subscription->setOwnerId((int) $user->getId());
        $user->setSubscription($subscription);

        $this->applyPlanConfiguration($subscription, self::PLAN_FREE);

        return $subscription;
    }

    public function resyncExistingSubscription(Subscription $subscription): bool
    {
        $changed = false;
        $normalizedPlan = $this->normalizePlanType((string) $subscription->getPlanType());

        if (in_array($normalizedPlan, ['B2B_SILVER', 'B2B_GOLD'], true)) {
            $expected = [
                'favorites' => 999,
                'alerts' => 20,
                'priceHistoryAccess' => 12,
            ];
            if ($subscription->getPlanType() !== $normalizedPlan) {
                $subscription->setPlanType($normalizedPlan);
                $changed = true;
            }
        } else {
            $expected = $this->getPlanLimits($normalizedPlan);
            if ($subscription->getPlanType() !== $normalizedPlan) {
                $subscription->setPlanType($normalizedPlan);
                $changed = true;
            }
        }

        if ($subscription->getFavoritesLimit() !== $expected['favorites']) {
            $subscription->setFavoritesLimit($expected['favorites']);
            $changed = true;
        }

        if ($subscription->getAlertsLimit() !== $expected['alerts']) {
            $subscription->setAlertsLimit($expected['alerts']);
            $changed = true;
        }

        if ($subscription->getPriceHistoryAccess() !== $expected['priceHistoryAccess']) {
            $subscription->setPriceHistoryAccess($expected['priceHistoryAccess']);
            $changed = true;
        }

        $startDate = $subscription->getStartDate();
        if (!$startDate instanceof \DateTimeImmutable) {
            $startDate = new \DateTimeImmutable();
            $subscription->setStartDate($startDate);
            $changed = true;
        }

        $endDate = $subscription->getEndDate();
        if (!$endDate instanceof \DateTimeImmutable) {
            $subscription->setEndDate($this->defaultEndDateForPlan($normalizedPlan, $startDate));
            $changed = true;
        }

        if ($normalizedPlan === self::PLAN_FREE && $subscription->isActive() !== true) {
            $subscription->setActive(true);
            $changed = true;
        }

        return $changed;
    }

    public function applySelectedPlan(User $user, string $planTypeRaw): Subscription
    {
        $subscription = $this->ensureDefaultFreePlan($user);
        $planType = $this->normalizePlanType($planTypeRaw);

        $this->applyPlanConfiguration($subscription, $planType);

        return $subscription;
    }

    public function normalizePlanType(string $planTypeRaw): string
    {
        $plan = strtoupper(trim($planTypeRaw));

        return match ($plan) {
            'FREE', 'FREEMIUM' => self::PLAN_FREE,
            'PREMIUM', 'PREMIUM_MONTHLY' => self::PLAN_PREMIUM_MONTHLY,
            'PREMIUM_YEARLY' => self::PLAN_PREMIUM_YEARLY,
            'B2B_SILVER', 'B2B_GOLD' => $plan,
            default => self::PLAN_FREE,
        };
    }

    public function isAllowedPlan(string $planTypeRaw): bool
    {
        return in_array(strtoupper(trim($planTypeRaw)), [
            'FREE',
            'FREEMIUM',
            'PREMIUM',
            'PREMIUM_MONTHLY',
            'PREMIUM_YEARLY',
            'B2B_SILVER',
            'B2B_GOLD',
        ], true);
    }

    private function applyPlanConfiguration(Subscription $subscription, string $normalizedPlan): void
    {
        $now = new \DateTimeImmutable();
        $subscription->setCreatedAt($now);

        if ($normalizedPlan === self::PLAN_PREMIUM_YEARLY) {
            $subscription
                ->setPlanType(self::PLAN_PREMIUM_YEARLY)
                ->setStartDate($now)
                ->setEndDate($now->modify('+1 year'))
                ->setActive(true)
                ->setFavoritesLimit(999)
                ->setAlertsLimit(20)
                ->setPriceHistoryAccess(6);

            return;
        }

        if ($normalizedPlan === self::PLAN_PREMIUM_MONTHLY) {
            $subscription
                ->setPlanType(self::PLAN_PREMIUM_MONTHLY)
                ->setStartDate($now)
                ->setEndDate($now->modify('+1 month'))
                ->setActive(true)
                ->setFavoritesLimit(999)
                ->setAlertsLimit(20)
                ->setPriceHistoryAccess(6);

            return;
        }

        $subscription
            ->setPlanType(self::PLAN_FREE)
            ->setStartDate($now)
            ->setEndDate($this->defaultEndDateForPlan(self::PLAN_FREE, $now))
            ->setActive(true)
            ->setFavoritesLimit($this->getPlanLimits(self::PLAN_FREE)['favorites'])
            ->setAlertsLimit($this->getPlanLimits(self::PLAN_FREE)['alerts'])
            ->setPriceHistoryAccess($this->getPlanLimits(self::PLAN_FREE)['priceHistoryAccess']);
    }

    private function defaultEndDateForPlan(string $planType, \DateTimeImmutable $startDate): \DateTimeImmutable
    {
        return match ($planType) {
            self::PLAN_PREMIUM_YEARLY => $startDate->modify('+1 year'),
            self::PLAN_PREMIUM_MONTHLY => $startDate->modify('+1 month'),
            default => $startDate->modify('+100 years'),
        };
    }

    /**
     * @return array{favorites: int, alerts: int, priceHistoryAccess: int}
     */
    private function getPlanLimits(string $planType): array
    {
        return match ($planType) {
            self::PLAN_PREMIUM_MONTHLY, self::PLAN_PREMIUM_YEARLY => [
                'favorites' => 999,
                'alerts' => 20,
                'priceHistoryAccess' => 6,
            ],
            default => [
                'favorites' => 5,
                'alerts' => 3,
                'priceHistoryAccess' => 1,
            ],
        };
    }
}
