<?php

namespace App\Service;

use App\Entity\B2BCompany;
use App\Entity\B2BMarket;
use App\Entity\Notification;
use App\Entity\ProductListing;
use Doctrine\ORM\EntityManagerInterface;

final class B2BNotificationService
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager
    ) {
    }

    /**
     * Notify a company about a business event.
     */
    public function notifyCompany(B2BCompany $company, string $type, string $message, string $severity = 'INFO', ?ProductListing $listing = null): void
    {
        $notification = new Notification();
        $notification->setCompany($company);
        $notification->setType($type);
        $notification->setMessage($message);
        $notification->setSeverity($severity);
        $notification->setProductListing($listing);
        $notification->setIsRead(false);
        $notification->setCreatedAt(new \DateTimeImmutable());

        $this->entityManager->persist($notification);
        $this->entityManager->flush();
    }

    /**
     * Notify a market account about a business event.
     */
    public function notifyMarket(B2BMarket $market, string $type, string $message, string $severity = 'INFO'): void
    {
        $notification = new Notification();
        $notification->setMarket($market);
        $notification->setType($type);
        $notification->setMessage($message);
        $notification->setSeverity($severity);
        $notification->setIsRead(false);
        $notification->setCreatedAt(new \DateTimeImmutable());

        $this->entityManager->persist($notification);
        $this->entityManager->flush();
    }

    /**
     * Automated alert for competitor undercutting a vendor.
     */
    public function alertUndercut(B2BCompany $company, ProductListing $listing, string $competitorName, float $competitorPrice): void
    {
        $this->notifyCompany(
            $company,
            'COMPETITOR_UNDERCUT',
            sprintf('Competitor "%s" is now cheaper than you for product "%s" (Price: %s)', $competitorName, $listing->getProductName(), number_format($competitorPrice, 2)),
            'HIGH',
            $listing
        );
    }

    /**
     * Automated alert for stock shortage detection.
     */
    public function alertStockShortage(B2BCompany|B2BMarket $owner, string $itemName, string $severity = 'MEDIUM'): void
    {
        $message = sprintf('Stock shortage detected for "%s". Frequent stock-outs observed in recent logs.', $itemName);
        if ($owner instanceof B2BCompany) {
            $this->notifyCompany($owner, 'STOCK_SHORTAGE', $message, $severity);
        } else {
            $this->notifyMarket($owner, 'STOCK_SHORTAGE', $message, $severity);
        }
    }

    /**
     * Automated alert for price dispersion anomaly in market.
     */
    public function alertDispersionAnomaly(B2BMarket $market, string $productName, float $dispersionPct): void
    {
        $this->notifyMarket(
            $market,
            'DISPERSION_ANOMALY',
            sprintf('High price dispersion (%.1f%%) detected for your product "%s" across marketplace sellers.', $dispersionPct, $productName),
            'MEDIUM'
        );
    }
}
