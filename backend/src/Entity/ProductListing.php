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

    #[ORM\Column(nullable: true)]
    private ?float $trust_score = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $created_at = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $updatet_at = null;

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
    #[ORM\OneToMany(targetEntity: PriceHistory::class, mappedBy: 'productListing')]
    private Collection $priceHistories;

    public function __construct()
    {
        $this->priceHistories = new ArrayCollection();
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

    public function getTrustScore(): ?float
    {
        return $this->trust_score;
    }

    public function setTrustScore(?float $trust_score): static
    {
        $this->trust_score = $trust_score;

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

    public function getUpdatetAt(): ?\DateTimeImmutable
    {
        return $this->updatet_at;
    }

    public function setUpdatetAt(?\DateTimeImmutable $updatet_at): static
    {
        $this->updatet_at = $updatet_at;

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
}
