<?php

namespace App\Entity;

use App\Repository\B2BSearchLogRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: B2BSearchLogRepository::class)]
#[ORM\Table(name: 'b2b_search_log', indexes: [
    new ORM\Index(name: 'idx_b2b_search_log_owner_type', columns: ['owner_type']),
    new ORM\Index(name: 'idx_b2b_search_log_created', columns: ['created_at']),
    new ORM\Index(name: 'idx_b2b_search_log_owner_created', columns: ['owner_type', 'created_at']),
])]
class B2BSearchLog
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

    #[ORM\Column(type: 'text')]
    private ?string $query = null;

    #[ORM\Column(nullable: true)]
    private ?int $results_count = null;

    #[ORM\Column(nullable: true)]
    private ?bool $zero_results = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $created_at = null;

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

    public function getQuery(): ?string
    {
        return $this->query;
    }

    public function setQuery(string $query): static
    {
        $this->query = $query;

        return $this;
    }

    public function getResultsCount(): ?int
    {
        return $this->results_count;
    }

    public function setResultsCount(?int $resultsCount): static
    {
        $this->results_count = $resultsCount;

        return $this;
    }

    public function isZeroResults(): ?bool
    {
        return $this->zero_results;
    }

    public function setZeroResults(?bool $zeroResults): static
    {
        $this->zero_results = $zeroResults;

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
}
