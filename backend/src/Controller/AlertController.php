<?php

namespace App\Controller;

use App\Entity\Alert;
use App\Entity\B2BCompany;
use App\Entity\B2BMarket;
use App\Repository\AlertRepository;
use App\Repository\ProductRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Cache\CacheItemPoolInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class AlertController extends AbstractController
{
    use CachedResponseTrait;

    private const DEFAULT_FREEMIUM_ALERTS_LIMIT = 3;
    private const CACHE_KEY_ALERTS = 'alerts.all';

    public function __construct(
        #[Autowire(service: 'general.cache')]
        private readonly CacheItemPoolInterface $cache,
    ) {
    }

    #[Route('/alerts', name: 'get_alerts', methods: ['GET'])]
    public function getAlerts(Request $request, AlertRepository $alertRepository): JsonResponse
    {
        $alerterId = $request->query->getInt('alerterId', 0);
        $productId = $request->query->getInt('productId', 0);

        $cacheKey = self::CACHE_KEY_ALERTS . ".a{$alerterId}.p{$productId}";

        return $this->cachedGet($this->cache, $cacheKey, static function () use ($alerterId, $productId, $alertRepository): array {
            $qb = $alertRepository
                ->createQueryBuilder('a')
                ->leftJoin('a.product', 'p')
                ->leftJoin('a.alerter', 'u')
                ->select(
                    'a.id AS id',
                    'a.is_price_notif AS is_price_notif',
                    'a.is_stock_notif AS is_stock_notif',
                    'a.cancelled AS cancelled',
                    'p.id AS productId',
                    'p.name AS productName',
                    'p.image_url AS productImageUrl',
                    'u.id AS alerterId'
                )
                ->where('a.cancelled = false')
                ->orderBy('a.id', 'DESC');

            if ($alerterId > 0) {
                $qb
                    ->andWhere('u.id = :alerterId')
                    ->setParameter('alerterId', $alerterId);
            }

            if ($productId > 0) {
                $qb
                    ->andWhere('p.id = :productId')
                    ->setParameter('productId', $productId);
            }

            $rows = $qb->getQuery()->getArrayResult();

            return array_map(static function (array $row): array {
                return [
                    'id' => isset($row['id']) ? (int) $row['id'] : null,
                    'is_price_notif' => isset($row['is_price_notif']) ? (bool) $row['is_price_notif'] : false,
                    'is_stock_notif' => isset($row['is_stock_notif']) ? (bool) $row['is_stock_notif'] : false,
                    'cancelled' => isset($row['cancelled']) ? (bool) $row['cancelled'] : false,
                    'productId' => isset($row['productId']) ? (int) $row['productId'] : null,
                    'productName' => $row['productName'] ?? null,
                    'productImageUrl' => $row['productImageUrl'] ?? null,
                    'alerterId' => isset($row['alerterId']) ? (int) $row['alerterId'] : null,
                ];
            }, $rows);
        });
    }

    #[Route('/alerts', name: 'create_alert', methods: ['POST'])]
    public function createAlert(
        Request $request,
        AlertRepository $alertRepository,
        ProductRepository $productRepository,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return $this->json(['error' => 'Invalid body.'], 400);
        }

        $productId = (int) ($body['productId'] ?? 0);
        $alerterId = (int) ($body['alerterId'] ?? 0);
        $isPriceNotif = array_key_exists('is_price_notif', $body) ? (bool) $body['is_price_notif'] : false;
        $isStockNotif = array_key_exists('is_stock_notif', $body) ? (bool) $body['is_stock_notif'] : false;

        if ($productId <= 0 || $alerterId <= 0) {
            return $this->json(['error' => 'productId and alerterId are required.'], 400);
        }

        if (!$isPriceNotif && !$isStockNotif) {
            return $this->json(['error' => 'Choose at least one alert type.'], 400);
        }

        $product = $productRepository->find($productId);
        if (!$product) {
            return $this->json(['error' => 'Product not found.'], 404);
        }

        $alerter = $userRepository->find($alerterId);
        if (!$alerter) {
            return $this->json(['error' => 'Alerter not found.'], 404);
        }

        $isB2B = $alerter instanceof B2BCompany || $alerter instanceof B2BMarket;

        // Authenticated users without subscription are treated as Freemium.
        $alertsLimit = (int) ($alerter->getSubscription()?->getAlertsLimit() ?? self::DEFAULT_FREEMIUM_ALERTS_LIMIT);
        if ($alertsLimit <= 0) {
            $alertsLimit = self::DEFAULT_FREEMIUM_ALERTS_LIMIT;
        }

        // Lifetime cap: cancelled alerts still count against the plan quota.
        $totalAlertsCount = $alertRepository->count([
            'alerter' => $alerter,
        ]);

        // Check if user already has this alert
        $existing = $alertRepository->findOneBy([
            'product' => $product,
            'alerter' => $alerter,
        ]);

        // Only enforce limit if creating a new alert
        if (!$isB2B && !$existing && $totalAlertsCount >= $alertsLimit) {
            return $this->json([
                'error' => 'Alert limit reached.',
                'message' => 'You have reached the maximum number of alerts (' . $alertsLimit . ') for your plan.',
                'limit' => $alertsLimit,
                'current' => $totalAlertsCount,
            ], 429);
        }

        $alert = $existing instanceof Alert ? $existing : new Alert();
        $alert->setProduct($product);
        $alert->setAlerter($alerter);
        $alert->setIsPriceNotif($isPriceNotif);
        $alert->setIsStockNotif($isStockNotif);
        $alert->setCancelled(false); // Ensure it's not cancelled

        if (!$existing instanceof Alert) {
            $entityManager->persist($alert);
        }

        $entityManager->flush();

        $this->invalidateCache($this->cache);

        return $this->json([
            'id' => $alert->getId(),
            'is_price_notif' => $alert->isPriceNotif(),
            'is_stock_notif' => $alert->isStockNotif(),
            'cancelled' => $alert->isCancelled(),
            'productId' => $product->getId(),
            'productName' => $product->getName(),
            'productImageUrl' => $product->getImageUrl(),
            'alerterId' => $alerter->getId(),
        ], $existing instanceof Alert ? 200 : 201);
    }

    #[Route('/alerts/{id}', name: 'update_alert', methods: ['PUT'])]
    public function updateAlert(
        int $id,
        Request $request,
        AlertRepository $alertRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $alert = $alertRepository->find($id);
        if (!$alert) {
            return $this->json(['error' => 'Alert not found.'], 404);
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return $this->json(['error' => 'Invalid body.'], 400);
        }

        $alerterId = (int) ($body['alerterId'] ?? 0);
        if ($alerterId > 0 && $alert->getAlerter()?->getId() !== $alerterId) {
            return $this->json(['error' => 'Forbidden.'], 403);
        }

        $isPriceNotif = array_key_exists('is_price_notif', $body) ? (bool) $body['is_price_notif'] : (bool) $alert->isPriceNotif();
        $isStockNotif = array_key_exists('is_stock_notif', $body) ? (bool) $body['is_stock_notif'] : (bool) $alert->isStockNotif();

        if (!$isPriceNotif && !$isStockNotif) {
            return $this->json(['error' => 'Choose at least one alert type.'], 400);
        }

        $alert->setIsPriceNotif($isPriceNotif);
        $alert->setIsStockNotif($isStockNotif);

        $entityManager->flush();

        $this->invalidateCache($this->cache);

        return $this->json([
            'id' => $alert->getId(),
            'is_price_notif' => $alert->isPriceNotif(),
            'is_stock_notif' => $alert->isStockNotif(),
            'productId' => $alert->getProduct()?->getId(),
            'productName' => $alert->getProduct()?->getName(),
            'productImageUrl' => $alert->getProduct()?->getImageUrl(),
            'alerterId' => $alert->getAlerter()?->getId(),
        ]);
    }

    #[Route('/alerts/{id}', name: 'delete_alert', methods: ['DELETE'])]
    public function deleteAlert(
        int $id,
        Request $request,
        AlertRepository $alertRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $alert = $alertRepository->find($id);
        if (!$alert) {
            return $this->json(['error' => 'Alert not found.'], 404);
        }

        $alerterId = $request->query->getInt('alerterId', 0);
        if ($alerterId > 0 && $alert->getAlerter()?->getId() !== $alerterId) {
            return $this->json(['error' => 'Forbidden.'], 403);
        }

        // Keep history and do not free quota: mark alert as cancelled.
        $alert->setCancelled(true);
        $entityManager->flush();

        $this->invalidateCache($this->cache);

        return $this->json(['success' => true, 'message' => 'Alert cancelled successfully']);
    }
}
