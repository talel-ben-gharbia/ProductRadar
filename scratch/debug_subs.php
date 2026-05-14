<?php
require __DIR__ . '/../backend/vendor/autoload.php';
use App\Kernel;
use App\Entity\Subscription;
use Symfony\Component\Dotenv\Dotenv;

$dotenv = new Dotenv();
$dotenv->load(__DIR__ . '/../backend/.env');

$kernel = new Kernel('dev', true);
$kernel->boot();
$container = $kernel->getContainer();
$em = $container->get('doctrine.orm.entity_manager');

$subs = $em->getRepository(Subscription::class)->findAll();
echo "Total Subscriptions: " . count($subs) . "\n";
foreach ($subs as $sub) {
    echo "ID: " . $sub->getId() . " | Owner: " . $sub->getOwnerType() . "#" . $sub->getOwnerId() . " | Plan: " . $sub->getPlanType() . " | Active: " . ($sub->isActive() ? 'YES' : 'NO') . " | End: " . ($sub->getEndDate()?->format('Y-m-d') ?? 'N/A') . "\n";
}
