<?php

namespace App\Entity;

use App\Repository\ScrapingLogRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ScrapingLogRepository::class)]
#[ORM\Table(name: 'scraping_log')]
class ScrapingLog
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 120)]
    private ?string $source_name = null;

    #[ORM\Column(length: 120)]
    private ?string $workflow_name = null;

    #[ORM\Column(length: 20)]
    private string $status = 'SUCCESS';

    #[ORM\Column(nullable: true)]
    private ?int $duration_ms = null;

    #[ORM\Column(nullable: true)]
    private ?int $records_processed = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $error_message = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $executed_at = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getSourceName(): ?string
    {
        return $this->source_name;
    }

    public function setSourceName(string $source_name): static
    {
        $this->source_name = trim($source_name);

        return $this;
    }

    public function getWorkflowName(): ?string
    {
        return $this->workflow_name;
    }

    public function setWorkflowName(string $workflow_name): static
    {
        $this->workflow_name = trim($workflow_name);

        return $this;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function setStatus(string $status): static
    {
        $this->status = strtoupper(trim($status));

        return $this;
    }

    public function getDurationMs(): ?int
    {
        return $this->duration_ms;
    }

    public function setDurationMs(?int $duration_ms): static
    {
        $this->duration_ms = $duration_ms;

        return $this;
    }

    public function getRecordsProcessed(): ?int
    {
        return $this->records_processed;
    }

    public function setRecordsProcessed(?int $records_processed): static
    {
        $this->records_processed = $records_processed;

        return $this;
    }

    public function getErrorMessage(): ?string
    {
        return $this->error_message;
    }

    public function setErrorMessage(?string $error_message): static
    {
        $this->error_message = $error_message;

        return $this;
    }

    public function getExecutedAt(): ?\DateTimeImmutable
    {
        return $this->executed_at;
    }

    public function setExecutedAt(\DateTimeImmutable $executed_at): static
    {
        $this->executed_at = $executed_at;

        return $this;
    }
}
