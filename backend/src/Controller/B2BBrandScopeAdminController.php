<?php

namespace App\Controller;

use App\Entity\B2BMarket;
use App\Entity\Brand;
use App\Repository\BrandRepository;
use App\Security\AdminApiGuard;
use App\Service\BrandDiscoveryService;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Cache\CacheItemPoolInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/b2b/admin/brand-scope')]
final class B2BBrandScopeAdminController extends AbstractController
{
    use CachedResponseTrait;

    public function __construct(
        #[Autowire(service: 'general.cache')]
        private readonly CacheItemPoolInterface $cache,
        private readonly EntityManagerInterface $entityManager,
        private readonly BrandDiscoveryService $brandDiscoveryService,
        private readonly LoggerInterface $logger,
        private readonly BrandRepository $brandRepository,
    ) {
    }

    #[Route('', name: 'b2b_admin_brand_scope_list', methods: ['GET'])]
    public function list(Request $request, AdminApiGuard $adminApiGuard): JsonResponse
    {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $markets = $this->entityManager->getRepository(B2BMarket::class)->findAll();
        $result = [];

        foreach ($markets as $market) {
            if (!$market instanceof B2BMarket) continue;

            $keywords = $market->getBrandKeywords();
            $result[] = [
                'market_id' => $market->getId(),
                'company_name' => $market->getCompanyName(),
                'brand_id' => $market->getBrandEntity()?->getId(),
                'brand_name' => $market->getBrandName(),
                'seller_id' => $market->getSeller()?->getId(),
                'seller_name' => $market->getSeller()?->getName(),
                'brands_count' => count($keywords['brands'] ?? []),
                'brands_list' => $keywords['brands'] ?? [],
                'one_shot_count' => count($keywords['one_shot_keywords'] ?? []),
                'one_shot_list' => $keywords['one_shot_keywords'] ?? [],
                'suffix_count' => count($keywords['suffix_keywords'] ?? []),
                'suffix_list' => $keywords['suffix_keywords'] ?? [],
                'seller_count' => count($keywords['seller_ids'] ?? []),
                'product_count_estimate' => $keywords['product_count_estimate'] ?? 0,
                'last_discovered_at' => $keywords['last_discovered_at'] ?? null,
                'layer3_sample' => $keywords['layer3_sample'] ?? [],
            ];
        }

        return $this->json(['markets' => $result]);
    }

    #[Route('/{marketId}/assign-brand', name: 'b2b_admin_brand_scope_assign', methods: ['POST'])]
    public function assignBrand(int $marketId, Request $request, AdminApiGuard $adminApiGuard): JsonResponse
    {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $market = $this->entityManager->getRepository(B2BMarket::class)->find($marketId);
        if (!$market instanceof B2BMarket) {
            return $this->json(['error' => 'Market not found.'], 404);
        }

        $payload = json_decode($request->getContent(), true);
        $brandName = trim($payload['brand_name'] ?? '');

        if ($brandName === '') {
            return $this->json(['error' => 'brand_name is required.'], 400);
        }

        $market->setBrandName($brandName);
        $brand = $this->brandRepository->findOneBy(['name' => $brandName]);
        if ($brand !== null) {
            $market->setBrandEntity($brand);
        }
        $this->entityManager->flush();

        try {
            $keywords = $this->brandDiscoveryService->discover($market);
            $this->invalidateCache($this->cache);

            return $this->json([
                'success' => true,
                'market_id' => $marketId,
                'brand_name' => $market->getBrandName(),
                'product_count_estimate' => $keywords['product_count_estimate'] ?? 0,
                'brands_count' => count($keywords['brands'] ?? []),
                'one_shot_count' => count($keywords['one_shot_keywords'] ?? []),
                'last_discovered_at' => $keywords['last_discovered_at'] ?? null,
            ]);
        } catch (\Throwable $e) {
            $this->logger->error('Brand discovery after assign failed', [
                'market_id' => $marketId,
                'exception' => $e->getMessage(),
            ]);
            return $this->json([
                'success' => true,
                'warning' => 'Brand assigned but discovery failed: ' . $e->getMessage(),
                'brand_name' => $market->getBrandName(),
            ]);
        }
    }

    #[Route('/{marketId}/refresh', name: 'b2b_admin_brand_scope_refresh', methods: ['POST'])]
    public function refresh(int $marketId, Request $request, AdminApiGuard $adminApiGuard): JsonResponse
    {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $market = $this->entityManager->getRepository(B2BMarket::class)->find($marketId);
        if (!$market instanceof B2BMarket) {
            return $this->json(['error' => 'Market not found.'], 404);
        }

        if ($market->getBrandEntity() === null) {
            return $this->json(['error' => 'Market has no brand_id assigned.'], 400);
        }

        try {
            $keywords = $this->brandDiscoveryService->discover($market);
            $this->invalidateCache($this->cache);

            return $this->json([
                'success' => true,
                'market_id' => $marketId,
                'brand_id' => $market->getBrandEntity()?->getId(),
                'brand_name' => $market->getBrandName(),
                'product_count_estimate' => $keywords['product_count_estimate'] ?? 0,
                'brands_count' => count($keywords['brands'] ?? []),
                'one_shot_count' => count($keywords['one_shot_keywords'] ?? []),
                'last_discovered_at' => $keywords['last_discovered_at'] ?? null,
            ]);
        } catch (\Throwable $e) {
            $this->logger->error('Brand discovery refresh failed', [
                'market_id' => $marketId,
                'exception' => $e->getMessage(),
            ]);
            return $this->json(['error' => 'Brand discovery failed: ' . $e->getMessage()], 500);
        }
    }

    #[Route('/refresh-all', name: 'b2b_admin_brand_scope_refresh_all', methods: ['POST'])]
    public function refreshAll(Request $request, AdminApiGuard $adminApiGuard): JsonResponse
    {
        if ($errorResponse = $adminApiGuard->assertAuthorized($request)) {
            return $errorResponse;
        }

        $markets = $this->entityManager->getRepository(B2BMarket::class)->findAll();
        $results = [];
        $errors = [];

        foreach ($markets as $market) {
            if (!$market instanceof B2BMarket) continue;
            if ($market->getBrandEntity() === null) continue;

            try {
                $keywords = $this->brandDiscoveryService->discover($market);
                $results[] = [
                    'market_id' => $market->getId(),
                    'company_name' => $market->getCompanyName(),
                    'product_count_estimate' => $keywords['product_count_estimate'] ?? 0,
                ];
            } catch (\Throwable $e) {
                $errors[] = [
                    'market_id' => $market->getId(),
                    'error' => $e->getMessage(),
                ];
            }
        }

        $this->invalidateCache($this->cache);

        return $this->json([
            'success' => count($errors) === 0,
            'refreshed' => $results,
            'errors' => $errors,
            'total_refreshed' => count($results),
            'total_errors' => count($errors),
        ]);
    }
}
