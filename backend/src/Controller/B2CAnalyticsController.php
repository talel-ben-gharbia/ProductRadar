<?php

namespace App\Controller;

use App\Entity\B2BSearchLog;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class B2CAnalyticsController extends AbstractController
{
    #[Route('/analytics/log-search', name: 'log_b2c_search', methods: ['POST'])]
    public function logSearch(Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        $body = json_decode((string) $request->getContent(), true);
        $query = trim((string) ($body['query'] ?? ''));
        $count = (int) ($body['resultsCount'] ?? 0);

        if ($query === '') {
            return $this->json(['status' => 'ignored'], 200);
        }

        $log = new B2BSearchLog();
        $log->setOwnerType('GLOBAL');
        $log->setQuery($query);
        $log->setResultsCount($count);
        $log->setZeroResults($count === 0);
        $log->setCreatedAt(new \DateTimeImmutable());

        $entityManager->persist($log);
        $entityManager->flush();

        return $this->json(['status' => 'logged'], 201);
    }
}
