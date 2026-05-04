<?php

namespace App\Service;

use App\Entity\CategoryLink;
use App\Entity\ProductListing;
use Doctrine\ORM\EntityManagerInterface;

/**
 * URL Duplicate Detection Engine.
 *
 * Prevents redundant scraping by:
 * - Normalizing URLs (www, protocol, trailing slash)
 * - Clustering by domain
 * - Detecting similar URLs with query string variations
 *
 * Returns: { is_duplicate, duplicate_reason, similar_urls }
 */
final class URLDuplicateDetector
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    /**
     * Detects if a URL is already being tracked.
     *
     * Returns:
     * {
     *   "is_duplicate": false,
     *   "duplicate_reason": null,
     *   "similar_urls": [],
     *   "suggestions": []
     * }
     *
     * OR if duplicate found:
     * {
     *   "is_duplicate": true,
     *   "duplicate_reason": "EXACT_MATCH_IN_PRODUCT_LISTING",
     *   "existing_record_id": 123,
     *   "existing_record_type": "product_listing",
     *   "similar_urls": [...]
     * }
     */
    public function detectDuplicate(string $targetUrl, string $targetType = 'PRODUCT_LISTING'): array
    {
        $normalizedUrl = $this->normalizeUrl($targetUrl);

        // Step 1: Check for exact matches in product_listing
        $exactMatch = $this->checkExactMatch($normalizedUrl, 'product_listing');
        if ($exactMatch !== null) {
            return [
                'is_duplicate' => true,
                'duplicate_reason' => 'EXACT_MATCH_IN_PRODUCT_LISTING',
                'existing_record_id' => $exactMatch['id'],
                'existing_record_type' => 'product_listing',
                'existing_record_name' => $exactMatch['name'],
            ];
        }

        // Step 2: Check for exact matches in category_link
        $exactMatch = $this->checkExactMatch($normalizedUrl, 'category_link');
        if ($exactMatch !== null) {
            return [
                'is_duplicate' => true,
                'duplicate_reason' => 'EXACT_MATCH_IN_CATEGORY_LINK',
                'existing_record_id' => $exactMatch['id'],
                'existing_record_type' => 'category_link',
                'existing_record_name' => $exactMatch['name'],
            ];
        }

        // Step 3: Check for similar URLs (same domain, slight variations)
        $similarUrls = $this->findSimilarUrls($normalizedUrl);

        if (!empty($similarUrls)) {
            return [
                'is_duplicate' => true,
                'duplicate_reason' => 'SIMILAR_URL_DETECTED',
                'similar_urls' => $similarUrls,
                'suggestion' => 'URL appears similar to existing tracked URL',
            ];
        }

        // No duplicates found
        return [
            'is_duplicate' => false,
            'duplicate_reason' => null,
            'similar_urls' => [],
            'suggestions' => [],
        ];
    }

    /**
     * Normalizes URLs for consistent comparison.
     *
     * Handles:
     * - Protocol inconsistency (http vs https)
     * - www prefix variations
     * - Trailing slashes
     * - Query string ordering
     * - Fragment removal
     */
    public function normalizeUrl(string $url): string
    {
        // Parse URL
        $parsed = parse_url($url);
        if ($parsed === false) {
            return '';
        }

        // Force HTTPS
        $scheme = 'https';

        // Extract domain and remove www
        $host = $parsed['host'] ?? '';
        $host = preg_replace('/^www\./', '', $host);
        if ($host === '') {
            return '';
        }

        // Build path
        $path = $parsed['path'] ?? '/';
        $path = rtrim($path, '/');

        // Sort and normalize query string
        $query = '';
        if (!empty($parsed['query'])) {
            parse_str($parsed['query'], $queryParams);
            ksort($queryParams);
            $query = '?' . http_build_query($queryParams);
        }

        // Combine
        $normalized = strtolower("{$scheme}://{$host}{$path}{$query}");

        return $normalized;
    }

    /**
     * Extracts domain/domain cluster from URL.
     * Used for finding URLs from same seller across different subdomains.
     */
    public function extractDomainCluster(string $url): string
    {
        $parsed = parse_url($url);
        $host = $parsed['host'] ?? '';

        // Remove www and subdomains, keep main domain + TLD
        $parts = explode('.', $host);
        if (count($parts) > 2) {
            // e.g., shop.example.com → example.com
            return strtolower(implode('.', array_slice($parts, -2)));
        }

        return strtolower($host);
    }

    /**
     * Detects if multiple URLs are from same seller/domain.
     * Used for scraping operations on same competitor.
     */
    public function clusterByDomain(array $urls): array
    {
        $clusters = [];

        foreach ($urls as $url) {
            $domain = $this->extractDomainCluster($url);
            if (!isset($clusters[$domain])) {
                $clusters[$domain] = [];
            }
            $clusters[$domain][] = $url;
        }

        return $clusters;
    }

    /**
     * Checks if URL should be tracked with recurring schedule.
     * Returns suggested refresh interval based on seller/category.
     */
    public function suggestRefreshInterval(string $url): array
    {
        $domain = $this->extractDomainCluster($url);

        // Categorize seller by domain
        $sellerType = $this->categorizeSellerByDomain($domain);

        return match ($sellerType) {
            'MAJOR_RETAILER' => [
                'refresh_interval_hours' => 6,
                'reason' => 'Major retailers change prices frequently',
            ],
            'MARKETPLACE' => [
                'refresh_interval_hours' => 12,
                'reason' => 'Marketplace prices vary by seller',
            ],
            'SMALL_SELLER' => [
                'refresh_interval_hours' => 24,
                'reason' => 'Small sellers update prices less frequently',
            ],
            default => [
                'refresh_interval_hours' => 24,
                'reason' => 'Default tracking schedule',
            ],
        };
    }

    private function checkExactMatch(string $normalizedUrl, string $tableName): ?array
    {
        if ($tableName === 'product_listing') {
            // Check product_listing.source_url
            $qb = $this->entityManager->createQueryBuilder()
                ->select('pl.id, pl.product_name as name')
                ->from(ProductListing::class, 'pl')
                ->where('LOWER(pl.source_url) = :url')
                ->setParameter('url', $normalizedUrl)
                ->setMaxResults(1);

            $result = $qb->getQuery()->getOneOrNullResult();

            return $result ?: null;
        }

        if ($tableName === 'category_link') {
            // Check category_link.url
            $qb = $this->entityManager->createQueryBuilder()
                ->select('cl.id, cl.name')
                ->from(CategoryLink::class, 'cl')
                ->where('LOWER(cl.url) = :url')
                ->setParameter('url', $normalizedUrl)
                ->setMaxResults(1);

            $result = $qb->getQuery()->getOneOrNullResult();

            return $result ?: null;
        }

        return null;
    }

    private function findSimilarUrls(string $normalizedUrl): array
    {
        $parsed = parse_url($normalizedUrl);
        $domain = $this->extractDomainCluster($normalizedUrl);

        // Find URLs with same domain but different path/query
        $qb = $this->entityManager->createQueryBuilder()
            ->select('pl.id, pl.source_url, pl.product_name')
            ->from(ProductListing::class, 'pl')
            ->where('LOWER(pl.source_url) LIKE :domainPattern')
            ->setParameter('domainPattern', '%' . $domain . '%')
            ->setMaxResults(5);

        $results = $qb->getQuery()->getResult();

        $similar = [];
        foreach ($results as $result) {
            $resultUrl = $result['source_url'] ?? '';
            $similarity = $this->calculateSimilarity($normalizedUrl, $resultUrl);

            if ($similarity > 0.80 && strtolower($resultUrl) !== strtolower($normalizedUrl)) {
                $similar[] = [
                    'url' => $resultUrl,
                    'product_name' => $result['product_name'],
                    'record_id' => $result['id'],
                    'similarity_score' => round($similarity, 2),
                ];
            }
        }

        usort($similar, fn ($a, $b) => $b['similarity_score'] <=> $a['similarity_score']);

        return $similar;
    }

    private function calculateSimilarity(string $url1, string $url2): float
    {
        $url1 = strtolower($url1);
        $url2 = strtolower($url2);

        // Exact match
        if ($url1 === $url2) {
            return 1.0;
        }

        // Levenshtein distance (normalized)
        $distance = levenshtein($url1, $url2);
        $maxLength = max(strlen($url1), strlen($url2));

        if ($maxLength === 0) {
            return 1.0;
        }

        return 1.0 - ($distance / $maxLength);
    }

    private function categorizeSellerByDomain(string $domain): string
    {
        $majorRetailers = [
            'amazon.com',
            'ebay.com',
            'walmart.com',
            'target.com',
            'bestbuy.com',
            'alibaba.com',
        ];

        if (in_array($domain, $majorRetailers)) {
            return 'MAJOR_RETAILER';
        }

        if (str_contains($domain, 'marketplace') || str_contains($domain, 'market')) {
            return 'MARKETPLACE';
        }

        return 'SMALL_SELLER';
    }
}
