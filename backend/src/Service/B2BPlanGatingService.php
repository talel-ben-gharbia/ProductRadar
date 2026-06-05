<?php

namespace App\Service;

use App\Entity\B2B;
use App\Entity\B2BCompany;
use App\Entity\B2BMarket;
use App\Entity\Subscription;
use Doctrine\ORM\EntityManagerInterface;

class B2BPlanGatingService
{
    public const FEATURE_COMPETITOR_PRICING = 'competitor_pricing';
    public const FEATURE_STOCK_INTELLIGENCE = 'stock_intelligence';
    public const FEATURE_REVIEWS_SENTIMENT = 'reviews_sentiment';
    public const FEATURE_EXPORT_CSV = 'export_csv';
    public const FEATURE_BRAND_INTELLIGENCE = 'brand_intelligence';
    public const FEATURE_SHARE_OF_SHELF = 'share_of_shelf';
    public const FEATURE_PRICE_DISPERSION = 'price_dispersion';
    public const FEATURE_PRICE_COMPETITIVENESS = 'price_competitiveness';
    public const FEATURE_MULTI_PRODUCT_COMPARE = 'multi_product_compare';
    public const FEATURE_SPONSORED_PRODUCTS = 'sponsored_products';

    // Features that require GOLD plan
    private const GOLD_FEATURES = [
        self::FEATURE_COMPETITOR_PRICING,
        self::FEATURE_STOCK_INTELLIGENCE,
        self::FEATURE_REVIEWS_SENTIMENT,
        self::FEATURE_EXPORT_CSV,
        self::FEATURE_BRAND_INTELLIGENCE,
        self::FEATURE_SHARE_OF_SHELF,
        self::FEATURE_PRICE_DISPERSION,
        self::FEATURE_PRICE_COMPETITIVENESS,
        self::FEATURE_MULTI_PRODUCT_COMPARE,
    ];

    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    public function canAccessFeature(B2B $user, string $featureName): bool
    {
        if (!in_array($featureName, self::GOLD_FEATURES, true)) {
            return true; // Silver-level feature: always accessible
        }

        return $this->isGoldPlan($user);
    }

    public function isGoldPlan(B2B $user): bool
    {
        $ownerType = $user instanceof B2BCompany ? 'COMPANY' : 'MARKET';
        /** @var Subscription|null $sub */
        $sub = $this->entityManager->getRepository(Subscription::class)->findOneBy(
            ['owner_type' => $ownerType, 'owner_id' => $user->getId(), 'active' => true],
            ['created_at' => 'DESC', 'id' => 'DESC']
        );

        if (!$sub instanceof Subscription) {
            return false;
        }

        // Check not expired
        $endDate = $sub->getEndDate();
        if ($endDate !== null && $endDate < new \DateTimeImmutable()) {
            return false;
        }

        // Plan type stored as B2B_GOLD — check for GOLD substring
        return str_contains(strtoupper((string) $sub->getPlanType()), 'GOLD');
    }

    public function requireFeatureAccess(B2B $user, string $featureName): void
    {
        if (!$this->canAccessFeature($user, $featureName)) {
            throw new \RuntimeException(sprintf('Access denied. The feature "%s" requires a GOLD subscription plan.', $featureName));
        }
    }
}
