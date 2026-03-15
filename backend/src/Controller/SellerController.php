<?php

namespace App\Controller;

use App\Repository\SellerRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

final class SellerController extends AbstractController
{
    #[Route('/sellers', name: 'get_sellers', methods: ['GET'])]
    public function getSellers(SellerRepository $sellerRepository): JsonResponse
    {
        $sellers = $sellerRepository->findBy([], ['name' => 'ASC']);

        $data = array_map(
            static fn($seller) => [
                'id' => $seller->getId(),
                'name' => $seller->getName(),
                'url' => $seller->getUrl(),
            ],
            $sellers,
        );

        return $this->json($data);
    }
}
