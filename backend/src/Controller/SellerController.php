<?php

namespace App\Controller;

use App\Entity\Seller;
use App\Repository\SellerRepository;
use App\Security\AdminApiGuard;
use Doctrine\DBAL\Exception\ForeignKeyConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class SellerController extends AbstractController
{
    #[Route('/sellers', name: 'get_sellers', methods: ['GET'])]
    public function getSellers(SellerRepository $sellerRepository): JsonResponse
    {
        $sellers = $sellerRepository->findBy([], ['name' => 'ASC']);

        $data = array_map(
            static fn ($seller) => [
                'id' => $seller->getId(),
                'name' => $seller->getName(),
                'url' => $seller->getUrl(),
            ],
            $sellers,
        );

        return $this->json($data);
    }

    #[Route('/sellers', name: 'create_seller', methods: ['POST'])]
    public function createSeller(
        Request $request,
        AdminApiGuard $adminApiGuard,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request, true);
        if ($authError !== null) {
            return $authError;
        }

        $body = json_decode((string) $request->getContent(), true);
        if (!is_array($body)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        $name = trim((string) ($body['name'] ?? ''));
        $url = trim((string) ($body['url'] ?? ''));

        if ($name === '' || $url === '') {
            return $this->json(['error' => 'Name and url are required.'], 422);
        }

        if (filter_var($url, FILTER_VALIDATE_URL) === false) {
            return $this->json(['error' => 'A valid seller url is required.'], 422);
        }

        $seller = new Seller();
        $seller->setName($name);
        $seller->setUrl($url);

        $entityManager->persist($seller);
        $entityManager->flush();

        return $this->json($this->serializeSeller($seller), 201);
    }

    #[Route('/sellers/{id}', name: 'update_seller', methods: ['PUT'])]
    public function updateSeller(
        int $id,
        Request $request,
        SellerRepository $sellerRepository,
        AdminApiGuard $adminApiGuard,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request, true);
        if ($authError !== null) {
            return $authError;
        }

        $seller = $sellerRepository->find($id);
        if (!$seller) {
            return $this->json(['error' => 'Seller not found.'], 404);
        }

        $body = json_decode((string) $request->getContent(), true);
        if (!is_array($body)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        $name = array_key_exists('name', $body) ? trim((string) $body['name']) : (string) $seller->getName();
        $url = array_key_exists('url', $body) ? trim((string) $body['url']) : (string) $seller->getUrl();

        if ($name === '' || $url === '') {
            return $this->json(['error' => 'Name and url are required.'], 422);
        }

        if (filter_var($url, FILTER_VALIDATE_URL) === false) {
            return $this->json(['error' => 'A valid seller url is required.'], 422);
        }

        $seller->setName($name);
        $seller->setUrl($url);
        $entityManager->flush();

        return $this->json($this->serializeSeller($seller));
    }

    #[Route('/sellers/{id}', name: 'delete_seller', methods: ['DELETE'])]
    public function deleteSeller(
        int $id,
        Request $request,
        SellerRepository $sellerRepository,
        AdminApiGuard $adminApiGuard,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request, true);
        if ($authError !== null) {
            return $authError;
        }

        $seller = $sellerRepository->find($id);
        if (!$seller) {
            return $this->json(['error' => 'Seller not found.'], 404);
        }

        try {
            $entityManager->remove($seller);
            $entityManager->flush();
        } catch (ForeignKeyConstraintViolationException) {
            return $this->json([
                'error' => 'Cannot delete seller while related listings still exist.',
            ], 409);
        }

        return $this->json(['success' => true]);
    }

    private function serializeSeller(Seller $seller): array
    {
        return [
            'id' => $seller->getId(),
            'name' => $seller->getName(),
            'url' => $seller->getUrl(),
        ];
    }
}
