<?php

namespace App\Entity;

use App\Repository\SubscriptionRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: \App\Repository\SubscriptionRepository::class)]
#[ORM\Table(name: 'subscription_b2c')]
class SubscriptionB2C
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $plan_type = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $start_date = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $end_date = null;

    #[ORM\Column]
    private ?bool $active = null;

    #[ORM\Column]
    private ?int $alerts_limit = null;

    #[ORM\Column]
    private ?int $favorites_limit = null;

    #[ORM\Column]
    private ?int $price_history_access = null;

    #[ORM\OneToOne(inversedBy: 'subscription', cascade: ['persist', 'remove'])]
    private ?User $client = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getPlanType(): ?string
    {
        return $this->plan_type;
    }

    public function setPlanType(string $plan_type): static
    {
        $this->plan_type = $plan_type;

        return $this;
    }

    public function getStartDate(): ?\DateTimeImmutable
    {
        return $this->start_date;
    }

    public function setStartDate(\DateTimeImmutable $start_date): static
    {
        $this->start_date = $start_date;

        return $this;
    }

    public function getEndDate(): ?\DateTimeImmutable
    {
        return $this->end_date;
    }

    public function setEndDate(\DateTimeImmutable $end_date): static
    {
        $this->end_date = $end_date;

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

    public function getAlertsLimit(): ?int
    {
        return $this->alerts_limit;
    }

    public function setAlertsLimit(int $alerts_limit): static
    {
        $this->alerts_limit = $alerts_limit;

        return $this;
    }

    public function getFavoritesLimit(): ?int
    {
        return $this->favorites_limit;
    }

    public function setFavoritesLimit(int $favorites_limit): static
    {
        $this->favorites_limit = $favorites_limit;

        return $this;
    }

    public function getPriceHistoryAccess(): ?int
    {
        return $this->price_history_access;
    }

    public function setPriceHistoryAccess(int $price_history_access): static
    {
        $this->price_history_access = $price_history_access;

        return $this;
    }

    public function getClient(): ?User
    {
        return $this->client;
    }

    public function setClient(?User $client): static
    {
        $this->client = $client;

        return $this;
    }
}
