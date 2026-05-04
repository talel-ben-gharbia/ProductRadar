<?php

namespace App\Command;

use App\Repository\PriceHistoryRepository;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:best-time-to-buy:export-training-data',
    description: 'Export real price history rows into a CSV file for Best Time To Buy model training.',
)]
final class ExportBestTimeToBuyTrainingDataCommand extends Command
{
    public function __construct(
        private readonly PriceHistoryRepository $priceHistoryRepository,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption(
            'output',
            'o',
            InputOption::VALUE_OPTIONAL,
            'CSV output path',
            dirname(__DIR__, 2) . '/var/best_time_to_buy_training.csv'
        );
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $outputPath = (string) $input->getOption('output');

        $rows = $this->priceHistoryRepository->findTrainingRows();
        if ($rows === []) {
            $io->error('No price history rows found.');

            return Command::FAILURE;
        }

        $directory = dirname($outputPath);
        if (!is_dir($directory) && !@mkdir($directory, 0777, true) && !is_dir($directory)) {
            $io->error(sprintf('Unable to create directory: %s', $directory));

            return Command::FAILURE;
        }

        $handle = fopen($outputPath, 'wb');
        if ($handle === false) {
            $io->error(sprintf('Unable to open output file: %s', $outputPath));

            return Command::FAILURE;
        }

        fputcsv($handle, [
            'product_id',
            'listing_id',
            'recorded_at',
            'recorded_price',
            'anomaly',
            'out_of_stock',
            'trust_score',
        ]);

        foreach ($rows as $row) {
            fputcsv($handle, [
                $row['productId'] ?? null,
                $row['listingId'] ?? null,
                $row['recordedAt'] instanceof \DateTimeInterface ? $row['recordedAt']->format(DATE_ATOM) : ($row['recordedAt'] ?? null),
                $row['recordedPrice'] ?? null,
                isset($row['anomaly']) ? (int) ((bool) $row['anomaly']) : 0,
                isset($row['outOfStock']) ? (int) ((bool) $row['outOfStock']) : 0,
                $row['trustScore'] ?? null,
            ]);
        }

        fclose($handle);

        $io->success(sprintf('Exported %d rows to %s', count($rows), $outputPath));

        return Command::SUCCESS;
    }
}
