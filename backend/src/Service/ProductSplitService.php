<?php

namespace App\Service;

use App\Entity\Category;
use App\Entity\Product;
use App\Entity\ProductListing;
use Doctrine\ORM\EntityManagerInterface;

final class ProductSplitService
{
    public function __construct(private EntityManagerInterface $entityManager)
    {
    }

    public function splitListingToNewProduct(
        ProductListing $listing,
        string $name,
        ?string $brand,
        ?string $description,
        ?string $imageUrl,
        ?Category $category,
    ): Product {
        $sourceProduct = $listing->getProduct();
        $targetCategory = $category ?? $sourceProduct?->getCategory();

        if ($targetCategory === null) {
            throw new \InvalidArgumentException('Target category is required to split listing.');
        }

        $safeName = trim($name);
        if ($safeName === '') {
            throw new \InvalidArgumentException('New product name is required.');
        }

        $safeDescription = trim((string) $description);
        if ($safeDescription === '') {
            $safeDescription = trim((string) $sourceProduct?->getDescription());
        }
        if ($safeDescription === '') {
            $safeDescription = sprintf('Auto-created from listing #%d split operation.', $listing->getId());
        }

        $product = new Product();
        $product->setName($safeName);
        $product->setBrand($this->normalizeNullableText($brand) ?? $sourceProduct?->getBrand());
        $product->setDescription($safeDescription);
        $product->setImageUrl($this->normalizeNullableText($imageUrl) ?? $sourceProduct?->getImageUrl());
        $product->setSpecsJson($sourceProduct?->getSpecsJson());
        $product->setCategory($targetCategory);

        $this->entityManager->persist($product);

        $listing->setProduct($product);
        $listing->setUpdatetAt(new \DateTimeImmutable());

        $this->entityManager->flush();

        return $product;
    }

    private function normalizeNullableText(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $normalized = trim($value);

        return $normalized === '' ? null : $normalized;
    }
}
