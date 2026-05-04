<?php
require __DIR__ . '/../backend/vendor/autoload.php';
use App\Kernel;
use App\Entity\B2BSubscription;
use Symfony\Component\Dotenv\Dotenv;

$dotenv = new Dotenv();
$dotenv->load(__DIR__ . '/../backend/.env');

$kernel = new Kernel('dev', true);
$kernel->boot();
$container = $kernel->getContainer();
$em = $container->get('doctrine.orm.entity_manager');

$subs = $em->getRepository(B2BSubscription::class)->findAll();
echo "Total B2B Subscriptions: " . count($subs) . "\n";
foreach ($subs as $sub) {
    echo "ID: " . $sub->getId() . " | Plan: " . $sub->getPlanType() . " | Active: " . ($sub->isActive() ? 'YES' : 'NO') . " | End: " . ($sub->getEndDate()?->format('Y-m-d') ?? 'N/A') . "\n";
}
