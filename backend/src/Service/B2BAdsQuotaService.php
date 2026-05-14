<?php

namespace App\Service;

use App\Entity\B2BAdsRequest;
use App\Entity\B2BCompany;
use App\Entity\B2BMarket;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Enforces B2B ads request quotas based on subscription plan.
 * Gold plan: 15 ads per week
 * Silver plan: 2 ads per week
 */
final class B2BAdsQuotaService
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly B2BPlanGatingService $planGatingService,
    ) {}

    /**
     * Check if a B2B user can create a new ads request.
     * Returns ['allowed' => bool, 'remaining' => int, 'limit' => int, 'message' => string]
     */
    public function canCreateAdsRequest(B2BCompany|B2BMarket $user): array
    {
        $isGold = $this->planGatingService->canAccessFeature($user, B2BPlanGatingService::FEATURE_STOCK_INTELLIGENCE);
        $limit = $isGold ? 15 : 2;

        // Get ads created in the past 7 days
        $ownerId = $user->getId();
        $ownerType = $user instanceof B2BCompany ? 'COMPANY' : 'MARKET';

        $sql = 'SELECT COUNT(*) FROM b2b_ads_request WHERE owner_type = :owner_type AND created_at >= NOW() - INTERVAL \'7 days\'';
        $params = ['owner_type' => $ownerType];

        if ($ownerType === 'COMPANY') {
            $sql .= ' AND company_id = :owner_id';
            $params['owner_id'] = $ownerId;
        } elseif ($ownerType === 'MARKET') {
            $sql .= ' AND market_id = :owner_id';
            $params['owner_id'] = $ownerId;
        }

        $count = $this->entityManager->getConnection()->fetchOne($sql, $params);

        if (!is_numeric($count) || $count === null) {
            $count = 0;
        }

        $count = (int) $count;
        $remaining = max(0, $limit - $count);

        return [
            'allowed' => $remaining > 0,
            'remaining' => $remaining,
            'limit' => $limit,
            'message' => $remaining > 0
                ? sprintf('You have %d ads request(s) remaining this week.', $remaining)
                : sprintf('You have reached your limit of %d ads requests per week.', $limit),
        ];
    }

    /**
     * Get quota usage details for display.
     */
    public function getQuotaUsage(B2BCompany|B2BMarket $user): array
    {
        $quota = $this->canCreateAdsRequest($user);

        return [
            'used' => $quota['limit'] - $quota['remaining'],
            'limit' => $quota['limit'],
            'remaining' => $quota['remaining'],
            'percentage' => round((($quota['limit'] - $quota['remaining']) / $quota['limit']) * 100),
        ];
    }
}
