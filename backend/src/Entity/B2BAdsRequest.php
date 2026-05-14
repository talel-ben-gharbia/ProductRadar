<?php

namespace App\Entity;

use App\Repository\B2BAdsRequestRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: B2BAdsRequestRepository::class)]
#[ORM\Table(name: 'b2b_ads_request', indexes: [
    new ORM\Index(name: 'idx_b2b_ads_request_owner_type', columns: ['owner_type']),
    new ORM\Index(name: 'idx_b2b_ads_request_status', columns: ['status']),
])]
class B2BAdsRequest
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
    private ?string $request_type = null;

    #[ORM\Column(length: 20)]
    private ?string $target_type = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $target_url = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $brand_filter = null;

    #[ORM\ManyToOne(targetEntity: Product::class)]
    #[ORM\JoinColumn(name: 'product_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Product $product = null;

    #[ORM\ManyToOne(targetEntity: Category::class)]
    #[ORM\JoinColumn(name: 'category_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Category $category = null;

    #[ORM\Column(nullable: true)]
    private ?int $duration_days = null;

    #[ORM\Column(nullable: true)]
    private ?float $budget_proposal = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(length: 20)]
    private ?string $status = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $created_at = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $updated_at = null;

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

    public function getRequestType(): ?string
    {
        return $this->request_type;
    }

    public function setRequestType(string $requestType): static
    {
        $this->request_type = strtoupper($requestType);

        return $this;
    }

    public function getTargetType(): ?string
    {
        return $this->target_type;
    }

    public function setTargetType(string $targetType): static
    {
        $this->target_type = strtoupper($targetType);

        return $this;
    }

    public function getTargetUrl(): ?string
    {
        return $this->target_url;
    }

    public function setTargetUrl(string $targetUrl): static
    {
        $this->target_url = $targetUrl;

        return $this;
    }

    public function getBrandFilter(): ?string
    {
        return $this->brand_filter;
    }

    public function setBrandFilter(?string $brandFilter): static
    {
        $this->brand_filter = $brandFilter;

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

    public function getDurationDays(): ?int
    {
        return $this->duration_days;
    }

    public function setDurationDays(?int $durationDays): static
    {
        $this->duration_days = $durationDays;

        return $this;
    }

    public function getBudgetProposal(): ?float
    {
        return $this->budget_proposal;
    }

    public function setBudgetProposal(?float $budgetProposal): static
    {
        $this->budget_proposal = $budgetProposal;

        return $this;
    }

    public function getNotes(): ?string
    {
        return $this->notes;
    }

    public function setNotes(?string $notes): static
    {
        $this->notes = $notes;

        return $this;
    }

    public function getStatus(): ?string
    {
        return $this->status;
    }

    public function setStatus(string $status): static
    {
        $this->status = strtoupper($status);

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
}
