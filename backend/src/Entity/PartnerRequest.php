<?php

namespace App\Entity;

use App\Repository\PartnerRequestRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: PartnerRequestRepository::class)]
#[ORM\Table(name: 'partner_request', indexes: [
    new ORM\Index(name: 'idx_partner_request_created', columns: ['created_at']),
], uniqueConstraints: [
    new ORM\UniqueConstraint(name: 'uniq_partner_request_email_type', columns: ['email', 'account_type']),
])]
class PartnerRequest
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $email = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $full_name = null;

    #[ORM\Column(length: 50)]
    private ?string $account_type = null;

    #[ORM\Column(length: 255)]
    private ?string $company_name = null;

    #[ORM\Column(length: 255)]
    private ?string $company_market = null;

    #[ORM\Column(length: 2)]
    private ?string $company_country = null;

    #[ORM\Column(length: 255)]
    private ?string $company_website = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $notes = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $created_at = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(string $email): static
    {
        $this->email = strtolower(trim($email));

        return $this;
    }

    public function getFullName(): ?string
    {
        return $this->full_name;
    }

    public function setFullName(?string $full_name): static
    {
        $this->full_name = $full_name;

        return $this;
    }

    public function getAccountType(): ?string
    {
        return $this->account_type;
    }

    public function setAccountType(string $account_type): static
    {
        $this->account_type = strtoupper($account_type);

        return $this;
    }

    public function getCompanyName(): ?string
    {
        return $this->company_name;
    }

    public function setCompanyName(string $company_name): static
    {
        $this->company_name = $company_name;

        return $this;
    }

    public function getCompanyMarket(): ?string
    {
        return $this->company_market;
    }

    public function setCompanyMarket(string $company_market): static
    {
        $this->company_market = $company_market;

        return $this;
    }

    public function getCompanyCountry(): ?string
    {
        return $this->company_country;
    }

    public function setCompanyCountry(string $company_country): static
    {
        $this->company_country = strtoupper($company_country);

        return $this;
    }

    public function getCompanyWebsite(): ?string
    {
        return $this->company_website;
    }

    public function setCompanyWebsite(string $company_website): static
    {
        $this->company_website = $company_website;

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

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->created_at;
    }

    public function setCreatedAt(\DateTimeImmutable $created_at): static
    {
        $this->created_at = $created_at;

        return $this;
    }
}
