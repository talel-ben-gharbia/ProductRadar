<?php

namespace App\Entity;

use App\Repository\B2BReportRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: B2BReportRepository::class)]
#[ORM\Table(name: 'b2b_report', indexes: [
    new ORM\Index(name: 'idx_b2b_report_owner_type', columns: ['owner_type']),
    new ORM\Index(name: 'idx_b2b_report_status', columns: ['status']),
])]
class B2BReport
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

    #[ORM\Column(length: 50)]
    private ?string $report_type = null;

    #[ORM\Column(length: 20)]
    private ?string $status = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $file_path = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $period_start = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $period_end = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $generated_at = null;

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

    public function getReportType(): ?string
    {
        return $this->report_type;
    }

    public function setReportType(string $reportType): static
    {
        $this->report_type = strtoupper($reportType);

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

    public function getFilePath(): ?string
    {
        return $this->file_path;
    }

    public function setFilePath(?string $filePath): static
    {
        $this->file_path = $filePath;

        return $this;
    }

    public function getPeriodStart(): ?\DateTimeImmutable
    {
        return $this->period_start;
    }

    public function setPeriodStart(?\DateTimeImmutable $periodStart): static
    {
        $this->period_start = $periodStart;

        return $this;
    }

    public function getPeriodEnd(): ?\DateTimeImmutable
    {
        return $this->period_end;
    }

    public function setPeriodEnd(?\DateTimeImmutable $periodEnd): static
    {
        $this->period_end = $periodEnd;

        return $this;
    }

    public function getGeneratedAt(): ?\DateTimeImmutable
    {
        return $this->generated_at;
    }

    public function setGeneratedAt(?\DateTimeImmutable $generatedAt): static
    {
        $this->generated_at = $generatedAt;

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
