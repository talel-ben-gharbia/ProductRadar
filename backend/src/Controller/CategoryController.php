<?php

namespace App\Controller;

use App\Repository\CategoryRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
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
}
