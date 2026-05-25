<?php

namespace App\Entity;

use App\Repository\PriceHistoryRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: PriceHistoryRepository::class)]
#[ORM\Index(name: 'idx_price_history_listing_recorded', columns: ['product_listing_id', 'recorded_at'])]
#[ORM\Index(name: 'idx_price_history_recorded_seller', columns: ['recorded_at', 'seller_id'])]
class PriceHistory
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column]
    private ?float $recorded_price = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $recorded_at = null;

    #[ORM\Column]
    private ?bool $out_of_stock = null;

    #[ORM\Column]
    private ?bool $anomaly = null;

    #[ORM\ManyToOne(inversedBy: 'priceHistories')]
    private ?ProductListing $productListing = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Seller $seller = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getRecordedPrice(): ?float
    {
        return $this->recorded_price;
    }

    public function setRecordedPrice(float $recorded_price): static
    {
        $this->recorded_price = $recorded_price;

        return $this;
    }

    public function getRecordedAt(): ?\DateTimeImmutable
    {
        return $this->recorded_at;
    }

    public function setRecordedAt(\DateTimeImmutable $recorded_at): static
    {
        $this->recorded_at = $recorded_at;

        return $this;
    }

    public function isOutOfStock(): ?bool
    {
        return $this->out_of_stock;
    }

    public function setOutOfStock(bool $out_of_stock): static
    {
        $this->out_of_stock = $out_of_stock;

        return $this;
    }

    public function isAnomaly(): ?bool
    {
        return $this->anomaly;
    }

    public function setAnomaly(bool $anomaly): static
    {
        $this->anomaly = $anomaly;

        return $this;
    }

    public function getProductListing(): ?ProductListing
    {
        return $this->productListing;
    }

    public function setProductListing(?ProductListing $productListing): static
    {
        $this->productListing = $productListing;

        return $this;
    }

    public function getSeller(): ?Seller
    {
        return $this->seller;
    }

    public function setSeller(?Seller $seller): static
    {
        $this->seller = $seller;

        return $this;
    }
}
