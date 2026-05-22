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
        $io->section('Processing Market Alerts (Dispersion, Brand OOS, Price Spikes, Shelf Share)');
        $markets = $this->entityManager->getRepository(B2BMarket::class)->findBy(['b2b_status' => 'ACTIVE']);
        $conn = $this->entityManager->getConnection();

        foreach ($markets as $market) {
            $brandName = $market->getCompanyName();
            if (!$brandName) continue;

            // 1. Price dispersion (existing)
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

                if ($dispersion > 25) {
                    $productName = $conn->fetchOne('SELECT name FROM product WHERE id = ?', [$pid]);
                    $this->notificationService->alertDispersionAnomaly($market, (string) $productName, $dispersion);
                }
            }

            // 2. Brand OOS detection
            $this->detectMarketBrandOOS($conn, $market, $brandName, $io);

            // 3. Price spike detection
            $this->detectMarketPriceSpike($conn, $market, $brandName, $io);

            // 4. Shelf share drop detection
            $this->detectMarketShelfShareDrop($conn, $market, $brandName, $io);

            // 5. Sentiment shift detection
            $this->detectMarketSentimentShift($conn, $market, $brandName, $io);

            // 6. New reseller detection
            $this->detectNewResellers($conn, $market, $brandName, $io);
        }
    }

    private function detectMarketBrandOOS(\Doctrine\DBAL\Connection $conn, B2BMarket $market, string $brandName, SymfonyStyle $io): void
    {
        $products = $conn->fetchAllAssociative(
            "SELECT p.id, p.name,
                    COUNT(pl.id) AS total_count,
                    SUM(CASE WHEN pl.availability = 'out_of_stock' THEN 1 ELSE 0 END) AS oos_count
             FROM product p
             JOIN product_listing pl ON pl.product_id = p.id AND pl.is_active = true
             WHERE LOWER(p.brand) = LOWER(:brand)
             GROUP BY p.id, p.name
             HAVING COUNT(pl.id) > 1
             AND SUM(CASE WHEN pl.availability = 'out_of_stock' THEN 1 ELSE 0 END) >= 2",
            ['brand' => $brandName]
        );

        foreach ($products as $row) {
            $oosSellers = $conn->fetchFirstColumn(
                "SELECT s.name FROM seller s
                 JOIN product_listing pl ON pl.seller_id = s.id
                 WHERE pl.product_id = :pid AND pl.is_active = true AND pl.availability = 'out_of_stock'
                 ORDER BY s.name",
                ['pid' => (int) $row['id']],
                ['pid' => \Doctrine\DBAL\ParameterType::INTEGER]
            );
            $totalSellers = (int) $conn->fetchOne(
                'SELECT COUNT(DISTINCT pl.seller_id) FROM product_listing pl
                 WHERE pl.product_id = :pid AND pl.is_active = true',
                ['pid' => (int) $row['id']]
            );
            $remainingSellers = $totalSellers - count($oosSellers);

            $this->notificationService->notifyMarketBrandOOS(
                $market,
                $brandName,
                (string) $row['name'],
                $oosSellers,
                $remainingSellers
            );
            $io->writeln(sprintf('  Brand OOS: %s %s — OOS at %d seller(s), %d remaining', $brandName, $row['name'], count($oosSellers), $remainingSellers));
        }
    }

    private function detectMarketPriceSpike(\Doctrine\DBAL\Connection $conn, B2BMarket $market, string $brandName, SymfonyStyle $io): void
    {
        $now = new \DateTimeImmutable();
        $todayStart = $now->format('Y-m-d 00:00:00');
        $yesterdayStart = $now->modify('-1 day')->format('Y-m-d 00:00:00');

        $rows = $conn->fetchAllAssociative(
            "SELECT c.id AS category_id, c.name AS category_name,
                    AVG(CASE WHEN pl.updated_at >= :today THEN pl.price END) AS avg_today,
                    AVG(CASE WHEN pl.updated_at >= :yesterday AND pl.updated_at < :today THEN pl.price END) AS avg_yesterday
             FROM product_listing pl
             JOIN product p ON p.id = pl.product_id
             JOIN category c ON c.id = p.category_id
             WHERE LOWER(p.brand) = LOWER(:brand)
             AND pl.is_active = true
             AND pl.price IS NOT NULL
             GROUP BY c.id, c.name",
            [
                'brand' => $brandName,
                'today' => $todayStart,
                'yesterday' => $yesterdayStart,
            ]
        );

        foreach ($rows as $row) {
            $avgToday = $row['avg_today'] !== null ? (float) $row['avg_today'] : 0;
            $avgYesterday = $row['avg_yesterday'] !== null ? (float) $row['avg_yesterday'] : 0;
            if ($avgYesterday <= 0 || $avgToday <= 0) continue;

            $spikePct = (($avgToday - $avgYesterday) / $avgYesterday) * 100;
            if ($spikePct > 5) {
                $this->notificationService->notifyMarketPriceSpike($market, (string) $row['category_name'], $spikePct);
                $io->writeln(sprintf('  Price spike: %s — %.1f%% spike in %s', $brandName, $spikePct, $row['category_name']));
            }
        }
    }

    private function detectMarketShelfShareDrop(\Doctrine\DBAL\Connection $conn, B2BMarket $market, string $brandName, SymfonyStyle $io): void
    {
        $thisWeek = (new \DateTimeImmutable())->modify('monday this week')->format('Y-m-d');
        $lastWeek = (new \DateTimeImmutable())->modify('monday this week')->modify('-7 days')->format('Y-m-d');

        $rows = $conn->fetchAllAssociative(
            'SELECT t.category_id, t.seller_name, t.share_percent AS this_share,
                    l.share_percent AS last_share
             FROM market_shelf_snapshot t
             LEFT JOIN market_shelf_snapshot l
                 ON l.market_id = t.market_id
                 AND l.category_id = t.category_id
                 AND l.seller_name = t.seller_name
                 AND l.snapshot_week = :last_week
             WHERE t.market_id = :mid
             AND t.snapshot_week = :this_week',
            [
                'mid' => $market->getId(),
                'this_week' => $thisWeek,
                'last_week' => $lastWeek,
            ]
        );

        foreach ($rows as $row) {
            $lastShare = $row['last_share'] !== null ? (float) $row['last_share'] : null;
            $thisShare = (float) $row['this_share'];
            if ($lastShare === null) continue;

            $drop = $lastShare - $thisShare;
            if ($drop > 5) {
                $categoryName = $conn->fetchOne('SELECT name FROM category WHERE id = ?', [(int) $row['category_id']]);
                $this->notificationService->notifyMarketShelfShareDrop(
                    $market,
                    $brandName,
                    (string) $categoryName,
                    $lastShare,
                    $thisShare
                );
                $io->writeln(sprintf('  Shelf share drop: %s in %s — %.0f%% to %.0f%% (-%.0f%%)', $brandName, $categoryName, $lastShare, $thisShare, $drop));
            }
        }
    }

    private function detectMarketSentimentShift(\Doctrine\DBAL\Connection $conn, B2BMarket $market, string $brandName, SymfonyStyle $io): void
    {
        $now = new \DateTimeImmutable();
        $recentStart = $now->modify('-30 days')->format('Y-m-d');
        $priorStart = $now->modify('-60 days')->format('Y-m-d');
        $priorEnd = $now->modify('-30 days')->format('Y-m-d');

        $rows = $conn->fetchAllAssociative(
            "SELECT
                CASE
                    WHEN r.created_at >= :recent THEN 'recent'
                    WHEN r.created_at >= :prior_start AND r.created_at < :prior_end THEN 'prior'
                END AS period,
                COUNT(r.id) AS total,
                SUM(CASE WHEN r.rating >= 4 THEN 1 ELSE 0 END) AS positive,
                SUM(CASE WHEN r.rating <= 2 THEN 1 ELSE 0 END) AS negative
             FROM review r
             JOIN product_listing pl ON pl.id = r.product_listing_id
             JOIN product p ON p.id = pl.product_id
             WHERE LOWER(p.brand) = LOWER(:brand)
               AND r.status = 'approved'
               AND r.created_at >= :prior_start
             GROUP BY period",
            [
                'brand' => $brandName,
                'recent' => $recentStart,
                'prior_start' => $priorStart,
                'prior_end' => $priorEnd,
            ]
        );

        $recentNss = null;
        $priorNss = null;

        foreach ($rows as $row) {
            $total = (int) $row['total'];
            if ($total === 0) continue;
            $positive = (int) $row['positive'];
            $negative = (int) $row['negative'];
            $nss = (int) round((($positive - $negative) / $total) * 100);

            if ($row['period'] === 'recent') {
                $recentNss = $nss;
            } elseif ($row['period'] === 'prior') {
                $priorNss = $nss;
            }
        }

        if ($recentNss === null || $priorNss === null) return;

        $drop = $priorNss - $recentNss;
        if ($drop >= 10) {
            // Find top complaint keyword from recent reviews
            $topComplaint = (string) $conn->fetchOne(
                "SELECT r.comment FROM review r
                 JOIN product_listing pl ON pl.id = r.product_listing_id
                 JOIN product p ON p.id = pl.product_id
                 WHERE LOWER(p.brand) = LOWER(:brand)
                   AND r.status = 'approved'
                   AND r.rating <= 2
                   AND r.created_at >= :recent
                   AND r.comment IS NOT NULL AND r.comment != ''
                 ORDER BY r.created_at DESC LIMIT 1",
                ['brand' => $brandName, 'recent' => $recentStart]
            );

            $this->notificationService->notifyMarketSentimentShift(
                $market,
                $brandName,
                $priorNss,
                $recentNss,
                $topComplaint
            );
            $io->writeln(sprintf('  Sentiment shift: %s — NSS dropped from %d to %d (-%d pts)', $brandName, $priorNss, $recentNss, $drop));
        }
    }

    private function detectNewResellers(\Doctrine\DBAL\Connection $conn, B2BMarket $market, string $brandName, SymfonyStyle $io): void
    {
        $sevenDaysAgo = (new \DateTimeImmutable())->modify('-7 days')->format('Y-m-d');

        $rows = $conn->fetchAllAssociative(
            "SELECT p.id, p.name, pl.seller_id, s.name AS seller_name, pl.created_at
             FROM product_listing pl
             JOIN product p ON p.id = pl.product_id
             JOIN seller s ON s.id = pl.seller_id
             WHERE LOWER(p.brand) = LOWER(:brand)
               AND pl.is_active = true
               AND pl.created_at >= :since
             ORDER BY pl.created_at DESC",
            ['brand' => $brandName, 'since' => $sevenDaysAgo]
        );

        foreach ($rows as $row) {
            $productId = (int) $row['id'];
            $sellerId = (int) $row['seller_id'];

            $hasHistory = (int) $conn->fetchOne(
                'SELECT COUNT(ph.id) FROM price_history ph
                 WHERE ph.product_listing_id IN (
                     SELECT pl2.id FROM product_listing pl2
                     WHERE pl2.product_id = :pid AND pl2.seller_id = :sid
                 ) AND ph.recorded_at < :since',
                [
                    'pid' => $productId,
                    'sid' => $sellerId,
                    'since' => $sevenDaysAgo,
                ]
            );

            if ($hasHistory === 0) {
                $this->notificationService->notifyNewReseller(
                    $market,
                    $brandName,
                    (string) $row['name'],
                    (string) $row['seller_name']
                );
                $io->writeln(sprintf('  New reseller: %s now selling "%s" via %s', $brandName, $row['name'], $row['seller_name']));
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
            $io->writeln(sprintf('  Expired sponsorship #%d for product "%s"', $article->getId(), $article->getProductListing()?->getProduct()?->getName() ?? 'Unknown'));
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
