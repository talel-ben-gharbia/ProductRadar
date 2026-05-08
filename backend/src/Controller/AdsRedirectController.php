<?php

namespace App\Controller;

use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

/**
 * Handles ad landing page redirects.
 * When customers click on ads, they are directed through this controller
 * which tracks the click and redirects to the appropriate product/brand/category page.
 */
#[Route('/ads', name: 'ads_')]
final class AdsRedirectController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {}

    /**
     * Redirect to a specific product ad landing page.
     */
    #[Route('/redirect/product/{productId}', name: 'redirect_product', requirements: ['productId' => '\d+'])]
    public function redirectProduct(int $productId): Response
    {
        $this->logClick('product', (string) $productId);
        return $this->redirect(sprintf('/B2C/products/%d', $productId), Response::HTTP_MOVED_PERMANENTLY);
    }

    /**
     * Redirect to a brand group ad landing page (filtered by brand within a category).
     */
    #[Route('/redirect/brand/{categoryId}/{brand}', name: 'redirect_brand', requirements: ['categoryId' => '\d+'])]
    public function redirectBrand(int $categoryId, string $brand): Response
    {
        $this->logClick('brand_group', sprintf('%d/%s', $categoryId, $brand));
        return $this->redirect(
            sprintf('/B2C/products?categoryId=%d&brand=%s', $categoryId, urlencode($brand)),
            Response::HTTP_MOVED_PERMANENTLY
        );
    }

    /**
     * Redirect to a category ad landing page.
     */
    #[Route('/redirect/category/{categoryId}', name: 'redirect_category', requirements: ['categoryId' => '\d+'])]
    public function redirectCategory(int $categoryId): Response
    {
        $this->logClick('category', (string) $categoryId);
        return $this->redirect(sprintf('/B2C/products?categoryId=%d', $categoryId), Response::HTTP_MOVED_PERMANENTLY);
    }

    private function logClick(string $targetType, string $targetRef): void
    {
        try {
            $conn = $this->entityManager->getConnection();
            $conn->executeStatement(
                'INSERT INTO scraping_log (source_name, workflow_name, status, duration_ms, records_processed, executed_at)
                 VALUES (:source, :workflow, :status, 0, 1, NOW())',
                [
                    'source' => 'ad_click',
                    'workflow' => sprintf('%s:%s', $targetType, $targetRef),
                    'status' => 'SUCCESS',
                ]
            );
        } catch (\Throwable) {
        }
    }
}
