<?php

namespace App\Service;

use App\Entity\B2BMarket;
use App\Entity\Brand;
use Doctrine\DBAL\ArrayParameterType;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;

class BrandDiscoveryService
{
    private const NOISE_WORDS = [
        'a','an','the','for','with','and','de','des','du','le','la','les','une','sur','dans','par',
        'et','ou','en','au','aux','ce','ces','son','sa','ses','pas','plus','pour',
        'etui','étui','adaptateur','chargeur','câble','coque','casque','haut','disque',
        'écouteurs','enceinte','clavier','souris','sac','multiprise','clé','écran',
        'smartphone','powerbank','power','speaker','pack','kit','tapis','support',
        'porte','hub','lot','batterie','charge','protection','eco',
        'blanc','noir','rouge','bleu','vert','jaune','violet','rose','orange','gris',
        'white','black','blue','red','green','yellow','purple','pink','orange','gray','grey',
        'silver','gold','space','midnight','starlight','cosmic','sideral','sidéral',
        'cpu','ram','gpu','ssd','hdd','usb','hdmi','type','aux','pd','gps','clip','gb',
        'eu','uk','us','fn',
        '1','2','3','4','5','6','7','8','9','0',
        'bracelet','sacoche','ecouteur','ecouteurs','porte-cartes','pointes',
        'protecteur','housse','prise',
        'fine','portefeuille','minerale','rigide','transparente',
        'magnétique','folio','métal','cuir','glass',
        'product','remote','magic',
        'naturel','sauge','désert','desert','ultramarine','chip',
        'muraho','mucef','muterc',
        'surface','macebook','magique','intense','spatial','indigo','boucle',
        'airtags','airtag','tracker','tiles','ethernet','hdmi','displayport',
        'dongle','adaptateur','adaptor','connectique','connectivite',
        'certifié','certified','refurbished','reconditionné','occasion',
        'garantie','warranty','extension','packaging','box','boite',
        'se','energizer','tapo','outremer','sarcelle','multipoint','esim','usbc','trail','trackpad','cabel',
        'wlacblbkm','bp8','c31','e92','e95',
    ];

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function discover(B2BMarket $market): array
    {
        $sellerId = $market->getSeller()?->getId();
        $brandEntity = $market->getBrandEntity();
        $brandName = $market->getBrandName();
        if ($sellerId === null || $brandEntity === null) {
            throw new \RuntimeException('Market must have a seller and brand_id set before discovery');
        }

        $brandId = $brandEntity->getId();
        $conn = $this->entityManager->getConnection();

        // Phase 1: Products the seller sells where brand_id matches
        $confirmedIds = $this->getBrandMatchedProductIds($conn, $sellerId, $brandId);

        if (empty($confirmedIds)) {
            $keywords = $this->buildEmptyKeywords($brandName ?? $brandEntity->getName(), $sellerId, $brandId);
            $market->setBrandKeywords($keywords);
            $this->entityManager->flush();
            return $keywords;
        }

        // Extract brand variations from confirmed products
        $allBrands = $this->extractBrandVariations($conn, $confirmedIds);
        $brandLower = mb_strtolower(trim($brandEntity->getName()));
        if (!in_array($brandLower, $allBrands, true)) {
            array_unshift($allBrands, $brandLower);
        }

        // Find all sellers who sell these products
        $allSellerIds = array_values(array_unique(array_merge(
            [$sellerId],
            $this->findSellersOfProducts($conn, $confirmedIds)
        )));

        $keywords = [
            'brand_name' => $brandName ?? $brandEntity->getName(),
            'brand_id' => $brandId,
            'seller_id' => $sellerId,
            'brands' => $allBrands,
            'one_shot_keywords' => [],
            'suffix_keywords' => [],
            'seller_ids' => $allSellerIds,
            'product_count_estimate' => count($confirmedIds),
            'last_discovered_at' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
        ];

        $market->setBrandKeywords($keywords);
        $this->entityManager->flush();

        return $keywords;
    }

    private function getBrandMatchedProductIds(Connection $conn, int $sellerId, int $brandId): array
    {
        $rows = $conn->fetchAllAssociative(
            'SELECT p.id
             FROM product p
             JOIN product_listing pl ON p.id = pl.product_id
             WHERE pl.seller_id = :sellerId
               AND p.brand_id = :brandId',
            ['sellerId' => $sellerId, 'brandId' => $brandId]
        );
        return array_values(array_unique(array_filter(
            array_map(static fn (array $r): int => (int) ($r['id'] ?? 0), $rows),
            static fn (int $id): bool => $id > 0
        )));
    }

    private function extractBrandVariations(Connection $conn, array $productIds): array
    {
        if (empty($productIds)) return [];

        $rows = $conn->fetchAllAssociative(
            'SELECT LOWER(p.brand) as brand, COUNT(DISTINCT p.id) as cnt
             FROM product p
             WHERE p.id IN (:ids)
               AND p.brand IS NOT NULL AND p.brand != \'\'
             GROUP BY LOWER(p.brand)
             HAVING COUNT(DISTINCT p.id) >= 2',
            ['ids' => $productIds],
            ['ids' => ArrayParameterType::INTEGER]
        );

        $brands = [];
        foreach ($rows as $row) {
            $brand = trim($row['brand']);
            if ($brand !== '' && !in_array($brand, self::NOISE_WORDS, true)) {
                $brands[] = $brand;
            }
        }
        return $brands;
    }

    private function findSellersOfProducts(Connection $conn, array $productIds): array
    {
        if (empty($productIds)) return [];

        $rows = $conn->fetchAllAssociative(
            'SELECT DISTINCT pl.seller_id FROM product_listing pl
             WHERE pl.product_id IN (:ids) AND pl.seller_id IS NOT NULL',
            ['ids' => $productIds],
            ['ids' => ArrayParameterType::INTEGER]
        );

        return array_values(array_filter(
            array_map(static fn (array $r): int => (int) ($r['seller_id'] ?? 0), $rows),
            static fn (int $id): bool => $id > 0
        ));
    }

    private function buildEmptyKeywords(string $brandName, int $sellerId, int $brandId): array
    {
        $brandLower = mb_strtolower(trim($brandName));
        return [
            'brand_name' => $brandName,
            'brand_id' => $brandId,
            'seller_id' => $sellerId,
            'brands' => [$brandLower],
            'one_shot_keywords' => [],
            'suffix_keywords' => [],
            'seller_ids' => [$sellerId],
            'product_count_estimate' => 0,
            'last_discovered_at' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
        ];
    }
}
