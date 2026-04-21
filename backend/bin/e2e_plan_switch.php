<?php

declare(strict_types=1);

$baseUrl = rtrim(getenv('E2E_BASE_URL') ?: 'http://127.0.0.1:8000', '/');
$databaseUrl = getenv('DATABASE_URL') ?: readEnvFromDotEnv('DATABASE_URL');

if ($databaseUrl === null || $databaseUrl === '') {
    fwrite(STDERR, "[FAIL] DATABASE_URL is not configured.\n");
    exit(1);
}

$pdo = connectDatabase($databaseUrl);
[$userId, $firebaseUid] = selectAnyCustomerWithFirebaseUid($pdo);

if ($userId === null || $firebaseUid === null) {
    fwrite(STDERR, "[FAIL] No customer with firebase_uid found for E2E plan switch test.\n");
    exit(1);
}

$originalSubscription = fetchSubscriptionByClientId($pdo, $userId);
$restorePlanType = normalizePlanType($originalSubscription['plan_type'] ?? 'FREE');

[$statusCode, $body] = patchPlan($baseUrl, $firebaseUid, 'PREMIUM_MONTHLY');
if ($statusCode < 200 || $statusCode >= 300) {
    fwrite(STDERR, sprintf("[FAIL] Plan switch API failed (%d): %s\n", $statusCode, summarizeBody($body)));
    exit(1);
}

$updated = fetchSubscriptionByClientId($pdo, $userId);
if ($updated === null) {
    fwrite(STDERR, "[FAIL] Subscription row was not found after plan switch.\n");
    exit(1);
}

$isValid = strtoupper((string) ($updated['plan_type'] ?? '')) === 'PREMIUM_MONTHLY'
    && (int) ($updated['alerts_limit'] ?? 0) === 20
    && (int) ($updated['favorites_limit'] ?? 0) === 999
    && (int) ($updated['price_history_access'] ?? 0) === 6;

if (!$isValid) {
    fwrite(STDERR, "[FAIL] DB verification failed after plan switch.\n");
    fwrite(STDERR, sprintf(
        "Observed: plan=%s, alerts=%s, favorites=%s, history=%s\n",
        (string) ($updated['plan_type'] ?? 'null'),
        (string) ($updated['alerts_limit'] ?? 'null'),
        (string) ($updated['favorites_limit'] ?? 'null'),
        (string) ($updated['price_history_access'] ?? 'null')
    ));

    restorePlan($baseUrl, $firebaseUid, $restorePlanType);
    exit(1);
}

$restoreOk = restorePlan($baseUrl, $firebaseUid, $restorePlanType);
if (!$restoreOk) {
    fwrite(STDERR, "[WARN] Plan switch E2E passed but restore step failed.\n");
}

fwrite(STDOUT, "[PASS] Plan switch E2E: API call updated subscription row in DB.\n");
exit(0);

/**
 * @return array{0:?int,1:?string}
 */
function selectAnyCustomerWithFirebaseUid(PDO $pdo): array
{
    $sql = "SELECT u.id, u.firebase_uid FROM \"user\" u INNER JOIN customer c ON c.id = u.id WHERE u.firebase_uid IS NOT NULL AND u.firebase_uid <> '' ORDER BY u.id ASC LIMIT 1";
    $row = $pdo->query($sql)?->fetch(PDO::FETCH_ASSOC);
    if (!is_array($row)) {
        return [null, null];
    }

    return [(int) $row['id'], (string) $row['firebase_uid']];
}

/**
 * @return array<string, mixed>|null
 */
function fetchSubscriptionByClientId(PDO $pdo, int $clientId): ?array
{
    $stmt = $pdo->prepare('SELECT plan_type, alerts_limit, favorites_limit, price_history_access FROM subscription WHERE client_id = :clientId LIMIT 1');
    $stmt->execute(['clientId' => $clientId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    return is_array($row) ? $row : null;
}

/**
 * @return array{0:int,1:string}
 */
function patchPlan(string $baseUrl, string $firebaseUid, string $planType): array
{
    $url = sprintf('%s/api/b2c/subscription/%s', $baseUrl, rawurlencode($firebaseUid));

    $headers = [
        'Content-Type: application/json',
        'Accept: application/json',
    ];

    $context = stream_context_create([
        'http' => [
            'method' => 'PATCH',
            'header' => implode("\r\n", $headers),
            'content' => json_encode(['planType' => $planType], JSON_THROW_ON_ERROR),
            'ignore_errors' => true,
            'timeout' => 20,
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

function restorePlan(string $baseUrl, string $firebaseUid, string $planType): bool
{
    [$statusCode] = patchPlan($baseUrl, $firebaseUid, $planType);

    return $statusCode >= 200 && $statusCode < 300;
}

function normalizePlanType(string $planTypeRaw): string
{
    $plan = strtoupper(trim($planTypeRaw));

    return match ($plan) {
        'PREMIUM', 'PREMIUM_MONTHLY' => 'PREMIUM_MONTHLY',
        'PREMIUM_YEARLY' => 'PREMIUM_YEARLY',
        default => 'FREE',
    };
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

function readEnvFromDotEnv(string $key): ?string
{
    $path = __DIR__ . '/../.env';
    if (!is_file($path)) {
        return null;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!is_array($lines)) {
        return null;
    }

    foreach ($lines as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' || str_starts_with($trimmed, '#')) {
            continue;
        }

        $prefix = $key . '=';
        if (!str_starts_with($trimmed, $prefix)) {
            continue;
        }

        return trim(substr($trimmed, strlen($prefix)), " \t\n\r\0\x0B\"'");
    }

    return null;
}

function connectDatabase(string $databaseUrl): PDO
{
    $parts = parse_url($databaseUrl);
    if ($parts === false) {
        throw new RuntimeException('Invalid DATABASE_URL.');
    }

    $scheme = strtolower((string) ($parts['scheme'] ?? ''));
    $host = (string) ($parts['host'] ?? '127.0.0.1');
    $port = (int) ($parts['port'] ?? 5432);
    $dbName = ltrim((string) ($parts['path'] ?? ''), '/');
    $user = (string) ($parts['user'] ?? '');
    $pass = (string) ($parts['pass'] ?? '');

    if ($scheme !== 'postgresql' && $scheme !== 'postgres') {
        throw new RuntimeException('This E2E script currently supports PostgreSQL DATABASE_URL only.');
    }

    $dsn = sprintf('pgsql:host=%s;port=%d;dbname=%s', $host, $port, $dbName);
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);

    return $pdo;
}
