<?php

namespace App\Entity;

use App\Repository\SubscriptionRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: SubscriptionRepository::class)]
#[ORM\Table(name: 'subscription')]
#[ORM\Index(name: 'idx_subscription_owner', columns: ['owner_type', 'owner_id'])]
#[ORM\Index(name: 'idx_subscription_active', columns: ['active'])]
class Subscription
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 20)]
    private ?string $owner_type = null;

    #[ORM\Column]
    private ?int $owner_id = null;

    #[ORM\Column(length: 20)]
    private ?string $plan_type = null;

    #[ORM\Column]
    private ?bool $active = true;

    #[ORM\Column]
    private ?\DateTimeImmutable $start_date = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $end_date = null;

    #[ORM\Column(nullable: true)]
    private ?int $duration_months = null;

    #[ORM\Column(nullable: true)]
    private ?int $alerts_limit = null;

    #[ORM\Column(nullable: true)]
    private ?int $favorites_limit = null;

    #[ORM\Column(nullable: true)]
    private ?int $price_history_access = null;

    #[ORM\Column(nullable: true)]
    private ?int $activated_by_admin_id = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $activated_at = null;

    #[ORM\Column]
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

    public function getOwnerId(): ?int
    {
        return $this->owner_id;
    }

    public function setOwnerId(int $ownerId): static
    {
        $this->owner_id = $ownerId;

        return $this;
    }

    public function getPlanType(): ?string
    {
        return $this->plan_type;
    }

    public function setPlanType(string $planType): static
    {
        $this->plan_type = strtoupper($planType);

        return $this;
    }

    public function isActive(): ?bool
    {
        return $this->active;
    }

    public function setActive(bool $active): static
    {
        $this->active = $active;

        return $this;
    }

    public function getStartDate(): ?\DateTimeImmutable
    {
        return $this->start_date;
    }

    public function setStartDate(\DateTimeImmutable $startDate): static
    {
        $this->start_date = $startDate;

        return $this;
    }

    public function getEndDate(): ?\DateTimeImmutable
    {
        return $this->end_date;
    }

    public function setEndDate(?\DateTimeImmutable $endDate): static
    {
        $this->end_date = $endDate;

        return $this;
    }

    public function getDurationMonths(): ?int
    {
        return $this->duration_months;
    }

    public function setDurationMonths(?int $durationMonths): static
    {
        $this->duration_months = $durationMonths;

        return $this;
    }

    public function getAlertsLimit(): ?int
    {
        return $this->alerts_limit;
    }

    public function setAlertsLimit(?int $alertsLimit): static
    {
        $this->alerts_limit = $alertsLimit;

        return $this;
    }

    public function getFavoritesLimit(): ?int
    {
        return $this->favorites_limit;
    }

    public function setFavoritesLimit(?int $favoritesLimit): static
    {
        $this->favorites_limit = $favoritesLimit;

        return $this;
    }

    public function getPriceHistoryAccess(): ?int
    {
        return $this->price_history_access;
    }

    public function setPriceHistoryAccess(?int $priceHistoryAccess): static
    {
        $this->price_history_access = $priceHistoryAccess;

        return $this;
    }

    public function getActivatedByAdminId(): ?int
    {
        return $this->activated_by_admin_id;
    }

    public function setActivatedByAdminId(?int $activatedByAdminId): static
    {
        $this->activated_by_admin_id = $activatedByAdminId;

        return $this;
    }

    public function getActivatedAt(): ?\DateTimeImmutable
    {
        return $this->activated_at;
    }

    public function setActivatedAt(?\DateTimeImmutable $activatedAt): static
    {
        $this->activated_at = $activatedAt;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->created_at;
    }

    public function setCreatedAt(\DateTimeImmutable $createdAt): static
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
