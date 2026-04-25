<?php

namespace App\Controller;

use App\Entity\Product;
use App\Repository\CategoryRepository;
use App\Repository\ProductRepository;
use Doctrine\DBAL\Exception\ForeignKeyConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
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

    #[Route('/products/{id}', name: 'get_product', methods: ['GET'])]
    public function getProduct(int $id, ProductRepository $productRepository): JsonResponse
    {
        $product = $productRepository->find($id);
        if (!$product) {
            return $this->json(['error' => 'Product not found.'], 404);
        }

        return $this->json([
            'id' => $product->getId(),
            'name' => $product->getName(),
            'brand' => $product->getBrand(),
            'description' => $product->getDescription(),
            'specs_json' => $product->getSpecsJson(),
            'image_url' => $product->getImageUrl(),
            'categoryId' => $product->getCategory()?->getId(),
            'listings' => array_map(
                static fn($listing) => [
                    'id' => $listing->getId(),
                    'sellerId' => $listing->getSeller()?->getId(),
                    'sellerName' => $listing->getSeller()?->getName(),
                    'ref' => $listing->getRef(),
                    'price' => $listing->getPrice(),
                    'old_price' => $listing->getOldPrice(),
                    'product_url' => $listing->getProductUrl(),
                    'availability' => $listing->isAvailability(),
                    'trust_score' => $listing->getTrustScore(),
                    'is_active' => $listing->isActive(),
                    'created_at' => $listing->getCreatedAt()?->format(DATE_ATOM),
                    'updatet_at' => $listing->getUpdatetAt()?->format(DATE_ATOM),
                ],
                $product->getProductListings()->toArray(),
            ),
        ]);
    }

    #[Route('/products', name: 'create_product', methods: ['POST'])]
    public function createProduct(Request $request, CategoryRepository $categoryRepository, EntityManagerInterface $entityManager): JsonResponse
    {
        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return $this->json(['error' => 'Invalid body.'], 400);
        }

        $name = trim((string) ($body['name'] ?? ''));
        $description = trim((string) ($body['description'] ?? ''));
        $categoryId = (int) ($body['categoryId'] ?? 0);

        if ($name === '' || $description === '' || $categoryId <= 0) {
            return $this->json(['error' => 'Name, description and category are required.'], 400);
        }

        $category = $categoryRepository->find($categoryId);
        if (!$category) {
            return $this->json(['error' => 'Category not found.'], 404);
        }

        $product = new Product();
        $product->setName($name);
        $product->setDescription($description);
        $product->setBrand(isset($body['brand']) ? trim((string) $body['brand']) ?: null : null);
        $product->setImageUrl(isset($body['image_url']) ? trim((string) $body['image_url']) ?: null : null);
        $product->setCategory($category);

        $entityManager->persist($product);
        $entityManager->flush();

        return $this->json([
            'id' => $product->getId(),
            'name' => $product->getName(),
            'brand' => $product->getBrand(),
            'description' => $product->getDescription(),
            'specs_json' => $product->getSpecsJson(),
            'image_url' => $product->getImageUrl(),
            'categoryId' => $product->getCategory()?->getId(),
        ], 201);
    }

    #[Route('/products/{id}', name: 'update_product', methods: ['PUT'])]
    public function updateProduct(int $id, Request $request, ProductRepository $productRepository, CategoryRepository $categoryRepository, EntityManagerInterface $entityManager): JsonResponse
    {
        $product = $productRepository->find($id);
        if (!$product) {
            return $this->json(['error' => 'Product not found.'], 404);
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return $this->json(['error' => 'Invalid body.'], 400);
        }

        if (!empty($body['name'])) {
            $product->setName($body['name']);
        }
        if (array_key_exists('brand', $body)) {
            $product->setBrand($body['brand'] ?: null);
        }
        if (!empty($body['description'])) {
            $product->setDescription($body['description']);
        }
        if (array_key_exists('image_url', $body)) {
            $product->setImageUrl($body['image_url'] ?: null);
        }
        if (!empty($body['categoryId'])) {
            $category = $categoryRepository->find((int) $body['categoryId']);
            if ($category) {
                $product->setCategory($category);
            }
        }

        $entityManager->flush();

        return $this->json([
            'id' => $product->getId(),
            'name' => $product->getName(),
            'brand' => $product->getBrand(),
            'description' => $product->getDescription(),
            'image_url' => $product->getImageUrl(),
            'categoryId' => $product->getCategory()?->getId(),
        ]);
    }

    #[Route('/products/{id}', name: 'delete_product', methods: ['DELETE'])]
    public function deleteProduct(int $id, ProductRepository $productRepository, EntityManagerInterface $entityManager): JsonResponse
    {
        $product = $productRepository->find($id);
        if (!$product) {
            return $this->json(['error' => 'Product not found.'], 404);
        }

        try {
            $entityManager->remove($product);
            $entityManager->flush();
        } catch (ForeignKeyConstraintViolationException) {
            return $this->json([
                'error' => 'Cannot delete product while related listings or history records still exist.',
            ], 409);
        }

        return $this->json(['success' => true]);
    }
}
