<?php

namespace App\Service;

final class ManualScrapeTriggerService
{
    /**
     * @return array{ok: bool, statusCode: int, body: string}
     */
    public function trigger(array $payload): array
    {
        $webhookUrl = trim((string) (
            $_ENV['N8N_MANUAL_SCRAPE_WEBHOOK_URL']
            ?? $_SERVER['N8N_MANUAL_SCRAPE_WEBHOOK_URL']
            ?? $_ENV['N8N_WEBHOOK_URL']
            ?? $_SERVER['N8N_WEBHOOK_URL']
            ?? ''
        ));

        if ($webhookUrl === '' || filter_var($webhookUrl, FILTER_VALIDATE_URL) === false) {
            return [
                'ok' => false,
                'statusCode' => 0,
                'body' => 'N8N webhook URL is not configured. Set N8N_MANUAL_SCRAPE_WEBHOOK_URL.',
            ];
        }

        $json = json_encode($payload);
        if (!is_string($json)) {
            return [
                'ok' => false,
                'statusCode' => 0,
                'body' => 'Failed to encode webhook payload.',
            ];
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => implode("\r\n", [
                    'Content-Type: application/json',
                    'Accept: application/json',
                ]),
                'content' => $json,
                'ignore_errors' => true,
                'timeout' => 20,
            ],
        ]);

        $body = @file_get_contents($webhookUrl, false, $context);
        $body = $body === false ? '' : $body;

        $statusCode = 0;
        if (isset($http_response_header) && is_array($http_response_header) && isset($http_response_header[0])) {
            if (preg_match('/\s(\d{3})\s/', $http_response_header[0], $matches) === 1) {
                $statusCode = (int) $matches[1];
            }
        }

        $ok = $statusCode >= 200 && $statusCode < 300;

        return [
            'ok' => $ok,
            'statusCode' => $statusCode,
            'body' => $body,
        ];
    }
}
