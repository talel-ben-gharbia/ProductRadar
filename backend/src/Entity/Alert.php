<?php

namespace App\Entity;

use App\Repository\AlertRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: AlertRepository::class)]
class Alert
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(nullable: true)]
    private ?bool $is_price_notif = null;

    #[ORM\Column(nullable: true)]
    private ?bool $is_stock_notif = null;

    #[ORM\Column(options: ['default' => false])]
    private bool $cancelled = false;

    #[ORM\ManyToOne(inversedBy: 'alerts')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Product $product = null;

    #[ORM\ManyToOne(inversedBy: 'alert')]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $alerter = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function isPriceNotif(): ?bool
    {
        return $this->is_price_notif;
    }

    public function setIsPriceNotif(?bool $is_price_notif): static
    {
        $this->is_price_notif = $is_price_notif;

        return $this;
    }

    public function isStockNotif(): ?bool
    {
        return $this->is_stock_notif;
    }

    public function setIsStockNotif(?bool $is_stock_notif): static
    {
        $this->is_stock_notif = $is_stock_notif;

        return $this;
    }

    public function getProduct(): ?Product
    {
        return $this->product;
    }

    public function setProduct(?Product $product): static
    {
        $this->product = $product;

        return $this;
    }

    public function getAlerter(): ?User
    {
        return $this->alerter;
    }

    public function setAlerter(?User $alerter): static
    {
        $this->alerter = $alerter;

        return $this;
    }

    public function isCancelled(): bool
    {
        return $this->cancelled;
    }

    public function setCancelled(bool $cancelled): static
    {
        $this->cancelled = $cancelled;

        return $this;
    }
}
