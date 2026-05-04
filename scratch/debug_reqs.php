<?php
require __DIR__ . '/../backend/vendor/autoload.php';
use App\Kernel;
use App\Entity\PartnerRequest;
use Symfony\Component\Dotenv\Dotenv;

$dotenv = new Dotenv();
$dotenv->load(__DIR__ . '/../backend/.env');

$kernel = new Kernel('dev', true);
$kernel->boot();
$container = $kernel->getContainer();
$em = $container->get('doctrine.orm.entity_manager');

$reqs = $em->getRepository(PartnerRequest::class)->findAll();
echo "Total Partner Requests: " . count($reqs) . "\n";
foreach ($reqs as $req) {
    echo "ID: " . $req->getId() . " | Email: " . $req->getEmail() . " | Company: " . $req->getCompanyName() . "\n";
}
