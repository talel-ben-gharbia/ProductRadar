<?php

namespace App\Controller;

use App\Security\AdminApiGuard;
use App\Service\AnalyticsService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/admin/api/system-health')]
final class SystemHealthController extends AbstractController
{
    #[Route('', name: 'admin_system_health', methods: ['GET'])]
    public function index(
        Request $request,
        AnalyticsService $analyticsService,
        AdminApiGuard $adminApiGuard,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        return $this->json([
            'status' => 'ok',
            'checked_at' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
            'scraping_health' => $analyticsService->getScrapingHealth(),
        ]);
    }
}
