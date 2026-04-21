<?php

namespace App\Controller;

use App\Entity\ScrapingLog;
use App\Repository\DataSourceRepository;
use App\Security\WebhookGuard;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/admin/api/scraping-logs')]
final class ScrapingWebhookController extends AbstractController
{
    #[Route('/webhook', name: 'admin_scraping_logs_webhook', methods: ['POST'])]
    public function ingest(
        Request $request,
        WebhookGuard $webhookGuard,
        DataSourceRepository $dataSourceRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $authError = $webhookGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        $payload = json_decode((string) $request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        $sourceName = trim((string) ($payload['source_name'] ?? ''));
        $workflowName = trim((string) ($payload['workflow_name'] ?? ''));
        $statusRaw = strtoupper(trim((string) ($payload['status'] ?? '')));

        if ($sourceName === '' || $workflowName === '' || !in_array($statusRaw, ['SUCCESS', 'FAILED'], true)) {
            return $this->json(['error' => 'source_name, workflow_name, and status (SUCCESS|FAILED) are required.'], 422);
        }

        $durationMs = $this->normalizeOptionalInt($payload['duration_ms'] ?? null);
        $recordsProcessed = $this->normalizeOptionalInt($payload['records_processed'] ?? null);
        $errorMessage = $this->normalizeOptionalText($payload['error_message'] ?? null);

        $executedAt = null;
        $executedAtRaw = trim((string) ($payload['executed_at'] ?? ''));
        if ($executedAtRaw !== '') {
            try {
                $executedAt = new \DateTimeImmutable($executedAtRaw);
            } catch (\Exception) {
                return $this->json(['error' => 'Invalid executed_at format.'], 422);
            }
        }
        if (!$executedAt instanceof \DateTimeImmutable) {
            $executedAt = new \DateTimeImmutable();
        }

        $log = new ScrapingLog();
        $log->setSourceName($sourceName);
        $log->setWorkflowName($workflowName);
        $log->setStatus($statusRaw);
        $log->setDurationMs($durationMs);
        $log->setRecordsProcessed($recordsProcessed);
        $log->setErrorMessage($errorMessage);
        $log->setExecutedAt($executedAt);
        $entityManager->persist($log);

        $source = $dataSourceRepository->findOneBy(['name' => $sourceName]);
        if ($source !== null) {
            $source->setUpdatedAt(new \DateTimeImmutable());

            if ($statusRaw === 'SUCCESS') {
                $source->setLastSuccessAt($executedAt);
                $source->setLastError(null);
            } else {
                $source->setLastError($errorMessage ?? 'Scraping workflow failed.');
            }
        }

        $entityManager->flush();

        return $this->json([
            'message' => 'Scraping log received.',
            'id' => $log->getId(),
        ], 201);
    }

    private function normalizeOptionalText(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $normalized = trim($value);

        return $normalized === '' ? null : $normalized;
    }

    private function normalizeOptionalInt(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_int($value)) {
            return $value >= 0 ? $value : null;
        }

        if (is_string($value) && ctype_digit($value)) {
            return (int) $value;
        }

        if (is_float($value) && $value >= 0) {
            return (int) $value;
        }

        return null;
    }
}
