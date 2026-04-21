<?php

namespace App\Security;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

final class WebhookGuard
{
    private string $webhookApiKey;

    public function __construct()
    {
        $this->webhookApiKey = $_ENV['WEBHOOK_API_KEY'] ?? $_SERVER['WEBHOOK_API_KEY'] ?? 'dev-webhook-api-key-change-me';
    }

    public function assertAuthorized(Request $request): ?JsonResponse
    {
        $requestApiKey = trim((string) $request->headers->get('X-Webhook-Api-Key', ''));
        if ($requestApiKey === '' || !hash_equals($this->webhookApiKey, $requestApiKey)) {
            return new JsonResponse(['error' => 'Unauthorized webhook request.'], 403);
        }

        $signatureHeader = trim((string) $request->headers->get('X-Webhook-Signature', ''));
        if ($signatureHeader !== '') {
            $provided = $this->extractSignatureValue($signatureHeader);
            if ($provided === null) {
                return new JsonResponse(['error' => 'Invalid webhook signature format.'], 403);
            }

            $rawBody = (string) $request->getContent();
            $expected = hash_hmac('sha256', $rawBody, $this->webhookApiKey);
            if (!hash_equals($expected, $provided)) {
                return new JsonResponse(['error' => 'Invalid webhook signature.'], 403);
            }
        }

        return null;
    }

    private function extractSignatureValue(string $header): ?string
    {
        $signature = $header;
        if (str_starts_with($signature, 'sha256=')) {
            $signature = substr($signature, 7);
        }

        $signature = trim($signature);
        if ($signature === '' || !preg_match('/^[a-f0-9]{64}$/i', $signature)) {
            return null;
        }

        return strtolower($signature);
    }
}
