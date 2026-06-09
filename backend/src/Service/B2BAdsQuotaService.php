<?php

namespace App\Service;

use App\Entity\B2B;
use App\Entity\B2BCompany;
use App\Entity\B2BMarket;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Enforces B2B ads request quotas based on subscription plan.
 * Gold plan: 15 ads per week, 50 per month
 * Silver plan: 2 ads per week, 20 per month
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
    public function canCreateAdsRequest(B2B $user): array
    {
        $isGold = $this->planGatingService->isGoldPlan($user);
        $weeklyLimit = $isGold ? 15 : 2;
        $monthlyLimit = $isGold ? 50 : 20;

        $ownerId = $user->getId();
        $ownerType = $user instanceof B2BCompany ? 'COMPANY' : 'MARKET';
        $conn = $this->entityManager->getConnection();

        $whereClause = $ownerType === 'COMPANY' ? 'AND company_id = :owner_id' : 'AND market_id = :owner_id';
        $params = ['owner_type' => $ownerType, 'owner_id' => $ownerId];

        $weeklyCount = (int) $conn->fetchOne(
            "SELECT COUNT(*) FROM b2b_ads_request WHERE owner_type = :owner_type $whereClause AND created_at >= NOW() - INTERVAL '7 days'",
            $params
        );

        $monthlyCount = (int) $conn->fetchOne(
            "SELECT COUNT(*) FROM b2b_ads_request WHERE owner_type = :owner_type $whereClause AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())",
            $params
        );

        $weeklyRemaining = max(0, $weeklyLimit - $weeklyCount);
        $monthlyRemaining = max(0, $monthlyLimit - $monthlyCount);
        $remaining = min($weeklyRemaining, $monthlyRemaining);

        $messages = [];
        if ($remaining > 0) {
            if ($weeklyRemaining < $monthlyRemaining) {
                $messages[] = sprintf('You have %d ads request(s) remaining this week.', $weeklyRemaining);
            } else {
                $messages[] = sprintf('You have %d ads request(s) remaining this month.', $monthlyRemaining);
            }
        } else {
            if ($weeklyRemaining <= 0) {
                $messages[] = sprintf('You have reached your limit of %d ads requests per week.', $weeklyLimit);
            }
            if ($monthlyRemaining <= 0) {
                $messages[] = sprintf('You have reached your limit of %d ads requests per month.', $monthlyLimit);
            }
        }

        return [
            'allowed' => $remaining > 0,
            'remaining' => $remaining,
            'limit' => $monthlyLimit,
            'message' => implode(' ', $messages),
        ];
    }

    /**
     * Get quota usage details for display.
     */
    public function getQuotaUsage(B2B $user): array
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
