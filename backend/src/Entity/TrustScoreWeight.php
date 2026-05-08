<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'trust_score_weight')]
class TrustScoreWeight
{
    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'SEQUENCE')]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 50, unique: true)]
    private ?string $weight_key = null;

    #[ORM\Column(length: 100)]
    private ?string $weight_label = null;

    #[ORM\Column(type: 'decimal', precision: 5, scale: 4)]
    private ?string $weight_value = null;

    #[ORM\Column(length: 20)]
    private ?string $weight_group = null;

    #[ORM\Column]
    private ?int $sort_order = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getWeightKey(): ?string
    {
        return $this->weight_key;
    }

    public function setWeightKey(string $weight_key): static
    {
        $this->weight_key = $weight_key;

        return $this;
    }

    public function getWeightLabel(): ?string
    {
        return $this->weight_label;
    }

    public function setWeightLabel(string $weight_label): static
    {
        $this->weight_label = $weight_label;

        return $this;
    }

    public function getWeightValue(): ?float
    {
        return $this->weight_value !== null ? (float) $this->weight_value : null;
    }

    public function setWeightValue(float $weight_value): static
    {
        $this->weight_value = (string) $weight_value;

        return $this;
    }

    public function getWeightGroup(): ?string
    {
        return $this->weight_group;
    }

    public function setWeightGroup(string $weight_group): static
    {
        $this->weight_group = $weight_group;

        return $this;
    }

    public function getSortOrder(): ?int
    {
        return $this->sort_order;
    }

    public function setSortOrder(int $sort_order): static
    {
        $this->sort_order = $sort_order;

        return $this;
    }
}
