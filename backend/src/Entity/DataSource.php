<?php

namespace App\Entity;

use App\Repository\DataSourceRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: DataSourceRepository::class)]
#[ORM\Table(name: 'data_source')]
class DataSource
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 120)]
    private ?string $name = null;

    #[ORM\Column(length: 255)]
    private ?string $base_url = null;

    #[ORM\Column(length: 50)]
    private string $type = 'SCRAPER';

    #[ORM\Column]
    private bool $is_active = true;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $last_success_at = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $last_error = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $created_at = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $updated_at = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = trim($name);

        return $this;
    }

    public function getBaseUrl(): ?string
    {
        return $this->base_url;
    }

    public function setBaseUrl(string $base_url): static
    {
        $this->base_url = trim($base_url);

        return $this;
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function setType(string $type): static
    {
        $this->type = strtoupper(trim($type));

        return $this;
    }

    public function isActive(): bool
    {
        return $this->is_active;
    }

    public function setIsActive(bool $is_active): static
    {
        $this->is_active = $is_active;

        return $this;
    }

    public function getLastSuccessAt(): ?\DateTimeImmutable
    {
        return $this->last_success_at;
    }

    public function setLastSuccessAt(?\DateTimeImmutable $last_success_at): static
    {
        $this->last_success_at = $last_success_at;

        return $this;
    }

    public function getLastError(): ?string
    {
        return $this->last_error;
    }

    public function setLastError(?string $last_error): static
    {
        $this->last_error = $last_error;

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

    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updated_at;
    }

    public function setUpdatedAt(?\DateTimeImmutable $updated_at): static
    {
        $this->updated_at = $updated_at;

        return $this;
    }
}
