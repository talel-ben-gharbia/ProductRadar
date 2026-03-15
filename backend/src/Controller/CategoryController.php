<?php

namespace App\Controller;

use App\Entity\Category;
use App\Repository\CategoryRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class CategoryController extends AbstractController
{
    #[Route('/categories', name: 'get_categories', methods: ['GET'])]
    public function getCategories(CategoryRepository $categoryRepository): JsonResponse
    {
        $categories = $categoryRepository->findBy([], ['name' => 'ASC']);

        $data = array_map(
            static fn($category) => [
                'id' => $category->getId(),
                'name' => $category->getName(),
                'parentId' => $category->getParent()?->getId(),
            ],
            $categories,
        );

        return $this->json($data);
    }

    #[Route('/categories/{id}/children', name: 'get_category_children', methods: ['GET'])]
    public function getCategoryChildren(int $id, CategoryRepository $categoryRepository): JsonResponse
    {
        $children = $categoryRepository->findChildrenByParentId($id);

        $data = array_map(
            static fn($category) => [
                'id' => $category->getId(),
                'name' => $category->getName(),
                'parentId' => $category->getParent()?->getId(),
            ],
            $children,
        );

        return $this->json($data);
    }

    #[Route('/categories', name: 'create_category', methods: ['POST'])]
    public function createCategory(Request $request, CategoryRepository $categoryRepository, EntityManagerInterface $entityManager): JsonResponse
    {
        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return $this->json(['error' => 'Invalid body.'], 400);
        }

        $name = trim((string) ($body['name'] ?? ''));
        if ($name === '') {
            return $this->json(['error' => 'Category name is required.'], 400);
        }

        $category = new Category();
        $category->setName($name);

        if (array_key_exists('parentId', $body) && $body['parentId'] !== null && $body['parentId'] !== '') {
            $parent = $categoryRepository->find((int) $body['parentId']);
            if (!$parent) {
                return $this->json(['error' => 'Parent category not found.'], 404);
            }

            $category->setParent($parent);
        }

        $entityManager->persist($category);
        $entityManager->flush();

        return $this->json([
            'id' => $category->getId(),
            'name' => $category->getName(),
            'parentId' => $category->getParent()?->getId(),
        ], 201);
    }
}
