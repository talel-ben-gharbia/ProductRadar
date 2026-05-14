<?php

namespace App\Entity;

use App\Repository\B2BWatchlistRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: B2BWatchlistRepository::class)]
#[ORM\Table(name: 'b2b_watchlist', indexes: [
    new ORM\Index(name: 'idx_b2b_watchlist_owner_type', columns: ['owner_type']),
    new ORM\Index(name: 'idx_b2b_watchlist_item_type', columns: ['item_type']),
])]
#[ORM\UniqueConstraint(name: 'UNIQ_B2B_WATCHLIST_COMPANY_PRODUCT', columns: ['company_id', 'product_id'])]
class B2BWatchlist
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 20)]
    private ?string $owner_type = null;

    #[ORM\ManyToOne(targetEntity: B2BCompany::class)]
    #[ORM\JoinColumn(name: 'company_id', referencedColumnName: 'id', nullable: true, onDelete: 'CASCADE')]
    private ?B2BCompany $company = null;

    #[ORM\ManyToOne(targetEntity: B2BMarket::class)]
    #[ORM\JoinColumn(name: 'market_id', referencedColumnName: 'id', nullable: true, onDelete: 'CASCADE')]
    private ?B2BMarket $market = null;

    #[ORM\Column(length: 20)]
    private ?string $item_type = null;

    #[ORM\ManyToOne(targetEntity: Product::class)]
    #[ORM\JoinColumn(name: 'product_id', referencedColumnName: 'id', nullable: true, onDelete: 'CASCADE')]
    private ?Product $product = null;

    #[ORM\ManyToOne(targetEntity: Category::class)]
    #[ORM\JoinColumn(name: 'category_id', referencedColumnName: 'id', nullable: true, onDelete: 'CASCADE')]
    private ?Category $category = null;

    #[ORM\ManyToOne(targetEntity: Seller::class)]
    #[ORM\JoinColumn(name: 'seller_id', referencedColumnName: 'id', nullable: true, onDelete: 'CASCADE')]
    private ?Seller $seller = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $brand = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $created_at = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $updated_at = null;

    #[ORM\Column(type: 'float', nullable: true)]
    private ?float $baseline_price = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getOwnerType(): ?string
    {
        return $this->owner_type;
    }

    public function setOwnerType(string $ownerType): static
    {
        $this->owner_type = strtoupper($ownerType);

        return $this;
    }

    public function getCompany(): ?B2BCompany
    {
        return $this->company;
    }

    public function setCompany(?B2BCompany $company): static
    {
        $this->company = $company;

        return $this;
    }

    public function getMarket(): ?B2BMarket
    {
        return $this->market;
    }

    public function setMarket(?B2BMarket $market): static
    {
        $this->market = $market;

        return $this;
    }

    public function getItemType(): ?string
    {
        return $this->item_type;
    }

    public function setItemType(string $itemType): static
    {
        $this->item_type = strtoupper($itemType);

        return $this;
    }

    public function getProduct(): ?Product
    {
        return $this->product;
    }

    public function setProduct(?Product $product): static
    {
        $this->product = $product;

        return $this;
    }

    public function getCategory(): ?Category
    {
        return $this->category;
    }

    public function setCategory(?Category $category): static
    {
        $this->category = $category;

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

    public function getBrand(): ?string
    {
        return $this->brand;
    }

    public function setBrand(?string $brand): static
    {
        $this->brand = $brand;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->created_at;
    }

    public function setCreatedAt(?\DateTimeImmutable $createdAt): static
    {
        $this->created_at = $createdAt;

        return $this;
    }

    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updated_at;
    }

    public function setUpdatedAt(?\DateTimeImmutable $updatedAt): static
    {
        $this->updated_at = $updatedAt;

        return $this;
    }

    public function getBaselinePrice(): ?float
    {
        return $this->baseline_price;
    }

    public function setBaselinePrice(?float $baselinePrice): static
    {
        $this->baseline_price = $baselinePrice;

        return $this;
    }
}
