<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'trust_score_history')]
#[ORM\Index(name: 'idx_tsh_listing', columns: ['listing_id'])]
#[ORM\Index(name: 'idx_tsh_created', columns: ['created_at'])]
class TrustScoreHistory
{
    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'SEQUENCE')]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?ProductListing $listing = null;

    #[ORM\Column(type: 'float')]
    private ?float $score = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $breakdown = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $created_at = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getListing(): ?ProductListing
    {
        return $this->listing;
    }

    public function setListing(?ProductListing $listing): static
    {
        $this->listing = $listing;

        return $this;
    }

    public function getScore(): ?float
    {
        return $this->score;
    }

    public function setScore(float $score): static
    {
        $this->score = $score;

        return $this;
    }

    public function getBreakdown(): ?array
    {
        return $this->breakdown;
    }

    public function setBreakdown(?array $breakdown): static
    {
        $this->breakdown = $breakdown;

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
}
