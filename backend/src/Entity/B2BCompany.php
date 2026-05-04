<?php

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: 'b2b_company', indexes: [
    new ORM\Index(name: 'idx_b2b_company_status', columns: ['b2b_status']),
])]
class B2BCompany extends User
{
    #[ORM\OneToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'owner_user_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?User $ownerUser = null;

    #[ORM\ManyToOne(targetEntity: Seller::class)]
    #[ORM\JoinColumn(name: 'seller_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Seller $seller = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $full_name = null;

    #[ORM\Column(length: 255)]
    private ?string $company_name = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $company_market = null;

    #[ORM\Column(length: 2, nullable: true)]
    private ?string $company_country = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $company_website = null;

    #[ORM\Column(length: 50, options: ['default' => 'PENDING'])]
    private ?string $b2b_status = 'PENDING';

    #[ORM\Column]
    private ?\DateTimeImmutable $joinedAt = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $updatedAt = null;

    #[ORM\Column]
    private ?bool $is_verified = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $usage_json = null;

    public function getFullName(): ?string
    {
        return $this->full_name;
    }

    public function setFullName(?string $full_name): static
    {
        $this->full_name = $full_name;

        return $this;
    }

    public function getCompanyName(): ?string
    {
        return $this->company_name;
    }

    public function setCompanyName(?string $company_name): static
    {
        $this->company_name = $company_name;

        return $this;
    }

    public function getCompanyMarket(): ?string
    {
        return $this->company_market;
    }

    public function setCompanyMarket(?string $company_market): static
    {
        $this->company_market = $company_market;

        return $this;
    }

    public function getCompanyCountry(): ?string
    {
        return $this->company_country;
    }

    public function setCompanyCountry(?string $company_country): static
    {
        $this->company_country = $company_country;

        return $this;
    }

    public function getCompanyWebsite(): ?string
    {
        return $this->company_website;
    }

    public function setCompanyWebsite(?string $company_website): static
    {
        $this->company_website = $company_website;

        return $this;
    }

    public function getB2bStatus(): ?string
    {
        return $this->b2b_status;
    }

    public function setB2bStatus(?string $b2b_status): static
    {
        $this->b2b_status = $b2b_status !== null ? strtoupper($b2b_status) : null;

        return $this;
    }

    public function getJoinedAt(): ?\DateTimeImmutable
    {
        return $this->joinedAt;
    }

    public function setJoinedAt(\DateTimeImmutable $joinedAt): static
    {
        $this->joinedAt = $joinedAt;

        return $this;
    }

    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(?\DateTimeImmutable $updatedAt): static
    {
        $this->updatedAt = $updatedAt;

        return $this;
    }

    public function isVerified(): ?bool
    {
        return $this->is_verified;
    }

    public function setIsVerified(bool $is_verified): static
    {
        $this->is_verified = $is_verified;

        return $this;
    }

    public function getOwnerUser(): ?User
    {
        return $this->ownerUser;
    }

    public function setOwnerUser(?User $ownerUser): static
    {
        $this->ownerUser = $ownerUser;

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

    public function getUsageJson(): ?array
    {
        return $this->usage_json;
    }

    public function setUsageJson(?array $usageJson): static
    {
        $this->usage_json = $usageJson;

        return $this;
    }

}
