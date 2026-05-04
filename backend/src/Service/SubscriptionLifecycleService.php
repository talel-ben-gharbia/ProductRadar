<?php

namespace App\Service;

use App\Entity\SubscriptionB2C;
use App\Entity\User;

final class SubscriptionLifecycleService
{
    public const PLAN_FREE = 'FREE';
    public const PLAN_PREMIUM_MONTHLY = 'PREMIUM_MONTHLY';
    public const PLAN_PREMIUM_YEARLY = 'PREMIUM_YEARLY';

    public function ensureDefaultFreePlan(User $user): SubscriptionB2C
    {
        $subscription = $user->getSubscription();
        if ($subscription instanceof SubscriptionB2C) {
            return $subscription;
        }

        $subscription = new SubscriptionB2C();
        $subscription->setClient($user);
        $user->setSubscription($subscription);

        $this->applyPlanConfiguration($subscription, self::PLAN_FREE);

        return $subscription;
    }

    public function resyncExistingSubscription(SubscriptionB2C $subscription): bool
    {
        $changed = false;
        $normalizedPlan = $this->normalizePlanType((string) $subscription->getPlanType());
        $expected = $this->getPlanLimits($normalizedPlan);

        if ($subscription->getPlanType() !== $normalizedPlan) {
            $subscription->setPlanType($normalizedPlan);
            $changed = true;
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
        ], true);
    }

    private function applyPlanConfiguration(SubscriptionB2C $subscription, string $normalizedPlan): void
    {
        $now = new \DateTimeImmutable();

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
