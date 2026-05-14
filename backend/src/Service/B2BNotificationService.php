<?php

namespace App\Service;

use App\Entity\Admin;
use App\Entity\B2BAdsRequest;
use App\Entity\B2BCompany;
use App\Entity\B2BMarket;
use App\Entity\B2BScrapingRequest;
use App\Entity\B2BSponsoredArticle;
use App\Entity\Notification;
use App\Entity\Subscription;
use App\Entity\ProductListing;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;

final class B2BNotificationService
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly MailerInterface $mailer,
        private readonly LoggerInterface $logger,
        private readonly string $fromEmail,
    ) {
    }

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

    public function alertUndercut(B2BCompany $company, ProductListing $listing, string $competitorName, float $competitorPrice): void
    {
        $this->notifyCompany(
            $company,
            'COMPETITOR_UNDERCUT',
            sprintf('Competitor "%s" is now cheaper than you for product "%s" (Price: %s)', $competitorName, $listing->getProduct()?->getName() ?? 'Unknown', number_format($competitorPrice, 2)),
            'HIGH',
            $listing
        );
    }

    public function alertStockShortage(B2BCompany|B2BMarket $owner, string $itemName, string $severity = 'MEDIUM'): void
    {
        $message = sprintf('Stock shortage detected for "%s". Frequent stock-outs observed in recent logs.', $itemName);
        if ($owner instanceof B2BCompany) {
            $this->notifyCompany($owner, 'STOCK_SHORTAGE', $message, $severity);
        } else {
            $this->notifyMarket($owner, 'STOCK_SHORTAGE', $message, $severity);
        }
    }

    public function alertDispersionAnomaly(B2BMarket $market, string $productName, float $dispersionPct): void
    {
        $this->notifyMarket(
            $market,
            'DISPERSION_ANOMALY',
            sprintf('High price dispersion (%.1f%%) detected for your product "%s" across marketplace sellers.', $dispersionPct, $productName),
            'MEDIUM'
        );
    }

    public function alertTrustDrop(B2BCompany $company, ProductListing $listing, float $oldScore, float $newScore, array $breakdownChanges): void
    {
        $productName = $listing->getProduct()?->getName() ?? 'Unknown';
        $delta = $oldScore - $newScore;
        $causes = [];
        $labelMap = [
            'price_stability' => 'Price stability',
            'stock_reliability' => 'Stock reliability',
            'anomaly_penalty' => 'Anomaly penalty',
            'data_freshness' => 'Data freshness',
            'seller_reliability' => 'Seller reliability',
        ];
        foreach ($breakdownChanges as $key => $change) {
            if (is_numeric($change) && (float) $change < 0) {
                $label = $labelMap[$key] ?? $key;
                $causes[] = sprintf('%s (%.0fpts)', $label, abs((float) $change));
            }
        }
        $causeStr = !empty($causes) ? ' Main causes: ' . implode(', ', $causes) : '';

        $this->notifyCompany(
            $company,
            'COMPETITOR_TRUST_DROP',
            sprintf('Trust score for "%s" dropped from %.0f to %.0f (-%.0f).%s', $productName, $oldScore, $newScore, $delta, $causeStr),
            'HIGH',
            $listing
        );
    }

    public function notifySponsorshipApproved(B2BSponsoredArticle $article, Admin $admin): void
    {
        $company = $article->getCompany();
        if (!$company) return;

        $productName = $article->getProduct()?->getName() ?? $article->getTitle() ?? 'Unknown';
        $endsAt = $article->getEndsAt()?->format('F j, Y') ?? 'N/A';
        $message = sprintf('Your sponsorship for "%s" has been approved by admin %s and is now live until %s.', $productName, (string) $admin->getEmail(), $endsAt);
        $this->notifyCompany($company, 'SPONSORSHIP_APPROVED', $message, 'SUCCESS');

        $this->sendEmail(
            $company,
            sprintf('Your Sponsorship for "%s" is Live!', $productName),
            sprintf(
                "Hello %s,\n\nGreat news! Your sponsorship request for \"%s\" has been approved.\n\nYour product will appear as a sponsored item on our marketplace until %s.\n\nTrack your sponsorship performance from your dashboard.\n\nBest regards,\nProductRadar Team",
                $company->getCompanyName() ?? 'Valued Partner',
                $productName,
                $endsAt,
            )
        );
    }

    public function notifySponsorshipRejected(B2BSponsoredArticle $article): void
    {
        $company = $article->getCompany();
        if (!$company) return;

        $productName = $article->getProduct()?->getName() ?? $article->getTitle() ?? 'Unknown';
        $message = sprintf('Your sponsorship request for "%s" has been declined.', $productName);
        $this->notifyCompany($company, 'SPONSORSHIP_REJECTED', $message);

        $this->sendEmail(
            $company,
            sprintf('Update on Your Sponsorship Request for "%s"', $productName),
            sprintf(
                "Hello %s,\n\nUnfortunately, your sponsorship request for \"%s\" was not approved at this time.\n\nIf you have any questions, please contact our support team.\n\nBest regards,\nProductRadar Team",
                $company->getCompanyName() ?? 'Valued Partner',
                $productName,
            )
        );
    }

    public function notifySponsorshipExpired(B2BSponsoredArticle $article): void
    {
        $company = $article->getCompany();
        if (!$company) return;

        $productName = $article->getProduct()?->getName() ?? $article->getTitle() ?? 'Unknown';
        $message = sprintf('Your sponsorship for "%s" has ended. Submit a new request to continue promoting your product.', $productName);
        $this->notifyCompany($company, 'SPONSORSHIP_EXPIRED', $message, 'HIGH');

        $this->sendEmail(
            $company,
            sprintf('Your Sponsorship for "%s" Has Ended', $productName),
            sprintf(
                "Hello %s,\n\nYour sponsorship for \"%s\" has ended.\n\nTo continue promoting your product on our marketplace, submit a new sponsorship request from your dashboard.\n\nBest regards,\nProductRadar Team",
                $company->getCompanyName() ?? 'Valued Partner',
                $productName,
            )
        );
    }

    // ─────────────────────────────────────────────
    //  Email helpers
    // ─────────────────────────────────────────────

    public function notifySubscriptionApproved(Subscription $subscription, Admin $admin): void
    {
        $owner = $this->resolveOwner($subscription);
        if (!$owner) return;

        $planLabel = ucfirst(strtolower((string) $subscription->getPlanType()));
        $message = sprintf('Your %s subscription has been approved by admin %s.', $planLabel, (string) $admin->getEmail());
        $this->notifyOwner($owner, 'SUBSCRIPTION_APPROVED', $message);

        $this->sendEmail(
            $owner,
            sprintf('Your %s Subscription is Approved!', $planLabel),
            sprintf(
                "Hello %s,\n\nGreat news! Your %s subscription request has been approved by our team.\n\nPlan: %s\nDuration: %d months\n\nYou can now access all the features included in your plan from your dashboard.\n\nBest regards,\nProductRadar Team",
                $owner->getCompanyName() ?? 'Valued Partner',
                $planLabel,
                $planLabel,
                (int) ($subscription->getDurationMonths() ?? 12),
            )
        );
    }

    public function notifySubscriptionRejected(Subscription $subscription): void
    {
        $owner = $this->resolveOwner($subscription);
        if (!$owner) return;

        $planLabel = ucfirst(strtolower((string) $subscription->getPlanType()));
        $message = sprintf('Your %s subscription request has been declined.', $planLabel);
        $this->notifyOwner($owner, 'SUBSCRIPTION_REJECTED', $message);

        $this->sendEmail(
            $owner,
            sprintf('Update on Your %s Subscription Request', $planLabel),
            sprintf(
                "Hello %s,\n\nUnfortunately, your %s subscription request was not approved at this time.\n\nIf you have any questions or would like to discuss alternative options, please contact our support team.\n\nBest regards,\nProductRadar Team",
                $owner->getCompanyName() ?? 'Valued Partner',
                $planLabel,
            )
        );
    }

    public function notifyAdsRequestApproved(B2BAdsRequest $adsRequest, Admin $admin, array $campaignDetails): void
    {
        $company = $adsRequest->getCompany();
        if (!$company) return;

        $linkUrl = $adsRequest->getLinkUrl() ?? 'N/A';
        $dimensions = '';
        if (isset($campaignDetails['width']) && isset($campaignDetails['height'])) {
            $dimensions = sprintf('%dx%d px', $campaignDetails['width'], $campaignDetails['height']);
        }
        $duration = isset($campaignDetails['duration_days']) ? sprintf('%d days', $campaignDetails['duration_days']) : 'TBD';
        $message = sprintf('Your banner ads request #%d has been approved!', $adsRequest->getId());
        $this->notifyCompany($company, 'ADS_REQUEST_APPROVED', $message);

        $this->sendEmail(
            $company,
            'Your Advertising Campaign is Live!',
            sprintf(
                "Hello %s,\n\nYour ads request #%d has been approved! Your campaign is now active.\n\nLanding page: %s\nDimensions: %s\nDuration: %s\n\nTrack your campaign performance from the dashboard.\n\nBest regards,\nProductRadar Team",
                $company->getCompanyName() ?? 'Valued Partner',
                $adsRequest->getId(),
                $linkUrl,
                $dimensions,
                $duration,
            )
        );
    }

    public function notifyAdsRequestRejected(B2BAdsRequest $adsRequest): void
    {
        $company = $adsRequest->getCompany();
        if (!$company) return;

        $message = sprintf('Your ads request #%d has been declined.', $adsRequest->getId());
        $this->notifyCompany($company, 'ADS_REQUEST_REJECTED', $message);

        $this->sendEmail(
            $company,
            'Update on Your Ads Request',
            sprintf(
                "Hello %s,\n\nYour ads request #%d was not approved at this time.\n\nIf you have any questions, please reach out to our support team.\n\nBest regards,\nProductRadar Team",
                $company->getCompanyName() ?? 'Valued Partner',
                $adsRequest->getId(),
            )
        );
    }

    public function notifyScrapingRequestApproved(B2BScrapingRequest $scrapingRequest): void
    {
        $owner = $this->resolveOwner($scrapingRequest);
        if (!$owner) return;

        $targetDesc = sprintf('%s — %s', $scrapingRequest->getTargetType() ?? 'N/A', $scrapingRequest->getTargetUrl() ?? 'N/A');
        $message = sprintf('Your scraping request for "%s" has been approved and is being processed.', $targetDesc);
        $this->notifyOwner($owner, 'SCRAPING_REQUEST_APPROVED', $message);

        $this->sendEmail(
            $owner,
            'Your Data Scraping Request is Approved!',
            sprintf(
                "Hello %s,\n\nYour scraping request has been approved and is now being processed.\n\nTarget: %s\n\nYou will receive a notification once the data is ready.\n\nBest regards,\nProductRadar Team",
                $owner->getCompanyName() ?? 'Valued Partner',
                $targetDesc,
            )
        );
    }

    public function notifyScrapingRequestRejected(B2BScrapingRequest $scrapingRequest, string $reason = ''): void
    {
        $owner = $this->resolveOwner($scrapingRequest);
        if (!$owner) return;

        $message = sprintf('Your scraping request #%d has been declined.', $scrapingRequest->getId());
        if ($reason !== '') {
            $message .= sprintf(' Reason: %s', $reason);
        }
        $this->notifyOwner($owner, 'SCRAPING_REQUEST_REJECTED', $message);

        $emailBody = sprintf(
            "Hello %s,\n\nYour scraping request #%d was not approved at this time.",
            $owner->getCompanyName() ?? 'Valued Partner',
            $scrapingRequest->getId(),
        );
        if ($reason !== '') {
            $emailBody .= sprintf("\n\nReason given: %s", $reason);
        }
        $emailBody .= "\n\nIf you have any questions, please contact our support team.\n\nBest regards,\nProductRadar Team";

        $this->sendEmail($owner, 'Update on Your Scraping Request', $emailBody);
    }

    public function notifySubscriptionRenewed(Subscription $subscription): void
    {
        $owner = $this->resolveOwner($subscription);
        if (!$owner) return;

        $planLabel = ucfirst(strtolower((string) $subscription->getPlanType()));
        $endDate = $subscription->getEndDate()?->format('F j, Y') ?? 'N/A';
        $message = sprintf('Your %s subscription has been renewed. New expiry: %s.', $planLabel, $endDate);
        $this->notifyOwner($owner, 'SUBSCRIPTION_RENEWED', $message, 'SUCCESS');

        $this->sendEmail(
            $owner,
            'Your Subscription Has Been Renewed',
            sprintf(
                "Hello %s,\n\nYour %s subscription has been renewed.\n\nNew expiry date: %s\n\nBest regards,\nProductRadar Team",
                $owner->getCompanyName() ?? 'Valued Partner',
                $planLabel,
                $endDate
            )
        );
    }

    public function notifyOwner(B2BCompany|B2BMarket $owner, string $type, string $message, string $severity = 'INFO'): void
    {
        if ($owner instanceof B2BCompany) {
            $this->notifyCompany($owner, $type, $message, $severity);
        } else {
            $this->notifyMarket($owner, $type, $message, $severity);
        }
    }

    public function sendEmail(B2BCompany|B2BMarket $owner, string $subject, string $body): bool
    {
        $emailAddress = (string) $owner->getEmail();
        if ($emailAddress === '') {
            return false;
        }

        try {
            $email = (new Email())
                ->from($this->fromEmail)
                ->to($emailAddress)
                ->subject($subject)
                ->text($body);

            $this->mailer->send($email);

            return true;
        } catch (\Throwable $e) {
            $this->logger->error('B2B notification email could not be sent.', [
                'to' => $emailAddress,
                'subject' => $subject,
                'owner_id' => $owner->getId(),
                'owner_name' => $owner->getCompanyName(),
                'owner_type' => $owner instanceof B2BCompany ? 'company' : 'market',
                'error' => $e->getMessage(),
                'exception' => $e,
            ]);

            return false;
        }
    }

    public function notifySubscriptionExpiryWarning(Subscription $subscription, int $daysLeft): void
    {
        $owner = $this->resolveOwner($subscription);
        if (!$owner) return;

        $planLabel = ucfirst(strtolower((string) $subscription->getPlanType()));
        $endDate = $subscription->getEndDate()?->format('F j, Y') ?? 'N/A';
        $message = sprintf('Your %s subscription expires in %d days (%s). Renew now to avoid interruption.', $planLabel, $daysLeft, $endDate);
        $this->notifyOwner($owner, 'SUBSCRIPTION_EXPIRY_WARNING', $message, 'HIGH');

        $this->sendEmail(
            $owner,
            sprintf('Your %s Subscription Expires in %d Days', $planLabel, $daysLeft),
            sprintf(
                "Hello %s,\n\nThis is a reminder that your %s subscription will expire in %d days.\n\nExpiration date: %s\n\nPlease contact our team to renew your subscription and continue enjoying uninterrupted access to all features.\n\nBest regards,\nProductRadar Team",
                $owner->getCompanyName() ?? 'Valued Partner',
                $planLabel,
                $daysLeft,
                $endDate,
            )
        );
    }

    // ─────────────────────────────────────────────
    //  Internal helpers
    // ─────────────────────────────────────────────

    private function resolveOwner(Subscription|B2BScrapingRequest $entity): B2BCompany|B2BMarket|null
    {
        if ($entity instanceof B2BScrapingRequest) {
            if ($entity->getCompany() !== null) {
                return $entity->getCompany();
            }
            return $entity->getMarket();
        }

        $ownerType = $entity->getOwnerType();
        $ownerId = $entity->getOwnerId();

        if ($ownerType === 'COMPANY' && $ownerId !== null) {
            return $this->entityManager->find(B2BCompany::class, $ownerId);
        }
        if ($ownerType === 'MARKET' && $ownerId !== null) {
            return $this->entityManager->find(B2BMarket::class, $ownerId);
        }

        return null;
    }
}
