<?php

declare(strict_types=1);

$baseUrl = rtrim(getenv('SMOKE_BASE_URL') ?: 'http://127.0.0.1:8000', '/');
$apiKey = getenv('SMOKE_ADMIN_API_KEY') ?: (getenv('ADMIN_API_KEY') ?: 'dev-admin-api-key-change-me');
$adminRole = getenv('SMOKE_ADMIN_ROLE') ?: 'ROLE_SUPER_ADMIN';
$adminId = getenv('SMOKE_ADMIN_ID') ?: '1';

$checks = [
    [
        'name' => 'Users list',
        'url' => $baseUrl . '/admin/api/users?limit=1&offset=0',
        'requiredKeys' => ['items', 'pagination'],
    ],
    [
        'name' => 'Subscriptions list',
        'url' => $baseUrl . '/admin/api/subscriptions?limit=1&offset=0',
        'requiredKeys' => ['items', 'pagination', 'stats'],
    ],
    [
        'name' => 'B2B pending queue',
        'url' => $baseUrl . '/admin/api/users/b2b/pending?limit=1&offset=0',
        'requiredKeys' => ['items', 'pagination'],
    ],
    [
        'name' => 'B2B recent history',
        'url' => $baseUrl . '/admin/api/users/b2b/recent?limit=1',
        'requiredKeys' => ['items'],
    ],
];

$hasFailures = false;

foreach ($checks as $check) {
    [$statusCode, $body] = requestJson(
        $check['url'],
        [
            'X-Admin-Api-Key: ' . $apiKey,
            'X-Admin-Role: ' . $adminRole,
            'X-Admin-Id: ' . $adminId,
            'Accept: application/json',
        ],
    );

    if ($statusCode < 200 || $statusCode >= 300) {
        $hasFailures = true;
        fwrite(STDERR, sprintf("[FAIL] %s (%d) %s\n", $check['name'], $statusCode, summarizeBody($body)));
        continue;
    }

    $json = json_decode($body, true);
    if (!is_array($json)) {
        $hasFailures = true;
        fwrite(STDERR, sprintf("[FAIL] %s returned non-JSON body\n", $check['name']));
        continue;
    }

    $missing = array_values(array_filter($check['requiredKeys'], static fn (string $key): bool => !array_key_exists($key, $json)));
    if ($missing !== []) {
        $hasFailures = true;
        fwrite(STDERR, sprintf("[FAIL] %s missing keys: %s\n", $check['name'], implode(', ', $missing)));
        continue;
    }

    fwrite(STDOUT, sprintf("[PASS] %s\n", $check['name']));
}

if ($hasFailures) {
    exit(1);
}

fwrite(STDOUT, "Module 1 smoke checks passed.\n");
exit(0);

/**
 * @return array{0:int,1:string}
 */
function requestJson(string $url, array $headers): array
{
    $headers[] = 'Content-Type: application/json';
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => implode("\r\n", $headers),
            'ignore_errors' => true,
            'timeout' => 15,
        ],
    ]);

    $body = @file_get_contents($url, false, $context);
    $body = $body === false ? '' : $body;

    $statusCode = 0;
    if (isset($http_response_header) && is_array($http_response_header) && isset($http_response_header[0])) {
        if (preg_match('/\s(\d{3})\s/', $http_response_header[0], $matches) === 1) {
            $statusCode = (int) $matches[1];
        }
    }

    return [$statusCode, $body];
}

function summarizeBody(string $body): string
{
    $trimmed = trim($body);
    if ($trimmed === '') {
        return 'empty response body';
    }

    if (strlen($trimmed) > 160) {
        return substr($trimmed, 0, 157) . '...';
    }

    return $trimmed;
}
