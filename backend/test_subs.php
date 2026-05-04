<?php
require 'vendor/autoload.php';

use App\Kernel;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Dotenv\Dotenv;

(new Dotenv())->bootEnv(__DIR__.'/.env');

$kernel = new Kernel('dev', true);
$kernel->boot();

$req = Request::create('/api/b2b/admin/subscriptions', 'GET');
$req->headers->set('X-Admin-Api-Key', 'dev-admin-api-key-change-me');
$req->headers->set('X-Admin-Role', 'ROLE_SUPER_ADMIN');
$req->headers->set('X-Admin-Id', '1');

try {
    $res = $kernel->handle($req);
    echo "STATUS: " . $res->getStatusCode() . "\n";
    echo "CONTENT: " . substr(strip_tags($res->getContent()), 0, 1000) . "\n";
} catch (\Throwable $e) {
    echo "FATAL: " . $e->getMessage() . "\n";
}
