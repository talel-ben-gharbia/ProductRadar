<?php

namespace App\Service;

final class BestTimeToBuyApiClient
{
    public function __construct(
        private readonly string $bestTimeToBuyApiUrl,
        private readonly float $bestTimeToBuyApiTimeout,
    ) {
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     *
     * @return array<string, mixed>
     */
    public function predict(array $rows, ?float $trustScore = null): array
    {
        if ($rows === []) {
            throw new \InvalidArgumentException('At least one history row is required.');
        }

        $payloadRows = array_map(static function (array $row): array {
            return [
                'recorded_price' => isset($row['recorded_price']) && is_numeric($row['recorded_price'])
                    ? (float) $row['recorded_price']
                    : 0.0,
                'anomaly' => (bool) ($row['anomaly'] ?? false),
                'out_of_stock' => (bool) ($row['out_of_stock'] ?? false),
                'trust_score' => isset($row['trust_score']) && is_numeric($row['trust_score'])
                    ? (float) $row['trust_score']
                    : null,
            ];
        }, $rows);

        $payload = [
            'rows' => $payloadRows,
            'trust_score' => $trustScore,
        ];

        return $this->postJson('/predict', $payload);
    }

    /**
     * @param array<string, mixed> $payload
     *
     * @return array<string, mixed>
     */
    private function postJson(string $path, array $payload): array
    {
        $url = rtrim($this->bestTimeToBuyApiUrl, '/') . $path;

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\nAccept: application/json\r\n",
                'content' => json_encode($payload, JSON_THROW_ON_ERROR),
                'timeout' => $this->bestTimeToBuyApiTimeout,
                'ignore_errors' => true,
            ],
        ]);

        $responseBody = @file_get_contents($url, false, $context);

        if ($responseBody === false) {
            throw new \RuntimeException('Unable to reach Best Time To Buy ML API.');
        }

        $statusCode = 0;
        if (isset($http_response_header) && is_array($http_response_header) && isset($http_response_header[0])) {
            $parts = explode(' ', (string) $http_response_header[0]);
            $statusCode = isset($parts[1]) ? (int) $parts[1] : 0;
        }

        $decoded = json_decode($responseBody, true);
        if (!is_array($decoded)) {
            throw new \RuntimeException('Invalid JSON response from Best Time To Buy ML API.');
        }

        if ($statusCode < 200 || $statusCode >= 300) {
            $message = isset($decoded['detail']) && is_string($decoded['detail'])
                ? $decoded['detail']
                : 'Best Time To Buy ML API request failed.';

            throw new \RuntimeException($message);
        }

        return $decoded;
    }
}