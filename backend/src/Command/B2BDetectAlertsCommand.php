<?php

namespace App\Command;

use App\Entity\B2BCompany;
use App\Entity\B2BMarket;
use App\Entity\B2BSponsoredArticle;
use App\Entity\ProductListing;
use App\Entity\Subscription;
use App\Repository\ProductListingRepository;
use App\Service\B2BNotificationService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:b2b:detect-alerts',
    description: 'Runs business intelligence detection to generate automated B2B alerts (undercuts, stock shortages, price dispersion).',
)]
final class B2BDetectAlertsCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly B2BNotificationService $notificationService,
        private readonly ProductListingRepository $productListingRepository
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('B2B Business Alert Detection');

        $this->processVendorAlerts($io);
        $this->processMarketAlerts($io);
        $this->processSponsorshipExpiry($io);
        $this->processTrustDrops($io);
        $this->processSubscriptionExpiry($io);

        $io->success('B2B alerts processed successfully.');

        return Command::SUCCESS;
    }

    private function processVendorAlerts(SymfonyStyle $io): void
    {
        $io->section('Processing Vendor Alerts (Undercuts & Stock)');
        $companies = $this->entityManager->getRepository(B2BCompany::class)->findBy(['b2b_status' => 'ACTIVE']);

        foreach ($companies as $company) {
            $seller = $company->getSeller();
            if (!$seller) continue;

            $listings = $this->productListingRepository->findBy(['seller' => $seller]);
            foreach ($listings as $listing) {
                $product = $listing->getProduct();
                if (!$product) continue;

                // 1. Check for Undercuts
                $cheapestListing = $this->productListingRepository->findOneBy(
                    ['product' => $product],
                    ['price' => 'ASC']
                );

                if ($cheapestListing && $cheapestListing->getSeller()?->getId() !== $seller->getId()) {
                    if ($cheapestListing->getPrice() < $listing->getPrice()) {
                        $this->notificationService->alertUndercut(
                            $company,
                            $listing,
                            $cheapestListing->getSeller()?->getName() ?? 'Unknown',
                            (float) $cheapestListing->getPrice()
                        );
                    }
                }

                // 2. Check for Stock Shortage (Frequent OOS in history)
                $oosRate = $this->calculateRecentOOSRate($listing);
                if ($oosRate > 0.4) { // More than 40% OOS in recent logs
                    $productName = $listing->getProduct()?->getName() ?? 'Unknown';
                    $this->notificationService->alertStockShortage($company, $productName, 'HIGH');
                }
            }
        }
    }

    private function processMarketAlerts(SymfonyStyle $io): void
    {
        $io->section('Processing Market Alerts (Dispersion)');
        $markets = $this->entityManager->getRepository(B2BMarket::class)->findBy(['b2b_status' => 'ACTIVE']);

        foreach ($markets as $market) {
            $brandName = $market->getCompanyName();
            if (!$brandName) continue;

            $listings = $this->productListingRepository->findByBrandName($brandName);
            $byProduct = [];
            foreach ($listings as $listing) {
                $pid = $listing->getProduct()?->getId();
                if (!$pid) continue;
                $byProduct[$pid][] = (float) $listing->getPrice();
            }

            foreach ($byProduct as $pid => $prices) {
                if (count($prices) < 2) continue;
                $min = min($prices);
                $max = max($prices);
                $dispersion = $min > 0 ? (($max - $min) / $min) * 100 : 0;

                if ($dispersion > 25) { // 25% spread is significant
                    $productName = $this->entityManager->getConnection()->fetchOne('SELECT name FROM product WHERE id = ?', [$pid]);
                    $this->notificationService->alertDispersionAnomaly($market, (string) $productName, $dispersion);
                }
            }
        }
    }

    private function processSponsorshipExpiry(SymfonyStyle $io): void
    {
        $io->section('Processing Sponsorship Expiry');
        $now = new \DateTimeImmutable();

        $expired = $this->entityManager->getRepository(B2BSponsoredArticle::class)->createQueryBuilder('a')
            ->where('a.status = :status')
            ->andWhere('a.ends_at IS NOT NULL')
            ->andWhere('a.ends_at <= :now')
            ->setParameter('status', 'PUBLISHED')
            ->setParameter('now', $now)
            ->getQuery()
            ->getResult();

        foreach ($expired as $article) {
            if (!$article instanceof B2BSponsoredArticle) continue;

            $article->setStatus('EXPIRED');
            $this->notificationService->notifySponsorshipExpired($article);
            $io->writeln(sprintf('  Expired sponsorship #%d for product "%s"', $article->getId(), $article->getProduct()?->getName() ?? 'Unknown'));
        }

        $count = count($expired);
        if ($count > 0) {
            $this->entityManager->flush();
        }

        $io->writeln(sprintf('  Expired %d sponsorship(s).', $count));
    }

    private function processTrustDrops(SymfonyStyle $io): void
    {
        $io->section('Processing Trust Score Drops');
        $conn = $this->entityManager->getConnection();

        $rows = $conn->fetchAllAssociative('
            WITH ranked AS (
                SELECT
                    listing_id,
                    score,
                    breakdown,
                    LAG(score) OVER (PARTITION BY listing_id ORDER BY id) AS prev_score,
                    LAG(breakdown) OVER (PARTITION BY listing_id ORDER BY id) AS prev_breakdown
                FROM trust_score_history
            )
            SELECT DISTINCT ON (listing_id) listing_id, prev_score, score, breakdown, prev_breakdown
            FROM ranked
            WHERE prev_score IS NOT NULL
            AND prev_score - score >= 10
            ORDER BY listing_id, id DESC
        ');

        $count = 0;
        foreach ($rows as $row) {
            $listingId = (int) $row['listing_id'];
            $oldScore = (float) $row['prev_score'];
            $newScore = (float) $row['score'];

            $listing = $this->entityManager->getRepository(ProductListing::class)->find($listingId);
            if (!$listing) continue;

            $seller = $listing->getSeller();
            if (!$seller) continue;

            $company = $this->entityManager->getRepository(B2BCompany::class)->findOneBy(['seller' => $seller]);
            if (!$company) continue;

            $delta = $oldScore - $newScore;
            if ($delta < 10) continue;

            $oldBreakdown = $row['prev_breakdown'] !== null ? json_decode($row['prev_breakdown'], true) ?? [] : [];
            $newBreakdown = $row['breakdown'] !== null ? json_decode($row['breakdown'], true) ?? [] : [];
            $breakdownChanges = [];
            $allKeys = array_unique(array_merge(array_keys($oldBreakdown), array_keys($newBreakdown)));
            foreach ($allKeys as $key) {
                $oldVal = (float) ($oldBreakdown[$key] ?? 0);
                $newVal = (float) ($newBreakdown[$key] ?? 0);
                $diff = $newVal - $oldVal;
                if (abs($diff) > 0.01) {
                    $breakdownChanges[$key] = $diff;
                }
            }

            $io->writeln(sprintf('  Trust drop: listing #%d (%.0f -> %.0f, -%.0fpts)', $listingId, $oldScore, $newScore, $delta));

            $this->notificationService->alertTrustDrop($company, $listing, $oldScore, $newScore, $breakdownChanges);
            ++$count;
        }

        $io->writeln(sprintf('  Generated %d trust drop alert(s).', $count));
    }

    private function processSubscriptionExpiry(SymfonyStyle $io): void
    {
        $io->section('Processing Subscription Expiry Warnings');

        $threshold = (new \DateTimeImmutable())->modify('+7 days');

        $expiring = $this->entityManager->createQueryBuilder()
            ->select('sub')
            ->from(Subscription::class, 'sub')
            ->where('sub.active = true')
            ->andWhere('sub.end_date IS NOT NULL')
            ->andWhere('sub.end_date <= :threshold')
            ->andWhere('sub.end_date > :now')
            ->setParameter('threshold', $threshold)
            ->setParameter('now', new \DateTimeImmutable())
            ->getQuery()
            ->getResult();

        $count = 0;
        foreach ($expiring as $subscription) {
            $endDate = $subscription->getEndDate();
            if (!$endDate) continue;

            $daysLeft = (int) (new \DateTimeImmutable())->diff($endDate)->days;
            $this->notificationService->notifySubscriptionExpiryWarning($subscription, $daysLeft);
            ++$count;
        }

        $io->writeln(sprintf('  Sent %d subscription expiry warning(s).', $count));
    }

    private function calculateRecentOOSRate($listing): float
    {
        $conn = $this->entityManager->getConnection();
        $rows = $conn->fetchAllAssociative(
            'SELECT out_of_stock FROM price_history WHERE product_listing_id = ? ORDER BY recorded_at DESC LIMIT 20',
            [$listing->getId()]
        );

        if (empty($rows)) return 0.0;

        $oosCount = count(array_filter($rows, fn($r) => (bool)$r['out_of_stock']));
        return $oosCount / count($rows);
    }
}
