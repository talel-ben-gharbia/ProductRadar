<?php

namespace App\Entity;

use App\Repository\ProductListingRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ProductListingRepository::class)]
class ProductListing
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column]
    private ?float $price = null;

    #[ORM\Column(nullable: true)]
    private ?float $old_price = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $product_url = null;

    #[ORM\Column(nullable: true)]
    private ?bool $availability = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $created_at = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $updated_at = null;

    #[ORM\Column]
    private ?bool $is_active = null;

    #[ORM\ManyToOne(inversedBy: 'productListings')]
    private ?Product $product = null;

    #[ORM\ManyToOne(inversedBy: 'productlisting')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Seller $seller = null;

    #[ORM\Column(length: 255)]
    private ?string $ref = null;

    /**
     * @var Collection<int, PriceHistory>
     */
    #[ORM\OneToMany(targetEntity: PriceHistory::class, mappedBy: 'productListing', cascade: ['remove'], orphanRemoval: true)]
    private Collection $priceHistories;

    /**
     * @var Collection<int, Favorite>
     */
    #[ORM\OneToMany(targetEntity: Favorite::class, mappedBy: 'product_listing', orphanRemoval: true)]
    private Collection $favorites;

    /**
     * @var Collection<int, Notification>
     */
    #[ORM\OneToMany(targetEntity: Notification::class, mappedBy: 'product_listing')]
    private Collection $notifications;

    private ?float $currentTrustScore = null;

    private ?array $currentTrustScoreBreakdown = null;

    private ?\DateTimeImmutable $currentTrustScoreUpdatedAt = null;

    public function __construct()
    {
        $this->priceHistories = new ArrayCollection();
        $this->favorites = new ArrayCollection();
        $this->notifications = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getPrice(): ?float
    {
        return $this->price;
    }

    public function setPrice(float $price): static
    {
        $this->price = $price;

        return $this;
    }

    public function getOldPrice(): ?float
    {
        return $this->old_price;
    }

    public function setOldPrice(?float $old_price): static
    {
        $this->old_price = $old_price;

        return $this;
    }

    public function getProductUrl(): ?string
    {
        return $this->product_url;
    }

    public function setProductUrl(string $product_url): static
    {
        $this->product_url = $product_url;

        return $this;
    }

    public function isAvailability(): ?bool
    {
        return $this->availability;
    }

    public function setAvailability(?bool $availability): static
    {
        $this->availability = $availability;

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

    public function isActive(): ?bool
    {
        return $this->is_active;
    }

    public function setIsActive(bool $is_active): static
    {
        $this->is_active = $is_active;

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

    public function getSeller(): ?Seller
    {
        return $this->seller;
    }

    public function setSeller(?Seller $seller): static
    {
        $this->seller = $seller;

        return $this;
    }

    public function getRef(): ?string
    {
        return $this->ref;
    }

    public function setRef(string $ref): static
    {
        $this->ref = $ref;

        return $this;
    }

    /**
     * @return Collection<int, PriceHistory>
     */
    public function getPriceHistories(): Collection
    {
        return $this->priceHistories;
    }

    public function addPriceHistory(PriceHistory $priceHistory): static
    {
        if (!$this->priceHistories->contains($priceHistory)) {
            $this->priceHistories->add($priceHistory);
            $priceHistory->setProductListing($this);
        }

        return $this;
    }

    public function removePriceHistory(PriceHistory $priceHistory): static
    {
        if ($this->priceHistories->removeElement($priceHistory)) {
            // set the owning side to null (unless already changed)
            if ($priceHistory->getProductListing() === $this) {
                $priceHistory->setProductListing(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Favorite>
     */
    public function getFavorites(): Collection
    {
        return $this->favorites;
    }

    public function addFavorite(Favorite $favorite): static
    {
        if (!$this->favorites->contains($favorite)) {
            $this->favorites->add($favorite);
            $favorite->setProductListing($this);
        }

        return $this;
    }

    public function removeFavorite(Favorite $favorite): static
    {
        if ($this->favorites->removeElement($favorite)) {
            // set the owning side to null (unless already changed)
            if ($favorite->getProductListing() === $this) {
                $favorite->setProductListing(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Notification>
     */
    public function getNotifications(): Collection
    {
        return $this->notifications;
    }

    public function addNotification(Notification $notification): static
    {
        if (!$this->notifications->contains($notification)) {
            $this->notifications->add($notification);
            $notification->setProductListing($this);
        }

        return $this;
    }

    public function removeNotification(Notification $notification): static
    {
        if ($this->notifications->removeElement($notification)) {
            // set the owning side to null (unless already changed)
            if ($notification->getProductListing() === $this) {
                $notification->setProductListing(null);
            }
        }

        return $this;
    }

    /**
     * Get count of price changes in the last 90 days.
     * Used by TrustScoreExplainer to measure price stability.
     */
    public function getPriceHistoryCount(): int
    {
        $ninetyDaysAgo = new \DateTimeImmutable('-90 days');
        
        return $this->priceHistories
            ->filter(fn(PriceHistory $ph) => $ph->getRecordedAt() >= $ninetyDaysAgo)
            ->count();
    }

    /**
     * Get seller trust rating (0-5 stars).
     * For now returns a calculated average. Can be extended to store seller ratings.
     * Used by TrustScoreExplainer to measure seller reliability.
     */
    public function getTrustScore(): ?float
    {
        return $this->currentTrustScore;
    }

    public function setTrustScore(?float $trustScore): static
    {
        $this->currentTrustScore = $trustScore;
        return $this;
    }

    public function getTrustScoreBreakdown(): ?array
    {
        return $this->currentTrustScoreBreakdown;
    }

    public function setTrustScoreBreakdown(?array $breakdown): static
    {
        $this->currentTrustScoreBreakdown = $breakdown;
        return $this;
    }

    public function getTrustScoreUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->currentTrustScoreUpdatedAt;
    }

    public function setTrustScoreUpdatedAt(?\DateTimeImmutable $updatedAt): static
    {
        $this->currentTrustScoreUpdatedAt = $updatedAt;
        return $this;
    }

    public function getSellerTrust(): ?float
    {
        if ($this->currentTrustScore !== null) {
            return round(max(0.0, min(5.0, $this->currentTrustScore / 20)), 1);
        }

        if (!$this->seller) {
            return 3.5;
        }

        return 3.5;
    }

    /**
     * Check if product is currently in stock.
     * Uses the availability flag from latest observation.
     * Used by TrustScoreExplainer to measure stock consistency.
     */
    public function getIsInStock(): bool
    {
        return $this->availability ?? false;
    }

    /**
     * Get total count of stock observations (price history records).
     * Used by TrustScoreExplainer to measure observation depth.
     */
    public function getStockObservationCount(): int
    {
        return $this->priceHistories->count();
    }

    /**
     * Calculate percentage of time product was in stock based on observations.
     * Returns value between 0 and 1 (0% to 100%).
     * Used by TrustScoreExplainer to measure stock reliability.
     */
    public function getInStockPercentage(): float
    {
        $total = $this->priceHistories->count();
        
        if ($total === 0) {
            // No history: assume current availability
            return $this->availability ? 1.0 : 0.5;
        }
        
        $inStock = $this->priceHistories
            ->filter(fn(PriceHistory $ph) => !$ph->isOutOfStock())
            ->count();
        
        return $inStock / $total;
    }

    /**
     * Get the product's category via the product relation.
     * Used by CompetitorDetectionEngine to filter by category.
     */
    public function getCategory(): ?Category
    {
        return $this->product?->getCategory();
    }
}
