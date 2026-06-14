<?php

namespace App\Controller;

use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

final class BrandController extends AbstractController
{
    #[Route('/api/brands', name: 'api_brands_list', methods: ['GET'])]
    public function listBrands(EntityManagerInterface $em): JsonResponse
    {
        $conn = $em->getConnection();
        $sql = "SELECT b.id, b.name, COUNT(p.id) as product_count 
                FROM brand b 
                LEFT JOIN product p ON p.brand_id = b.id 
                GROUP BY b.id, b.name 
                HAVING COUNT(p.id) > 0 
                ORDER BY product_count DESC";
        $stmt = $conn->prepare($sql);
        $result = $stmt->executeQuery()->fetchAllAssociative();

        return $this->json($result);
    }
}
