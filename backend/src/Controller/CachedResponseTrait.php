<?php

namespace App\Controller;

use App\Service\CacheVersionManager;
use Psr\Cache\CacheItemPoolInterface;
use Symfony\Component\HttpFoundation\JsonResponse;

trait CachedResponseTrait
{
    protected function cachedGet(CacheItemPoolInterface $pool, string $cacheKey, callable $dataGenerator, int $ttl = 300): JsonResponse
    {
        $cacheItem = $pool->getItem($cacheKey);
        if ($cacheItem->isHit()) {
            return $this->json($cacheItem->get());
        }

        $data = $dataGenerator();

        $cacheItem->set($data);
        $cacheItem->expiresAfter($ttl);
        $pool->save($cacheItem);

        return $this->json($data);
    }

    protected function invalidateCache(CacheItemPoolInterface $pool): void
    {
        $pool->clear();
    }

    protected function invalidateUserCache(CacheVersionManager $versionManager, CacheItemPoolInterface $pool, string $namespace): void
    {
        $versionManager->bumpVersion($namespace);
    }

    protected function buildUserCacheKey(CacheVersionManager $versionManager, string $namespace, string $innerKey): string
    {
        $version = $versionManager->getVersion($namespace);
        return "v{$version}.{$namespace}.{$innerKey}";
    }
}
