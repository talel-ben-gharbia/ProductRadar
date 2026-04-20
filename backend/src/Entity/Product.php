<?php

namespace App\Entity;

use App\Repository\ProductRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ProductRepository::class)]
class Product
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $name = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $brand = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $description = null;

    #[ORM\Column(nullable: true)]
    private ?array $specs_json = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $image_url = null;

    #[ORM\ManyToOne(inversedBy: 'products')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Category $category = null;

    /**
     * @var Collection<int, ProductListing>
     */
    #[ORM\OneToMany(targetEntity: ProductListing::class, mappedBy: 'product', cascade: ['remove'], orphanRemoval: true)]
    private Collection $productListings;

    /**
     * @var Collection<int, Alert>
     */
    #[ORM\OneToMany(targetEntity: Alert::class, mappedBy: 'product', orphanRemoval: true)]
    private Collection $alerts;

    public function __construct()
    {
        $this->productListings = new ArrayCollection();
        $this->alerts = new ArrayCollection();
    }

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
        $this->name = $name;

        return $this;
    }

    public function getBrand(): ?string
    {
        return $this->brand;
    }

    public function setBrand(?string $brand): static
    {
        $this->brand = $brand;

        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(string $description): static
    {
        $this->description = $description;

        return $this;
    }

    public function getSpecsJson(): ?array
    {
        return $this->specs_json;
    }

    public function setSpecsJson(?array $specs_json): static
    {
        $this->specs_json = $specs_json;

        return $this;
    }

    public function getImageUrl(): ?string
    {
        return $this->image_url;
    }

    public function setImageUrl(?string $image_url): static
    {
        $this->image_url = $image_url;

        return $this;
    }

    public function getCategory(): ?Category
    {
        return $this->category;
    }

    public function setCategory(?Category $category): static
    {
        $this->category = $category;

        return $this;
    }

    /**
     * @return Collection<int, ProductListing>
     */
    public function getProductListings(): Collection
    {
        return $this->productListings;
    }

    public function addProductListing(ProductListing $productListing): static
    {
        if (!$this->productListings->contains($productListing)) {
            $this->productListings->add($productListing);
            $productListing->setProduct($this);
        }

        return $this;
    }

    public function removeProductListing(ProductListing $productListing): static
    {
        if ($this->productListings->removeElement($productListing)) {
            // Keep inverse side in sync for in-memory state.
            if ($productListing->getProduct() === $this) {
                $productListing->setProduct(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Alert>
     */
    public function getAlerts(): Collection
    {
        return $this->alerts;
    }

    public function addAlert(Alert $alert): static
    {
        if (!$this->alerts->contains($alert)) {
            $this->alerts->add($alert);
            $alert->setProduct($this);
        }

        return $this;
    }

    public function removeAlert(Alert $alert): static
    {
        if ($this->alerts->removeElement($alert)) {
            // set the owning side to null (unless already changed)
            if ($alert->getProduct() === $this) {
                $alert->setProduct(null);
            }
        }

        return $this;
    }
}
