<?php

namespace App\Controller;

use App\Repository\ProductRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class ProductController extends AbstractController
{
    #[Route('/products', name: 'get_products', methods: ['GET'])]
    public function getProducts(Request $request, ProductRepository $productRepository): JsonResponse
    {
        $categoryId = $request->query->getInt('categoryId', 0);

        $products = $categoryId > 0
            ? $productRepository->findBy(['category' => $categoryId], ['id' => 'DESC'])
            : $productRepository->findBy([], ['id' => 'DESC']);

        $data = array_map(
            static fn($product) => [
                'id' => $product->getId(),
                'ref' => $product->getRef(),
                'name' => $product->getName(),
                'brand' => $product->getBrand(),
                'description' => $product->getDescription(),
                'specs_json' => $product->getSpecsJson(),
                'image_url' => $product->getImageUrl(),
                'categoryId' => $product->getCategory()?->getId(),
            ],
            $products,
        );

        return $this->json($data);
    }
}
