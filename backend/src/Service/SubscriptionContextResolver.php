<?php

namespace App\Service;

use App\Entity\B2BCompany;
use App\Entity\B2BMarket;
use App\Entity\B2BSubscription;
use App\Entity\SubscriptionB2C;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Resolves subscription context with B2C/B2B hierarchy.
 *
 * CRITICAL RULE:
 * B2B subscription overrides B2C limits
 * BUT inherits B2C features if B2B plan = SILVER
 *
 * Subscription resolution order:
 * 1. Check if B2B subscription exists and is ACTIVE
 * 2. If yes: use B2B subscription as primary context
 * 3. If no: fall back to B2C subscription
 * 4. Feature availability determined by effective plan
 */
final class SubscriptionContextResolver
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    /**
     * Returns unified subscription context for a B2B company.
     *
     * Structure:
     * {
     *   "type": "B2B" or "B2C",
     *   "plan": "PREMIUM|SILVER|BRONZE|FREE",
     *   "active": bool,
     *   "overrides_b2c": bool,
     *   "b2c_fallback": {...},
     *   "effective_limits": {...}
     * }
     */
    public function resolveB2BSubscriptionContext(B2BCompany|B2BMarket $owner): array
    {
        $user = $this->entityManager->find(User::class, $owner->getId());
        if (!$user instanceof User) {
            return $this->b2cOnlyContext();
        }

        // Step 1: Check B2B subscription
        $b2bSub = $this->entityManager->getRepository(B2BSubscriptionB2C::class)->findOneBy([
            'owner_type' => $owner::class,
            'active' => true,
        ]);

        // Step 2: Check B2C subscription as fallback
        $b2cSub = $this->entityManager->getRepository(SubscriptionB2C::class)->findOneBy([
            'client_id' => $user->getId(),
            'active' => true,
        ]);

        // Step 3: Determine effective context
        if ($b2bSub instanceof B2BSubscription) {
            return [
                'type' => 'B2B',
                'plan' => $b2bSub->getPlanType(), // PREMIUM, SILVER, BRONZE
                'active' => true,
                'overrides_b2c' => true,
                'b2b_subscription_id' => $b2bSub->getId(),
                'b2b_duration_months' => $b2bSub->getDurationMonths(),
                'b2b_activated_at' => $b2bSub->getActivatedAt()?->format(\DateTimeInterface::ATOM),
                'b2c_fallback' => $this->serializeB2CSubscription($b2cSub),
                'effective_limits' => $this->computeEffectiveLimits($b2bSub, $b2cSub),
                'can_create_ads_requests' => $this->canCreateAdsRequests($b2bSub),
                'can_scrape_urls' => $this->canScrapeUrls($b2bSub),
                'can_generate_reports' => $this->canGenerateReports($b2bSub),
            ];
        }

        // Fall back to B2C subscription context
        return [
            'type' => 'B2C',
            'plan' => $b2cSub?->getPlanType() ?? 'FREE',
            'active' => $b2cSub?->isActive() ?? false,
            'overrides_b2c' => false,
            'b2c_subscription' => $this->serializeB2CSubscription($b2cSub),
            'effective_limits' => $this->computeB2CLimits($b2cSub),
            'can_create_ads_requests' => $b2cSub?->isActive() ?? false,
            'can_scrape_urls' => false, // B2C cannot scrape
            'can_generate_reports' => $b2cSub?->isActive() ?? false,
        ];
    }

    /**
     * Enforces subscription quota for a specific operation.
     *
     * Returns:
     * {
     *   "allowed": bool,
     *   "reason": "Quota exceeded|Subscription inactive|etc",
     *   "usage": { current, limit, remaining }
     * }
     */
    public function checkQuota(
        B2BCompany|B2BMarket $owner,
        string $operationType, // 'ads_requests', 'scraping_requests', 'reports'
        int $quantity = 1,
    ): array {
        $context = $this->resolveB2BSubscriptionContext($owner);

        if (!$context['active']) {
            return [
                'allowed' => false,
                'reason' => 'Subscription not active',
                'usage' => null,
            ];
        }

        $limits = $context['effective_limits'];
        $fieldName = match ($operationType) {
            'ads_requests' => 'ads_requests_per_month',
            'scraping_requests' => 'scraping_requests_per_month',
            'reports' => 'reports_per_month',
            default => null,
        };

        if ($fieldName === null) {
            return [
                'allowed' => false,
                'reason' => 'Unknown operation type',
                'usage' => null,
            ];
        }

        $limit = (int) ($limits[$fieldName] ?? 0);
        $current = $this->fetchCurrentUsage($owner, $operationType);
        $remaining = max(0, $limit - $current);

        return [
            'allowed' => $remaining >= $quantity,
            'reason' => $remaining >= $quantity ? null : 'Quota exceeded',
            'usage' => [
                'current' => $current,
                'limit' => $limit,
                'remaining' => $remaining,
                'requested' => $quantity,
            ],
        ];
    }

    /**
     * Records usage against quota (called after successful operation).
     */
    public function recordUsage(
        B2BCompany|B2BMarket $owner,
        string $operationType,
        int $quantity = 1,
    ): void {
        $usageJson = $owner->getUsageJson() ?? [];

        $currentMonth = (new \DateTime())->format('Y-m');
        if (!isset($usageJson[$currentMonth])) {
            $usageJson[$currentMonth] = [
                'ads_requests' => 0,
                'scraping_requests' => 0,
                'reports' => 0,
            ];
        }

        match ($operationType) {
            'ads_requests' => $usageJson[$currentMonth]['ads_requests'] += $quantity,
            'scraping_requests' => $usageJson[$currentMonth]['scraping_requests'] += $quantity,
            'reports' => $usageJson[$currentMonth]['reports'] += $quantity,
            default => null,
        };

        $owner->setUsageJson($usageJson);
        $this->entityManager->flush();
    }

    private function computeEffectiveLimits(
        B2BSubscription $b2bSub,
        ?SubscriptionB2C $b2cSub,
    ): array {
        // Base B2B limits by plan
        $b2bLimits = match ($b2bSub->getPlanType()) {
            'PREMIUM' => [
                'ads_requests_per_month' => 50,
                'scraping_requests_per_month' => 200,
                'reports_per_month' => 20,
                'max_watchlist_items' => 1000,
            ],
            'SILVER' => [
                'ads_requests_per_month' => 20,
                'scraping_requests_per_month' => 50,
                'reports_per_month' => 5,
                'max_watchlist_items' => 300,
            ],
            'BRONZE' => [
                'ads_requests_per_month' => 5,
                'scraping_requests_per_month' => 10,
                'reports_per_month' => 2,
                'max_watchlist_items' => 50,
            ],
            default => [],
        };

        // If SILVER, inherit B2C limits as fallback
        if ($b2bSub->getPlanType() === 'SILVER' && $b2cSub instanceof Subscription) {
            $b2cLimits = $this->computeB2CLimits($b2cSub);
            return array_merge($b2cLimits, $b2bLimits);
        }

        return $b2bLimits;
    }

    private function computeB2CLimits(?SubscriptionB2C $sub): array
    {
        if (!$sub instanceof SubscriptionB2C) {
            return [
                'ads_requests_per_month' => 0,
                'scraping_requests_per_month' => 0,
                'reports_per_month' => 0,
            ];
        }

        return match ($sub->getPlanType()) {
            'PREMIUM' => [
                'ads_requests_per_month' => 10,
                'scraping_requests_per_month' => 5,
                'reports_per_month' => 2,
            ],
            'SILVER' => [
                'ads_requests_per_month' => 3,
                'scraping_requests_per_month' => 1,
                'reports_per_month' => 1,
            ],
            default => [
                'ads_requests_per_month' => 0,
                'scraping_requests_per_month' => 0,
                'reports_per_month' => 0,
            ],
        };
    }

    private function canCreateAdsRequests(B2BSubscription $sub): bool
    {
        return $sub->isActive() && $sub->getPlanType() !== 'BRONZE';
    }

    private function canScrapeUrls(B2BSubscription $sub): bool
    {
        return $sub->isActive() && in_array($sub->getPlanType(), ['PREMIUM', 'SILVER']);
    }

    private function canGenerateReports(B2BSubscription $sub): bool
    {
        return $sub->isActive() && $sub->getPlanType() !== 'BRONZE';
    }

    private function serializeB2CSubscription(?SubscriptionB2C $sub): array
    {
        if (!$sub instanceof SubscriptionB2C) {
            return ['plan' => 'FREE', 'active' => false];
        }

        return [
            'plan' => $sub->getPlanType(),
            'active' => $sub->isActive(),
            'created_at' => $sub->getCreatedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }

    private function fetchCurrentUsage(B2BCompany|B2BMarket $owner, string $operationType): int
    {
        $usageJson = $owner->getUsageJson() ?? [];
        $currentMonth = (new \DateTime())->format('Y-m');

        return (int) ($usageJson[$currentMonth][$operationType] ?? 0);
    }

    private function b2cOnlyContext(): array
    {
        return [
            'type' => 'B2C',
            'plan' => 'FREE',
            'active' => false,
            'effective_limits' => [
                'ads_requests_per_month' => 0,
                'scraping_requests_per_month' => 0,
                'reports_per_month' => 0,
            ],
        ];
    }
}
