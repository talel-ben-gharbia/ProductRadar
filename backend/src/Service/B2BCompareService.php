<?php

namespace App\Service;

use Doctrine\DBAL\ArrayParameterType;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Cache\CacheItemPoolInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

class B2BCompareService
{
    private const CACHE_PREFIX = 'compare_v3_';
    private const CACHE_TTL = 21600; // 6 hours

    private const FRENCH_COLORS = [
        'noir', 'blanc', 'rouge', 'bleu', 'vert', 'jaune', 'violet', 'pourpre',
        'rose', 'orange', 'gris', 'argent', 'or', 'marron', 'brun', 'beige',
        'turquoise', 'cyan', 'magenta', 'bordeaux', 'navy', 'olive', 'grenat',
        'sable', 'champagne', 'écru', 'ivoire', 'corail', 'indigo', 'prune',
        'bronze', 'cuivre', 'doré', 'argenté', 'transparent', 'multicolore',
    ];

    private const SPEC_KEY_MAP = [
        'ram' => [
            'mémoire ram', 'memoire ram', 'ram', 'mémoire vive', 'memoire vive',
            'capacité mémoire', 'capacite memoire', 'taille mémoire', 'taille memoire',
            'mémoire', 'memoire',
        ],
        'storage' => [
            'stockage', 'capacité du disque dur', 'capacite du disque dur',
            'capacité disque dur', 'capacite disque dur', 'disque dur',
            'mémoire interne', 'memoire interne', 'capacité de stockage', 'capacite de stockage',
            'type disque dur', 'storage',
        ],
        'screen' => [
            "taille de l'écran", "taille de l'ecran",
            "taille d'écran", "taille d'ecran",
            'taille ecran', 'taille écran', 'écran taille', 'ecran taille',
            'diagonale', 'taille du boitier',
            "taille de l'image", 'taille pc', 'taille pc portable',
            'screen', 'display',
        ],
        'resolution' => [
            'résolution', "résolution d'écran", "résolution d'ecran",
            "résolution d'écrans", "résolution d'ecrans",
            'résolution écran', 'resolution ecran',
            "résolution de l'écran", "resolution de l'ecran",
        ],
        'panel' => [
            "type d'écran", "type d'ecran", 'type écran', 'type ecran',
            'types de dalles', "technologie de l'écran", "technologie de l'ecran",
            'type de dalle', 'type de panneau', 'norme hd',
            'ecran', 'écran', 'dalle', 'panel',
        ],
        'refresh' => [
            'taux de rafraîchissement', 'taux de rafraichissement',
            'fréquence de rafraîchissement', 'frequence de rafraichissement',
            'fréquence', 'frequence', 'refresh rate', 'refresh', 'hz',
        ],
        'camera' => [
            'caméra arrière', 'camera arriere', 'appareil photo arrière', 'appareil photo arriere',
            'caméra', 'camera', 'appareil photo',
            'appareil photo frontale', 'caméra frontale', 'camera frontale',
            'résolution photo', 'resolution photo', 'capteur photo',
        ],
        'cpu' => [
            'processeur', 'cpu', 'chipset', 'type de processeur',
            'type processeur', 'référence processeur', 'reference processeur',
            'réf processeur', 'ref processeur', 'modèle processeur', 'modele processeur',
            'fréquence processeur', 'frequence processeur', 'processor',
        ],
        'gpu' => [
            'carte graphique', 'réf carte graphique', 'ref carte graphique',
            'type de carte graphique', 'puissance graphique', 'gpu',
            'chipset graphique',
        ],
        'os' => [
            "système d'exploitation", "systeme d'exploitation",
            'os', 'operating system', 'system', 'compatibilité os', 'compatibilite os',
        ],
        'color' => [
            'couleur', 'color', 'colour', 'colors',
        ],
        'battery' => [
            'capacité de la batterie', 'capacite de la batterie',
            'capacité de batterie', 'capacite de batterie',
            'batterie', 'battery', 'capacité batterie', 'capacite batterie',
            'autonomie', 'autonomie batterie', 'pile', 'mah',
        ],
        'weight' => [
            'poids', 'weight', 'masse',
        ],
        'water' => [
            "résistance à l'eau", "resistance a l'eau",
            'étanchéité', 'etancheite',
            "etanche à l'eau et à la poussière",
            "etanche a l'eau et a la poussiere",
            "résistant à l'eau", "resistant a l'eau",
            'certification ip', 'water resistance', 'indice ip', 'ip',
        ],
    ];

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly CacheItemPoolInterface $cache,
        private readonly LoggerInterface $logger,
    ) {
    }

    /**
     * @return array<int, array{id: int, matchType: string, reason: string}>
     */
    public function findCompetitors(int $productId, bool $refresh = false): array
    {
        $cacheKey = self::CACHE_PREFIX . $productId;

        if ($refresh) {
            $this->cache->deleteItem($cacheKey);
        }

        $cacheItem = $this->cache->getItem($cacheKey);
        if ($cacheItem->isHit()) {
            return $cacheItem->get();
        }

        $conn = $this->entityManager->getConnection();

        // 1. Target data
        $target = $this->getTargetData($productId);
        $targetPrice = (float) $target['target_price'];
        $targetBrandId = (int) ($target['brand_id'] ?? 0);
        $targetChildCatId = (int) $target['category_id'];

        // ── CATEGORY BOUNDARY FIX ──
        // 1. Find the direct child of root (lvl = 1). This prevents a Server
        //    from pulling in Laptops, Tablets, etc., under the same root.
        $boundaryData = $conn->fetchAssociative(
            "WITH RECURSIVE cat_path AS (
                SELECT id, name, parent_id, 0 AS lvl FROM category WHERE id = :cid
                UNION ALL
                SELECT c.id, c.name, c.parent_id, cp.lvl + 1
                FROM category c JOIN cat_path cp ON c.id = cp.parent_id
            )
            SELECT id, name FROM cat_path WHERE lvl = 1 LIMIT 1",
            ['cid' => $targetChildCatId]
        );

        $boundaryId = (int) ($boundaryData['id'] ?? 0);
        $motherCategoryName = $boundaryData['name'] ?? 'unknown';

        if (!$boundaryId) {
            throw new \RuntimeException("Could not determine category boundary for product {$productId}");
        }

        // 2. Walk DOWN from the BOUNDARY, not the root.
        $catIds = $conn->fetchFirstColumn(
            "WITH RECURSIVE tree_cte AS (
                SELECT id FROM category WHERE id = :boundaryId
                UNION ALL
                SELECT c.id FROM category c JOIN tree_cte t ON c.parent_id = t.id
            )
            SELECT id FROM tree_cte",
            ['boundaryId' => $boundaryId]
        );

        if (empty($catIds)) {
            throw new \RuntimeException("No categories found under boundary {$boundaryId}");
        }

        // 5. Combined query: brand wipe + market health + price neighbors per brand
        $candidates = $this->queryCandidates(
            targetId: $productId,
            targetBrandId: $targetBrandId,
            catIds: $catIds,
            targetPrice: $targetPrice,
        );

        if (count($candidates) === 0) {
            return [];
        }

        // 6. Color variant enrichment
        $candidates = $this->enrichColorVariants($candidates);

        // 7. Build n8n payload
        $payload = $this->buildPayload($target, $candidates, $motherCategoryName, $targetPrice);

        // 8. Call n8n
        $response = $this->callN8n(json_encode($payload));

        // 9. Parse response
        $winners = $this->parseResponse($response);

        // Cache
        $cacheItem->set($winners);
        $cacheItem->expiresAfter(self::CACHE_TTL);
        $this->cache->save($cacheItem);

        return $winners;
    }

    private function getTargetData(int $productId): array
    {
        $conn = $this->entityManager->getConnection();
        $target = $conn->fetchAssociative(
            'SELECT p.id, p.name, COALESCE(b.name, p.brand) AS brand, p.brand_id, p.description, p.specs_json, p.category_id,
                     (SELECT MIN(pl.price) FROM product_listing pl
                      WHERE pl.product_id = p.id AND pl.is_active = true AND pl.price > 0) as target_price
             FROM product p
             LEFT JOIN brand b ON b.id = p.brand_id
             WHERE p.id = :pid',
            ['pid' => $productId]
        );

        if (!$target || !$target['target_price'] || (float) $target['target_price'] <= 0) {
            throw new \RuntimeException('Product not found or has no active priced listings.');
        }

        return $target;
    }

    /**
     * @param int[] $catIds
     * @return array<int, array<string, mixed>>
     */
    private function queryCandidates(
        int $targetId,
        int $targetBrandId,
        array $catIds,
        float $targetPrice,
    ): array {
        $conn = $this->entityManager->getConnection();

        $sql = <<<'SQL'
WITH product_base AS (
    SELECT p.id, p.name, COALESCE(b.name, p.brand) AS brand, p.brand_id, p.description, p.specs_json,
           MIN(pl.price) FILTER (WHERE pl.is_active = true AND pl.price > 0) AS best_price
    FROM product p
    LEFT JOIN brand b ON b.id = p.brand_id
    JOIN product_listing pl ON pl.product_id = p.id
    WHERE p.id != :targetId
      AND p.category_id IN (:catIds)
      AND (p.brand_id IS DISTINCT FROM :targetBrandId)
      AND pl.is_active = true AND pl.price > 0
      AND pl.price <= :maxPrice
    GROUP BY p.id, b.name
),
market_health AS (
    SELECT pb.id, pb.name, pb.brand, pb.brand_id, pb.description, pb.specs_json::text AS specs_json, pb.best_price,
           COUNT(DISTINCT pl2.seller_id) AS active_sellers,
           COALESCE(
               (SELECT ROUND(
                   COUNT(*) FILTER (WHERE ph.out_of_stock) * 1.0 / NULLIF(COUNT(*), 0), 2
               )
               FROM price_history ph
               JOIN product_listing pl3 ON pl3.id = ph.product_listing_id
               WHERE pl3.product_id = pb.id
                 AND ph.recorded_at >= NOW() - INTERVAL '30 days'), 0
           ) AS oos_rate
    FROM product_base pb
    JOIN product_listing pl2 ON pl2.product_id = pb.id AND pl2.is_active = true
    GROUP BY pb.id, pb.name, pb.brand, pb.brand_id, pb.description, pb.specs_json::text, pb.best_price
),
ranked AS (
    SELECT mh.*,
           ROW_NUMBER() OVER (
               PARTITION BY COALESCE(mh.brand_id, 0)
               ORDER BY ABS(mh.best_price - :targetPrice) ASC
           ) AS brand_rank
    FROM market_health mh
    WHERE mh.active_sellers > 0 AND mh.oos_rate < 1.0
)
SELECT id, name, brand, brand_id, description, specs_json::text AS specs_json,
       best_price, active_sellers, oos_rate, brand_rank
FROM ranked
WHERE brand_rank <= 7
ORDER BY COALESCE(brand_id, 0), brand_rank
SQL;

        return $conn->fetchAllAssociative($sql, [
            'targetId' => $targetId,
            'targetBrandId' => $targetBrandId,
            'catIds' => $catIds,
            'targetPrice' => $targetPrice,
            'maxPrice' => $targetPrice * 2.0,
        ], [
            'catIds' => ArrayParameterType::INTEGER,
            'targetBrandId' => \Doctrine\DBAL\ParameterType::INTEGER,
        ]);
    }

    /**
     * @param array<int, array<string, mixed>> $candidates
     * @return array<int, array<string, mixed>>
     */
    private function enrichColorVariants(array $candidates): array
    {
        $baseGroups = [];

        foreach ($candidates as &$candidate) {
            $name = trim($candidate['name'] ?? '');
            $lower = mb_strtolower($name);

            $foundColor = null;
            foreach (self::FRENCH_COLORS as $color) {
                if (preg_match('/\b' . preg_quote($color, '/') . '\b/ui', $lower)) {
                    $foundColor = $color;
                    break;
                }
            }

            $baseName = $foundColor !== null
                ? trim(preg_replace('/\b' . preg_quote($foundColor, '/') . '\b/ui', '', $name))
                : $name;

            $baseName = trim(preg_replace('/\s+/', ' ', $baseName));
            $candidate['_color'] = $foundColor;
            $candidate['_baseName'] = $baseName;
            $baseGroups[$baseName][] = &$candidate;
        }
        unset($candidate);

        foreach ($baseGroups as $baseName => $group) {
            if (count($group) >= 2) {
                $colors = array_unique(array_filter(array_map(fn($c) => $c['_color'], $group)));
                $colorList = implode(', ', array_map('ucfirst', $colors));
                foreach ($group as &$c) {
                    $c['available_in_colors'] = $colorList;
                }
                unset($c);
            }
        }

        // Clean up temp fields
        foreach ($candidates as &$c) {
            unset($c['_color'], $c['_baseName']);
        }
        unset($c);

        return $candidates;
    }

    private function cleanStorageValue(string $value): string
    {
        if (preg_match('/(\d+)\s*Go\s*SSD/i', $value, $m)) {
            return $m[1] . ' Go SSD';
        }

        if (preg_match('/(\d+)\s*Go\s*(SSD|NVMe|M\.2|eMMC)/i', $value, $m)) {
            return $m[1] . ' Go SSD';
        }

        if (preg_match('/(\d+)\s*To\s*(SSD|NVMe)?/i', $value, $m)) {
            return ((int)$m[1] * 1000) . ' Go SSD';
        }

        if (preg_match('/(\d+)\s*Go/i', $value, $m)) {
            return $m[1] . ' Go';
        }

        if (preg_match('/(\d+)\s*To/i', $value, $m)) {
            return ((int)$m[1] * 1000) . ' Go';
        }

        return trim($value);
    }

    private function specsToRawString(array $specs): string
    {
        if (empty($specs)) {
            return '';
        }

        $labels = [
            'ram'        => 'RAM',
            'storage'    => 'Stockage',
            'screen'     => 'Écran',
            'resolution' => 'Résolution',
            'panel'      => 'Dalle',
            'refresh'    => 'Hz',
            'camera'     => 'Caméra',
            'cpu'        => 'CPU',
            'gpu'        => 'GPU',
            'os'         => 'OS',
            'battery'    => 'Batterie',
            'water'      => 'IP',
            'weight'     => 'Poids',
            'color'      => 'Couleur',
        ];

        $parts = [];
        foreach ($labels as $key => $label) {
            if (!empty($specs[$key])) {
                $parts[] = $label . ': ' . $specs[$key];
            }
        }

        return implode(' | ', $parts);
    }

    private function normalizeSpecs(mixed $raw): array
    {
        if (is_string($raw)) {
            $raw = json_decode($raw, true) ?? [];
        }

        if (!is_array($raw) || empty($raw)) {
            return [];
        }

        $flat = [];
        foreach ($raw as $k => $v) {
            if ($v === null || $v === '') {
                continue;
            }
            $flat[mb_strtolower(trim($k))] = trim((string) $v);
        }

        $result = [];

        foreach (self::SPEC_KEY_MAP as $canonical => $aliases) {
            foreach ($aliases as $alias) {
                $lookupKey = mb_strtolower($alias);
                if (isset($flat[$lookupKey])) {
                    $value = $flat[$lookupKey];

                    if ($canonical === 'storage') {
                        $value = $this->cleanStorageValue($value);
                    }

                    if ($canonical === 'ram' && preg_match('/^(\d+)/i', $value, $m)) {
                        $value = $m[1] . ' Go';
                    }

                    if ($canonical === 'screen') {
                        if (!preg_match('/\d+(\.\d+)?\s*pouces?/i', $value)) {
                            if (preg_match('/([\d.]+)\s*pouces?/i', $value, $m2)) {
                                $value = $m2[1] . ' Pouces';
                            }
                        }
                    }

                    $result[$canonical] = $value;
                    break;
                }
            }
        }

        if (isset($result['ram']) && !isset($result['storage'])) {
            $ramVal = strtolower(trim($result['ram']));
            if (preg_match('/(\d+)\s*(to|tb)/i', $ramVal, $m) ||
                (preg_match('/(\d+)\s*(go|gb)/i', $ramVal, $m) && (int)$m[1] > 32)) {
                $result['storage'] = $result['ram'];
                unset($result['ram']);
            }
        }

        return $result;
    }

    /**
     * @param array<string, mixed> $target
     * @param array<int, array<string, mixed>> $candidates
     */
    private function buildPayload(
        array  $target,
        array  $candidates,
        string $motherCategoryName,
        float  $targetPrice
    ): array {
        $targetSpecs    = $this->normalizeSpecs($target['specs_json'] ?? null);
        $targetSpecsRaw = $this->specsToRawString($targetSpecs);

        $targetPayload = [
            'id'          => (int) $target['id'],
            'name'        => $target['name'],
            'brand'       => $target['brand'],
            'price'       => (string) $targetPrice,
            'description' => mb_substr((string) ($target['description'] ?? ''), 0, 500),
            'specs'       => $targetSpecs,
            'specs_raw'   => $targetSpecsRaw,
        ];

        $candidatePayloads = [];
        $tableRows         = [];

        foreach ($candidates as $c) {
            $specs    = $this->normalizeSpecs($c['specs_json'] ?? null);
            $specsRaw = $this->specsToRawString($specs);

            $candidatePayloads[] = [
                'id'             => (int) $c['id'],
                'name'           => $c['name'],
                'brand'          => $c['brand'],
                'price'          => (string) $c['best_price'],
                'description'    => mb_substr((string) ($c['description'] ?? ''), 0, 400),
                'specs'          => $specs,
                'specs_raw'      => $specsRaw,
                'oos_rate'       => (float) ($c['oos_rate'] ?? 0),
                'active_sellers' => (int) ($c['active_sellers'] ?? 1),
                'available_in_colors' => $c['available_in_colors'] ?? null,
            ];

            $specsCol = $specsRaw ?: 'N/A';
            $descCol  = mb_substr((string) ($c['description'] ?? ''), 0, 200);
            $colorCol = !empty($c['available_in_colors'])
                ? ' [Couleurs: ' . (is_array($c['available_in_colors'])
                    ? implode(', ', $c['available_in_colors'])
                    : $c['available_in_colors']) . ']'
                : '';

            $tableRows[] = sprintf(
                '%d | %s %s%s | %sEUR | %s | %s',
                (int) $c['id'],
                $c['brand'],
                $c['name'],
                $colorCol,
                $c['best_price'],
                $specsCol,
                $descCol
            );
        }

        return [
            'category'   => $motherCategoryName,
            'target'     => $targetPayload,
            'candidates' => $candidatePayloads,
            'table'      => implode("\n", $tableRows),
        ];
    }

    private function callN8n(string $payload): ?array
    {
        $webhookUrl = trim((string) (
            $_SERVER['N8N_COMPARE_WEBHOOK_URL']
            ?? $_ENV['N8N_COMPARE_WEBHOOK_URL']
            ?? ''
        ));

        if ($webhookUrl === '' || filter_var($webhookUrl, FILTER_VALIDATE_URL) === false) {
            $this->logger->warning('B2BCompareService: N8N webhook URL not configured or invalid.');
            return null;
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\nAccept: application/json",
                'content' => $payload,
                'ignore_errors' => true,
                'timeout' => 30,
            ],
        ]);

        $body = @file_get_contents($webhookUrl, false, $context);
        if ($body === false) {
            $this->logger->error('B2BCompareService: Failed to call N8N webhook.', ['url' => $webhookUrl]);
            return null;
        }

        $decoded = json_decode($body, true);
        if (!is_array($decoded)) {
            $this->logger->warning('B2BCompareService: N8N returned non-JSON response.', ['body' => substr((string) $body, 0, 500)]);
            return [];
        }

        return $decoded;
    }

    private function parseResponse(?array $response): array
    {
        if (!$response) {
            return [];
        }

        // Handle nested array structures if they occur
        if (array_is_list($response) && isset($response[0])) {
            $response = $response[0];
        }

        if (!isset($response['winners']) || !is_array($response['winners'])) {
            return [];
        }

        $winners = [];
        foreach ($response['winners'] as $w) {
            if (!isset($w['id'])) {
                continue;
            }

            // Default to conservative if AI forgot matchType
            $matchType = $w['matchType'] ?? 'No Direct Match';

            $winners[] = [
                'id'        => (int) $w['id'],
                'matchType' => $matchType,
                'reason'    => $w['reason'] ?? '',
            ];
        }

        return $winners;
    }
}
