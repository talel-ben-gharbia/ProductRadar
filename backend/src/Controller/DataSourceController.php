<?php

namespace App\Controller;

use App\Entity\DataSource;
use App\Repository\DataSourceRepository;
use App\Security\AdminApiGuard;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/admin/api/data-sources')]
final class DataSourceController extends AbstractController
{
    #[Route('', name: 'admin_data_sources_list', methods: ['GET'])]
    public function list(
        Request $request,
        DataSourceRepository $dataSourceRepository,
        AdminApiGuard $adminApiGuard,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        $limit = max(1, min(100, $request->query->getInt('limit', 25)));
        $offset = max(0, $request->query->getInt('offset', 0));
        $search = trim((string) $request->query->get('search', ''));

        $activeRaw = $request->query->get('active');
        $activeFilter = null;
        if ($activeRaw !== null && $activeRaw !== '') {
            $activeFilter = filter_var($activeRaw, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        }

        $result = $dataSourceRepository->paginateForAdmin($limit, $offset, $search, $activeFilter);

        return $this->json([
            'items' => array_map(fn (DataSource $source) => $this->serializeSource($source), $result['items']),
            'pagination' => [
                'limit' => $limit,
                'offset' => $offset,
                'total' => $result['total'],
            ],
        ]);
    }

    #[Route('', name: 'admin_data_sources_create', methods: ['POST'])]
    public function create(
        Request $request,
        EntityManagerInterface $entityManager,
        AdminApiGuard $adminApiGuard,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request, true);
        if ($authError !== null) {
            return $authError;
        }

        $payload = json_decode((string) $request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        $name = trim((string) ($payload['name'] ?? ''));
        $baseUrl = trim((string) ($payload['base_url'] ?? ''));
        $type = strtoupper(trim((string) ($payload['type'] ?? 'SCRAPER')));

        if ($name === '' || $baseUrl === '') {
            return $this->json(['error' => 'Name and base_url are required.'], 422);
        }

        $source = new DataSource();
        $source->setName($name);
        $source->setBaseUrl($baseUrl);
        $source->setType($type === '' ? 'SCRAPER' : $type);
        $source->setIsActive((bool) ($payload['is_active'] ?? true));
        $source->setCreatedAt(new \DateTimeImmutable());
        $source->setUpdatedAt(new \DateTimeImmutable());

        $entityManager->persist($source);
        $entityManager->flush();

        return $this->json($this->serializeSource($source), 201);
    }

    #[Route('/{id}', name: 'admin_data_sources_update', methods: ['PATCH'])]
    public function update(
        int $id,
        Request $request,
        DataSourceRepository $dataSourceRepository,
        EntityManagerInterface $entityManager,
        AdminApiGuard $adminApiGuard,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request, true);
        if ($authError !== null) {
            return $authError;
        }

        $source = $dataSourceRepository->find($id);
        if (!$source instanceof DataSource) {
            return $this->json(['error' => 'Data source not found.'], 404);
        }

        $payload = json_decode((string) $request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        if (array_key_exists('name', $payload)) {
            $source->setName((string) $payload['name']);
        }

        if (array_key_exists('base_url', $payload)) {
            $source->setBaseUrl((string) $payload['base_url']);
        }

        if (array_key_exists('type', $payload)) {
            $source->setType((string) $payload['type']);
        }

        if (array_key_exists('is_active', $payload)) {
            $source->setIsActive((bool) $payload['is_active']);
        }

        if (array_key_exists('last_error', $payload)) {
            $error = trim((string) $payload['last_error']);
            $source->setLastError($error === '' ? null : $error);
        }

        if (array_key_exists('last_success_at', $payload)) {
            $rawDate = trim((string) $payload['last_success_at']);
            $source->setLastSuccessAt($rawDate === '' ? null : new \DateTimeImmutable($rawDate));
        }

        $source->setUpdatedAt(new \DateTimeImmutable());

        $entityManager->flush();

        return $this->json($this->serializeSource($source));
    }

    private function serializeSource(DataSource $source): array
    {
        return [
            'id' => $source->getId(),
            'name' => $source->getName(),
            'base_url' => $source->getBaseUrl(),
            'type' => $source->getType(),
            'is_active' => $source->isActive(),
            'last_success_at' => $source->getLastSuccessAt()?->format(\DateTimeInterface::ATOM),
            'last_error' => $source->getLastError(),
            'created_at' => $source->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            'updated_at' => $source->getUpdatedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }
}
