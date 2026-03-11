<?php

namespace App\Entity;

use App\Repository\SellerRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: SellerRepository::class)]
class Seller
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $name = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $url = null;

    /**
     * @var Collection<int, ProductListing>
     */
    #[ORM\OneToMany(targetEntity: ProductListing::class, mappedBy: 'seller')]
    private Collection $productlisting;

    public function __construct()
    {
        $this->productlisting = new ArrayCollection();
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

    public function getUrl(): ?string
    {
        return $this->url;
    }

    public function setUrl(string $url): static
    {
        $this->url = $url;

        return $this;
    }

    /**
     * @return Collection<int, ProductListing>
     */
    public function getProductlisting(): Collection
    {
        return $this->productlisting;
    }

    public function addProductlisting(ProductListing $productlisting): static
    {
        if (!$this->productlisting->contains($productlisting)) {
            $this->productlisting->add($productlisting);
            $productlisting->setSeller($this);
        }

        return $this;
    }

    public function removeProductlisting(ProductListing $productlisting): static
    {
        if ($this->productlisting->removeElement($productlisting)) {
            // set the owning side to null (unless already changed)
            if ($productlisting->getSeller() === $this) {
                $productlisting->setSeller(null);
            }
        }

        return $this;
    }
}
