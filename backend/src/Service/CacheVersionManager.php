<?php

namespace App\Service;

use Psr\Cache\CacheItemPoolInterface;

final class CacheVersionManager
{
    private const VERSION_PREFIX = 'cache_ver.';

    public function __construct(
        private readonly CacheItemPoolInterface $cache,
    ) {
    }

    public function getVersion(string $namespace): int
    {
        $item = $this->cache->getItem(self::VERSION_PREFIX . $namespace);
        if (!$item->isHit()) {
            $item->set(1);
            $item->expiresAfter(86400);
            $this->cache->save($item);
            return 1;
        }
        return (int) $item->get();
    }

    public function bumpVersion(string $namespace): void
    {
        $next = $this->getVersion($namespace) + 1;
        $item = $this->cache->getItem(self::VERSION_PREFIX . $namespace);
        $item->set($next);
        $item->expiresAfter(86400);
        $this->cache->save($item);
    }
}
