<?php
require __DIR__ . '/vendor/autoload.php';

$kernel = new \App\Kernel('dev', true);
$kernel->boot();
$container = $kernel->getContainer();
$em = $container->get('doctrine.orm.entity_manager');

$conn = $em->getConnection();

// Test 1: Brand query with quoted aliases
try {
    $brandName = 'apple';
    $result = $conn->fetchAllAssociative(
        'SELECT c.id AS "categoryId", c.name AS "categoryName", COUNT(pl.id) AS brand_count
         FROM product_listing pl
         JOIN product p ON p.id = pl.product_id
         JOIN category c ON c.id = p.category_id
         WHERE LOWER(p.brand) = :brand
         AND pl.is_active = true
         GROUP BY c.id, c.name',
        ['brand' => $brandName]
    );
    echo "Test 1 OK: " . count($result) . " rows\n";
    foreach ($result as $r) {
        echo "  {$r['categoryId']}: {$r['categoryName']} = {$r['brand_count']}\n";
    }
} catch (\Throwable $e) {
    echo "TEST 1 FAILED: " . $e->getMessage() . "\n";
}

// Test 2: Total products query with array parameter
try {
    $catIds = [1, 2, 3];
    $result = $conn->fetchAllAssociative(
        'SELECT c.id AS "categoryId", s.name AS "competitorName", COUNT(pl.id) AS itemCount
         FROM product_listing pl
         JOIN product p ON p.id = pl.product_id
         JOIN category c ON c.id = p.category_id
         JOIN seller s ON s.id = pl.seller_id
         WHERE c.id IN (:categoryIds)
         AND pl.is_active = true
         GROUP BY c.id, s.name',
        ['categoryIds' => $catIds],
        ['categoryIds' => \Doctrine\DBAL\ArrayParameterType::INTEGER]
    );
    echo "Test 2 OK: " . count($result) . " rows\n";
} catch (\Throwable $e) {
    echo "TEST 2 FAILED: " . $e->getMessage() . "\n";
}
