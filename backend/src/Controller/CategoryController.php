<?php

namespace App\Controller;

use App\Entity\Category;
use App\Repository\CategoryRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Cache\CacheItemPoolInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class CategoryController extends AbstractController
{
    use CachedResponseTrait;

    private const CACHE_KEY_CATEGORIES = 'categories.all';
    private const CACHE_KEY_CHILDREN_PREFIX = 'categories.children.';

    public function __construct(
        #[Autowire(service: 'general.cache')]
        private readonly CacheItemPoolInterface $cache,
    ) {
    }

    #[Route('/categories', name: 'get_categories', methods: ['GET'])]
    public function getCategories(CategoryRepository $categoryRepository): JsonResponse
    {
        return $this->cachedGet($this->cache, self::CACHE_KEY_CATEGORIES, static function () use ($categoryRepository): array {
            $categories = $categoryRepository->findBy([], ['name' => 'ASC']);

            return array_map(
                static fn($category) => [
                    'id' => $category->getId(),
                    'name' => $category->getName(),
                    'parentId' => $category->getParent()?->getId(),
                ],
                $categories,
            );
        });
    }

    #[Route('/categories/{id}/children', name: 'get_category_children', methods: ['GET'])]
    public function getCategoryChildren(int $id, CategoryRepository $categoryRepository): JsonResponse
    {
        return $this->cachedGet($this->cache, self::CACHE_KEY_CHILDREN_PREFIX . $id, static function () use ($id, $categoryRepository): array {
            $children = $categoryRepository->findChildrenByParentId($id);

            return array_map(
                static fn($category) => [
                    'id' => $category->getId(),
                    'name' => $category->getName(),
                    'parentId' => $category->getParent()?->getId(),
                ],
                $children,
            );
        });
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

        $this->invalidateCache($this->cache);

        return $this->json([
            'id' => $category->getId(),
            'name' => $category->getName(),
            'parentId' => $category->getParent()?->getId(),
        ], 201);
    }
}
