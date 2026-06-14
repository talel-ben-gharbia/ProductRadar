<?php

namespace App\Entity;

use App\Repository\AdminRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;

#[ORM\Entity(repositoryClass: AdminRepository::class)]
#[ORM\Table(name: 'admin')]
#[ORM\HasLifecycleCallbacks]
class Admin implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 180, unique: true)]
    private ?string $email = null;

    #[ORM\Column]
    private ?string $password = null;

    #[ORM\Column(length: 50)]
    private string $role = 'ROLE_SUB_ADMIN';

    #[ORM\Column(length: 20)]
    private string $status = 'active';

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $suspended_at = null;

    #[ORM\Column(nullable: true)]
    private ?int $suspended_by = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $banned_at = null;

    #[ORM\Column(nullable: true)]
    private ?int $banned_by = null;

    #[ORM\Column]
    private \DateTimeImmutable $created_at;

    #[ORM\Column]
    private \DateTimeImmutable $updated_at;

    public function __construct()
    {
        $this->created_at = new \DateTimeImmutable();
        $this->updated_at = new \DateTimeImmutable();
    }

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
        $this->email = $email;

        return $this;
    }

    public function getPassword(): ?string
    {
        return $this->password;
    }

    public function setPassword(string $password): static
    {
        $this->password = $password;

        return $this;
    }

    public function getRole(): string
    {
        return $this->role;
    }

    public function setRole(string $role): static
    {
        $this->role = $role;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->created_at;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updated_at;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function setStatus(string $status): static
    {
        $this->status = $status;

        return $this;
    }

    public function getSuspendedAt(): ?\DateTimeImmutable
    {
        return $this->suspended_at;
    }

    public function setSuspendedAt(\DateTimeImmutable $suspended_at): static
    {
        $this->suspended_at = $suspended_at;

        return $this;
    }

    public function getSuspendedBy(): ?int
    {
        return $this->suspended_by;
    }

    public function setSuspendedBy(?int $suspended_by): static
    {
        $this->suspended_by = $suspended_by;

        return $this;
    }

    public function getBannedAt(): ?\DateTimeImmutable
    {
        return $this->banned_at;
    }

    public function setBannedAt(\DateTimeImmutable $banned_at): static
    {
        $this->banned_at = $banned_at;

        return $this;
    }

    public function getBannedBy(): ?int
    {
        return $this->banned_by;
    }

    public function setBannedBy(?int $banned_by): static
    {
        $this->banned_by = $banned_by;

        return $this;
    }

    public function setUpdatedAt(\DateTimeImmutable $updated_at): static
    {
        $this->updated_at = $updated_at;

        return $this;
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updated_at = new \DateTimeImmutable();
    }

    public function getRoles(): array
    {
        return [$this->role];
    }

    public function eraseCredentials(): void
    {
    }

    public function getUserIdentifier(): string
    {
        return (string) $this->email;
    }
}
