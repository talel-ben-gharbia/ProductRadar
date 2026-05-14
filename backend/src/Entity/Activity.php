<?php

namespace App\Entity;

use App\Repository\ActivityRepository;
use Doctrine\ORM\Mapping as ORM;
use Doctrine\ORM\Mapping\JoinColumn;
use Doctrine\ORM\Mapping\ManyToOne;

#[ORM\Entity(repositoryClass: ActivityRepository::class)]
class Activity
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 50)]
    private ?string $actor_type = null;

    #[ORM\Column(nullable: true)]
    private ?int $actor_id = null;

    #[ORM\Column(length: 50)]
    private ?string $verb = null;

    #[ORM\Column(length: 50)]
    private ?string $subject_type = null;

    #[ORM\Column]
    private ?int $subject_id = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $context = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $metadata = null;

    #[ORM\Column(nullable: true)]
    private ?int $admin_id = null;

    #[ManyToOne(targetEntity: Admin::class)]
    #[JoinColumn(name: 'admin_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Admin $admin = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $action = null;

    #[ORM\Column(length: 45, nullable: true)]
    private ?string $ip_address = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $created_at = null;

    public function getId(): ?int { return $this->id; }

    public function getActorType(): ?string { return $this->actor_type; }
    public function setActorType(string $actor_type): static { $this->actor_type = $actor_type; return $this; }

    public function getActorId(): ?int { return $this->actor_id; }
    public function setActorId(?int $actor_id): static { $this->actor_id = $actor_id; return $this; }

    public function getVerb(): ?string { return $this->verb; }
    public function setVerb(string $verb): static { $this->verb = $verb; return $this; }

    public function getSubjectType(): ?string { return $this->subject_type; }
    public function setSubjectType(string $subject_type): static { $this->subject_type = $subject_type; return $this; }

    public function getSubjectId(): ?int { return $this->subject_id; }
    public function setSubjectId(int $subject_id): static { $this->subject_id = $subject_id; return $this; }

    public function getContext(): ?array { return $this->context; }
    public function setContext(?array $context): static { $this->context = $context; return $this; }

    public function getMetadata(): ?array { return $this->metadata; }
    public function setMetadata(?array $metadata): static { $this->metadata = $metadata; return $this; }

    public function getAdminId(): ?int { return $this->admin_id; }
    public function setAdminId(?int $admin_id): static { $this->admin_id = $admin_id; return $this; }

    public function getAdmin(): ?Admin { return $this->admin; }
    public function setAdmin(?Admin $admin): static { $this->admin = $admin; return $this; }

    public function getAction(): ?string { return $this->action; }
    public function setAction(?string $action): static { $this->action = $action !== null ? strtoupper($action) : null; return $this; }

    public function getIpAddress(): ?string { return $this->ip_address; }
    public function setIpAddress(?string $ip_address): static { $this->ip_address = $ip_address; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->created_at; }
    public function setCreatedAt(\DateTimeImmutable $created_at): static { $this->created_at = $created_at; return $this; }
}
