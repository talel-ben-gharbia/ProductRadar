<?php

namespace App;

use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Master scheduler command — runs all periodic maintenance tasks.
 *
 * Recommended Windows Task Scheduler setup (daily at midnight):
 *   Task Name: ProductRdar Scheduler
 *   Trigger: Daily at 12:00 AM
 *   Action:
 *     Program: C:\xampp\php\php.exe
 *     Arguments: C:\path\to\backend\bin\console app:scheduler:run
 *
 * Linux cron (daily at midnight):
 *   0 0 * * * cd /path/to/backend && php bin/console app:scheduler:run >> var/log/scheduler.log 2>&1
 *
 * Additional recommended (daily full recalc at 2AM):
 *   0 2 * * * cd /path/to/backend && php bin/console app:trust-score:recalculate --full >> var/log/trust_score.log 2>&1
 *
 * Event consumer daemon (run continuously — NOT a cron):
 *   Linux supervisord: php bin/console app:events:consume
 *   Windows: use nssm to run as a Windows service
 */
#[AsCommand(
    name: 'app:scheduler:run',
    description: 'Run all periodic maintenance tasks (trust score incremental + subscription expiry + event outbox).',
)]
final class Scheduler extends Command
{
    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('Scheduler — Running periodic tasks');

        $app = $this->getApplication();
        if ($app === null) {
            $io->error('Cannot access application.');

            return Command::FAILURE;
        }

        $tasks = [
            'app:trust-score:recalculate' => [],
            'app:b2b:check-expiry'        => [],
            'app:events:consume'          => ['--one-shot' => true],
        ];

        $exitCode = Command::SUCCESS;

        foreach ($tasks as $cmd => $args) {
            $io->section("Running: $cmd");
            try {
                $task = $app->find($cmd);
                $taskExit = $task->run(new ArrayInput($args), $output);
                if ($taskExit !== Command::SUCCESS) {
                    $io->warning("$cmd exited with code $taskExit");
                    $exitCode = Command::FAILURE;
                }
            } catch (\Throwable $e) {
                $io->error("$cmd failed: " . $e->getMessage());
                $exitCode = Command::FAILURE;
            }
        }

        if ($exitCode === Command::SUCCESS) {
            $io->success('All scheduled tasks completed.');
        }

        return $exitCode;
    }
}
