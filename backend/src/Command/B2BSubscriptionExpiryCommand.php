<?php

namespace App\Command;

use App\Entity\Subscription;
use App\Service\B2BNotificationService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:b2b:check-expiry',
    description: 'Checks for B2B subscriptions expiring soon and sends warning notifications.',
)]
final class B2BSubscriptionExpiryCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly B2BNotificationService $notificationService,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('days', 'd', InputOption::VALUE_OPTIONAL, 'Days threshold for expiry warning (default: 7)', 7);
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $days = max(1, (int) $input->getOption('days'));

        $io->title(sprintf('B2B Subscription Expiry Check (≤ %d days)', $days));

        $threshold = (new \DateTimeImmutable())->modify("+{$days} days");

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

        if (empty($expiring)) {
            $io->success('No expiring subscriptions found.');
            return Command::SUCCESS;
        }

        $io->info(sprintf('Found %d expiring subscription(s).', count($expiring)));

        foreach ($expiring as $subscription) {
            $endDate = $subscription->getEndDate();
            if (!$endDate) continue;

            $daysLeft = (int) (new \DateTimeImmutable())->diff($endDate)->days;
            $companyName = 'Unknown';
            $ownerId = $subscription->getOwnerId();
            $ownerType = $subscription->getOwnerType();
            if ($ownerType === 'COMPANY' && $ownerId !== null) {
                $company = $this->entityManager->find(\App\Entity\B2BCompany::class, $ownerId);
                $companyName = $company?->getName() ?? 'Unknown';
            } elseif ($ownerType === 'MARKET' && $ownerId !== null) {
                $market = $this->entityManager->find(\App\Entity\B2BMarket::class, $ownerId);
                $companyName = $market?->getName() ?? 'Unknown';
            }

            $io->text(sprintf(
                '  • %s (plan: %s, expires in %d days)',
                $companyName,
                $subscription->getPlanType(),
                $daysLeft
            ));

            $this->notificationService->notifySubscriptionExpiryWarning($subscription, $daysLeft);
        }

        $io->success(sprintf('Sent %d expiry warning(s).', count($expiring)));

        return Command::SUCCESS;
    }
}
