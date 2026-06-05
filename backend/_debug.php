<?php
$_SERVER["DATABASE_URL"] = "pgsql://postgres:postgres@localhost:5432/productradar?charset=utf8";
$_ENV["DATABASE_URL"] = "pgsql://postgres:postgres@localhost:5432/productradar?charset=utf8";

require_once __DIR__ . "/vendor/autoload.php";

$kernel = new \App\Kernel("dev", true);
$kernel->boot();
$conn = $kernel->getContainer()->get("doctrine.dbal.default_connection");

// Check what categories exist
echo "=== Category Tree Overview ===\n";
// Show top categories with count of products in each (recursively)
$topCats = $conn->fetchAllAssociative("SELECT id, name FROM category WHERE parent_id IS NULL ORDER BY name");
foreach ($topCats as $tc) {
    $allIds = $conn->fetchFirstColumn(
        "WITH RECURSIVE tree_cte AS (
            SELECT id FROM category WHERE id = ?
            UNION ALL
            SELECT c.id FROM category c JOIN tree_cte t ON c.parent_id = t.id
        ) SELECT id FROM tree_cte",
        [$tc["id"]]
    );
    $placeholders = implode(",", array_fill(0, count($allIds), "?"));
    $prodCount = $conn->fetchOne("SELECT COUNT(*) FROM product WHERE category_id IN ($placeholders)", $allIds);
    echo "  {$tc["name"]} (root id:{$tc["id"]}) -> " . count($allIds) . " sub-cats, $prodCount products\n";
    
    // Show direct children names
    $children = $conn->fetchAllAssociative("SELECT id, name FROM category WHERE parent_id = ? ORDER BY name", [$tc["id"]]);
    foreach ($children as $ch) {
        $subAllIds = $conn->fetchFirstColumn(
            "WITH RECURSIVE tree_cte AS (
                SELECT id FROM category WHERE id = ?
                UNION ALL
                SELECT c.id FROM category c JOIN tree_cte t ON c.parent_id = t.id
            ) SELECT id FROM tree_cte",
            [$ch["id"]]
        );
        $placeholders2 = implode(",", array_fill(0, count($subAllIds), "?"));
        $subProdCount = $conn->fetchOne("SELECT COUNT(*) FROM product WHERE category_id IN ($placeholders2)", $subAllIds);
        echo "    - {$ch["name"]} (id:{$ch["id"]}) -> " . count($subAllIds) . " sub-cats, $subProdCount products\n";
    }
}

// Find a server product
echo "\n=== Server Product Category Path ===\n";
$serverProducts = $conn->fetchAllAssociative(
    "SELECT p.id, p.name, p.category_id, c.name as cat_name 
     FROM product p 
     LEFT JOIN category c ON c.id = p.category_id 
     WHERE p.name ILIKE '%serveur%' AND p.name ILIKE '%lenovo%'
     LIMIT 5"
);
if (!empty($serverProducts)) {
    foreach ($serverProducts as $sp) {
        echo "Product #{$sp["id"]}: {$sp["name"]}\n";
        echo "  Category: {$sp["cat_name"]} (id:{$sp["category_id"]})\n";
        
        $path = $conn->fetchAllAssociative(
            "WITH RECURSIVE cat_path AS (
                SELECT id, name, parent_id, 0 as lvl FROM category WHERE id = ?
                UNION ALL
                SELECT c.id, c.name, c.parent_id, cp.lvl + 1 FROM category c JOIN cat_path cp ON c.id = cp.parent_id
            ) SELECT id, name, lvl FROM cat_path ORDER BY lvl DESC",
            [$sp["category_id"]]
        );
        foreach ($path as $p) {
            echo "    " . str_repeat("  ", $p["lvl"]) . $p["name"] . " (id:" . $p["id"] . ")\n";
        }
    }
}

// Also find a MacBook to compare
echo "\n=== MacBook Category Path ===\n";
$macProducts = $conn->fetchAllAssociative(
    "SELECT p.id, p.name, p.category_id, c.name as cat_name 
     FROM product p 
     LEFT JOIN category c ON c.id = p.category_id 
     WHERE p.name ILIKE '%macbook%'
     LIMIT 5"
);
if (!empty($macProducts)) {
    foreach ($macProducts as $mp) {
        echo "Product #{$mp["id"]}: {$mp["name"]}\n";
        echo "  Category: {$mp["cat_name"]} (id:{$mp["category_id"]})\n";
        
        $path = $conn->fetchAllAssociative(
            "WITH RECURSIVE cat_path AS (
                SELECT id, name, parent_id, 0 as lvl FROM category WHERE id = ?
                UNION ALL
                SELECT c.id, c.name, c.parent_id, cp.lvl + 1 FROM category c JOIN cat_path cp ON c.id = cp.parent_id
            ) SELECT id, name, lvl FROM cat_path ORDER BY lvl DESC",
            [$mp["category_id"]]
        );
        foreach ($path as $p) {
            echo "    " . str_repeat("  ", $p["lvl"]) . $p["name"] . " (id:" . $p["id"] . ")\n";
        }
    }
}

$kernel->shutdown();
