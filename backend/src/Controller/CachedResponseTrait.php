<?php

namespace App\Controller;

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

        $lockKey = $cacheKey . '._lock';
        $lock = $pool->getItem($lockKey);

        if ($lock->isHit()) {
            usleep(random_int(10000, 50000));
            $retry = $pool->getItem($cacheKey);
            if ($retry->isHit()) {
                return $this->json($retry->get());
            }
        }

        $lock->set(true);
        $lock->expiresAfter(30);
        $pool->save($lock);

        try {
            $data = $dataGenerator();
            $cacheItem->set($data);
            $cacheItem->expiresAfter($ttl);
            $pool->save($cacheItem);
            return $this->json($data);
        } finally {
            $pool->deleteItem($lockKey);
        }
    }

    protected function invalidateCache(CacheItemPoolInterface $pool): void
    {
        $pool->clear();
    }
}
