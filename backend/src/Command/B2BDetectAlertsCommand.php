<?php

namespace App\Command;

use App\Entity\B2BCompany;
use App\Entity\B2BMarket;
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
                    $this->notificationService->alertStockShortage($company, $listing->getProductName(), 'HIGH');
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
