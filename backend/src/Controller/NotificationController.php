<?php

namespace App\Controller;

use App\Repository\NotificationRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Cache\CacheItemPoolInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class NotificationController extends AbstractController
{
    use CachedResponseTrait;

    private const CACHE_KEY_NOTIFICATIONS = 'notifications.all';

    public function __construct(
        #[Autowire(service: 'general.cache')]
        private readonly CacheItemPoolInterface $cache,
    ) {
    }

    #[Route('/notifications', name: 'get_notifications', methods: ['GET'])]
    public function getNotifications(Request $request, NotificationRepository $notificationRepository): JsonResponse
    {
        $clientId = $request->query->getInt('clientId', 0);

        $cacheKey = self::CACHE_KEY_NOTIFICATIONS . ".c{$clientId}";

        return $this->cachedGet($this->cache, $cacheKey, static function () use ($clientId, $notificationRepository): array {
            $qb = $notificationRepository
                ->createQueryBuilder('n')
                ->leftJoin('n.client', 'u')
                ->leftJoin('n.product_listing', 'pl')
                ->leftJoin('pl.product', 'p')
                ->select(
                    'n.id AS id',
                    'n.type AS type',
                    'n.message AS message',
                    'n.is_read AS is_read',
                    'n.created_at AS created_at',
                    'pl.id AS productListingId',
                    'pl.ref AS productRef',
                    'pl.price AS productPrice',
                    'p.id AS productId',
                    'p.name AS productName',
                    'p.image_url AS productImageUrl',
                    'u.id AS clientId'
                )
                ->orderBy('n.created_at', 'DESC');

            if ($clientId > 0) {
                $qb
                    ->andWhere('u.id = :clientId')
                    ->setParameter('clientId', $clientId);
            }

            $rows = $qb->getQuery()->getArrayResult();

            return array_map(static function (array $row): array {
                return [
                    'id' => isset($row['id']) ? (int) $row['id'] : null,
                    'type' => $row['type'] ?? null,
                    'message' => $row['message'] ?? null,
                    'is_read' => isset($row['is_read']) ? (bool) $row['is_read'] : false,
                    'created_at' => isset($row['created_at'])
                        ? $row['created_at'] instanceof \DateTimeInterface
                            ? $row['created_at']->format(DATE_ATOM)
                            : (string) $row['created_at']
                        : null,
                    'productListingId' => isset($row['productListingId']) ? (int) $row['productListingId'] : null,
                    'productRef' => $row['productRef'] ?? null,
                    'productPrice' => isset($row['productPrice']) ? (float) $row['productPrice'] : null,
                    'productId' => isset($row['productId']) ? (int) $row['productId'] : null,
                    'productName' => $row['productName'] ?? null,
                    'productImageUrl' => $row['productImageUrl'] ?? null,
                    'clientId' => isset($row['clientId']) ? (int) $row['clientId'] : null,
                ];
            }, $rows);
        });
    }

    #[Route('/notifications/{id}/read', name: 'mark_notification_read', methods: ['PUT'])]
    public function markNotificationRead(
        int $id,
        Request $request,
        NotificationRepository $notificationRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $notification = $notificationRepository->find($id);

        if (!$notification) {
            return $this->json(['error' => 'Notification not found.'], 404);
        }

        $body = json_decode($request->getContent(), true);
        $clientId = is_array($body) ? (int) ($body['clientId'] ?? 0) : 0;

        if ($clientId > 0 && $notification->getClient()?->getId() !== $clientId) {
            return $this->json(['error' => 'Forbidden.'], 403);
        }

        $notification->setIsRead(true);
        $entityManager->flush();

        $this->invalidateCache($this->cache);

        return $this->json([
            'id' => $notification->getId(),
            'is_read' => $notification->isRead(),
            'productListingId' => $notification->getProductListing()?->getId(),
            'productId' => $notification->getProductListing()?->getProduct()?->getId(),
        ]);
    }
}
