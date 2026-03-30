<?php

namespace App\Controller;

use App\Repository\PriceHistoryRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class PriceHistoryController extends AbstractController
{
    #[Route('/price-history', name: 'get_price_history', methods: ['GET'])]
    public function getPriceHistory(Request $request, PriceHistoryRepository $priceHistoryRepository): JsonResponse
    {
        $productId = $request->query->getInt('productId', 0);
        $listingId = $request->query->getInt('listingId', 0);

        $rows = $priceHistoryRepository->findHistoryRows(
            $productId > 0 ? $productId : null,
            $listingId > 0 ? $listingId : null,
        );

        $data = array_map(static function (array $row): array {
            $recordedAt = $row['recordedAt'] ?? null;
            $sellerFromHistory = $row['sellerFromHistory'] ?? null;
            $sellerFromListing = $row['sellerFromListing'] ?? null;
            $sellerFromListingName = $row['sellerFromListingName'] ?? null;

            return [
                'id' => $row['id'] ?? null,
                'recorded_price' => $row['recordedPrice'] ?? null,
                'recorded_at' => $recordedAt instanceof \DateTimeInterface ? $recordedAt->format(DATE_ATOM) : $recordedAt,
                'out_of_stock' => $row['outOfStock'] ?? null,
                'anomaly' => $row['anomaly'] ?? null,
                'productListingId' => $row['listingId'] ?? null,
                'sellerId' => $sellerFromHistory !== null ? (int) $sellerFromHistory : ($sellerFromListing !== null ? (int) $sellerFromListing : null),
                'sellerName' => is_string($sellerFromListingName) && trim($sellerFromListingName) !== '' ? $sellerFromListingName : null,
            ];
        }, $rows);

        return $this->json($data);
    }
}
