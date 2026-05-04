<?php
require 'vendor/autoload.php';

use App\Kernel;
use Symfony\Component\Dotenv\Dotenv;

(new Dotenv())->bootEnv(__DIR__.'/.env');

$kernel = new Kernel('dev', true);
$kernel->boot();
$container = $kernel->getContainer();
$entityManager = $container->get('doctrine.orm.entity_manager');
$controller = clone $container->get('App\Controller\B2BWorkspaceController');

$user = $entityManager->getRepository(\App\Entity\B2BMarket::class)->find(20);
$repo = $entityManager->getRepository(\App\Entity\ProductListing::class);

$reflection = new \ReflectionMethod(get_class($controller), 'fetchWorkspaceListings');
$reflection->setAccessible(true);
$rows = $reflection->invoke($controller, $user, $repo, $entityManager);

echo "Fetched " . count($rows) . " listings for istore.\n";

$reflectionShare = new \ReflectionMethod(get_class($controller), 'buildShareOfShelf');
$reflectionShare->setAccessible(true);
$share = $reflectionShare->invoke($controller, $user, $rows, $entityManager);

echo "Share of shelf:\n";
print_r($share);
