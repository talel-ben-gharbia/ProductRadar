<?php

namespace App\Entity;

use App\Repository\B2BScrapingRequestRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: B2BScrapingRequestRepository::class)]
#[ORM\Table(name: 'b2b_scraping_request')]
class B2BScrapingRequest
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
    private ?string $target_type = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $target_url = null;

    #[ORM\Column(length: 20)]
    private ?string $status = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(nullable: true)]
    private ?bool $is_duplicate = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $duplicate_reason = null;

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

    public function getTargetType(): ?string
    {
        return $this->target_type;
    }

    public function setTargetType(string $targetType): static
    {
        $this->target_type = $targetType;
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

    public function getStatus(): ?string
    {
        return $this->status;
    }

    public function setStatus(string $status): static
    {
        $this->status = strtoupper($status);
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

    public function getIsDuplicate(): ?bool
    {
        return $this->is_duplicate;
    }

    public function setIsDuplicate(?bool $isDuplicate): static
    {
        $this->is_duplicate = $isDuplicate;
        return $this;
    }

    public function getDuplicateReason(): ?string
    {
        return $this->duplicate_reason;
    }

    public function setDuplicateReason(?string $duplicateReason): static
    {
        $this->duplicate_reason = $duplicateReason;
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
