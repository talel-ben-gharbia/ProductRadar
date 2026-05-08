<?php

namespace App\Command;

use App\Service\TrustScoreCalculationService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:trust-score:recalculate',
    description: 'Recalculates trust scores for stale product listings (incremental). Use --full for all.',
)]
final class TrustScoreRecalculateCommand extends Command
{
    public function __construct(
        private readonly TrustScoreCalculationService $trustScoreService,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('full', null, InputOption::VALUE_NONE, 'Recalculate ALL active listings (not just stale)');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $start = microtime(true);

        try {
            if ($input->getOption('full')) {
                $io->title('Full Trust Score Recalculation');
                $io->section('Recalculating all active listings...');
                $updated = $this->trustScoreService->recalculateAllListings();
            } else {
                $io->title('Incremental Trust Score Recalculation');
                $io->section('Recalculating only stale listings (new price history)...');
                $updated = $this->trustScoreService->recalculateStaleListings();
            }

            $elapsed = microtime(true) - $start;
            $io->success(sprintf(
                'Updated trust scores for %d listings in %.2f seconds.',
                $updated,
                $elapsed
            ));

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $io->error('Error during trust score recalculation: ' . $e->getMessage());

            return Command::FAILURE;
        }
    }
}
