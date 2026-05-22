<?php

namespace App\Command;

use App\Entity\B2BMarket;
use App\Service\BrandDiscoveryService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:b2b:refresh-brand-scope',
    description: 'Refreshes brand_keywords for B2B Market accounts using the snowball discovery algorithm.',
)]
final class RefreshMarketBrandScopeCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly BrandDiscoveryService $brandDiscoveryService,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('market-id', null, InputOption::VALUE_REQUIRED, 'Refresh a single market by ID')
            ->addOption('all', null, InputOption::VALUE_NONE, 'Refresh all markets')
            ->addOption('stale', null, InputOption::VALUE_NONE, 'Refresh only markets not discovered in >3 days');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('B2B Market Brand Scope Refresh');

        $marketId = $input->getOption('market-id');
        $all = (bool) $input->getOption('all');
        $stale = (bool) $input->getOption('stale');

        if ($marketId) {
            return $this->refreshSingle((int) $marketId, $io);
        }

        if ($all || $stale) {
            return $this->refreshBatch($stale, $io);
        }

        $io->warning('No option provided. Use --market-id=N, --all, or --stale.');
        $io->text('  php bin/console app:b2b:refresh-brand-scope --market-id=5');
        $io->text('  php bin/console app:b2b:refresh-brand-scope --all');
        $io->text('  php bin/console app:b2b:refresh-brand-scope --stale');

        return Command::SUCCESS;
    }

    private function refreshSingle(int $marketId, SymfonyStyle $io): int
    {
        $market = $this->entityManager->getRepository(B2BMarket::class)->find($marketId);
        if (!$market instanceof B2BMarket) {
            $io->error("Market #{$marketId} not found.");
            return Command::FAILURE;
        }

        if ($market->getBrandName() === null || $market->getBrandName() === '') {
            $io->warning("Market #{$marketId} ({$market->getCompanyName()}) has no brand_name — skipping.");
            return Command::FAILURE;
        }

        $io->text("Refreshing brand scope for Market #{$marketId}: {$market->getCompanyName()} ({$market->getBrandName()})...");

        try {
            $keywords = $this->brandDiscoveryService->discover($market);
            $io->success(sprintf(
                'Market #%d: %d products, %d brand variations, %d one-shot keywords, %d sellers',
                $marketId,
                $keywords['product_count_estimate'] ?? 0,
                count($keywords['brands'] ?? []),
                count($keywords['one_shot_keywords'] ?? []),
                count($keywords['seller_ids'] ?? [])
            ));
            return Command::SUCCESS;
        } catch (\Throwable $e) {
            $io->error("Discovery failed for Market #{$marketId}: {$e->getMessage()}");
            return Command::FAILURE;
        }
    }

    private function refreshBatch(bool $staleOnly, SymfonyStyle $io): int
    {
        $markets = $this->entityManager->getRepository(B2BMarket::class)->findAll();
        $io->info(sprintf('Found %d market(s)', count($markets)));

        $staleCutoff = new \DateTimeImmutable('-3 days');
        $success = 0;
        $skipped = 0;
        $failed = 0;

        foreach ($markets as $market) {
            if (!$market instanceof B2BMarket) continue;
            if ($market->getBrandName() === null || $market->getBrandName() === '') {
                ++$skipped;
                continue;
            }

            if ($staleOnly) {
                $keywords = $market->getBrandKeywords();
                $lastDiscovered = isset($keywords['last_discovered_at'])
                    ? \DateTimeImmutable::createFromFormat(\DateTimeInterface::ATOM, $keywords['last_discovered_at'])
                    : null;
                if ($lastDiscovered !== null && $lastDiscovered > $staleCutoff) {
                    ++$skipped;
                    continue;
                }
            }

            $io->text("Refreshing Market #{$market->getId()}: {$market->getCompanyName()} ({$market->getBrandName()})...");

            try {
                $keywords = $this->brandDiscoveryService->discover($market);
                $io->text(sprintf('  ✓ %d products, %d brand variations, %d one-shot keywords',
                    $keywords['product_count_estimate'] ?? 0,
                    count($keywords['brands'] ?? []),
                    count($keywords['one_shot_keywords'] ?? [])
                ));
                ++$success;
            } catch (\Throwable $e) {
                $io->error("  ✗ Failed: {$e->getMessage()}");
                ++$failed;
            }
        }

        $io->newLine();
        $io->section('Summary');
        $io->text("Refreshed: {$success}");
        $io->text("Skipped: {$skipped}");
        $io->text("Failed: {$failed}");

        if ($failed > 0) {
            return Command::FAILURE;
        }

        return Command::SUCCESS;
    }
}
