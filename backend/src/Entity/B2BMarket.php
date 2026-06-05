<?php

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'b2b_market')]
class B2BMarket extends B2B
{
    #[ORM\ManyToOne(targetEntity: Brand::class)]
    #[ORM\JoinColumn(name: 'brand_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Brand $brandEntity = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $brand_name = null;

    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $brand_keywords = null;

    public function getBrandEntity(): ?Brand
    {
        return $this->brandEntity;
    }

    public function setBrandEntity(?Brand $brandEntity): static
    {
        $this->brandEntity = $brandEntity;

        return $this;
    }

    public function getBrandName(): ?string
    {
        return $this->brand_name;
    }

    public function setBrandName(?string $brand_name): static
    {
        $this->brand_name = $brand_name;

        return $this;
    }

    public function getBrandKeywords(): ?array
    {
        return $this->brand_keywords;
    }

    public function setBrandKeywords(?array $brand_keywords): static
    {
        $this->brand_keywords = $brand_keywords;

        return $this;
    }
}
