<?php

namespace App\Entity;

use App\Repository\B2BSponsoredArticleRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: B2BSponsoredArticleRepository::class)]
#[ORM\Table(name: 'b2b_sponsored_article', indexes: [
    new ORM\Index(name: 'idx_b2b_sponsored_article_status', columns: ['status']),
    new ORM\Index(name: 'idx_b2b_sponsored_article_listing', columns: ['product_listing_id']),
    new ORM\Index(name: 'idx_b2b_sponsored_article_company', columns: ['company_id']),
])]
class B2BSponsoredArticle
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: B2BAdsRequest::class)]
    #[ORM\JoinColumn(name: 'ads_request_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?B2BAdsRequest $adsRequest = null;

    #[ORM\ManyToOne(targetEntity: ProductListing::class)]
    #[ORM\JoinColumn(name: 'product_listing_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?ProductListing $productListing = null;

    #[ORM\ManyToOne(targetEntity: B2BCompany::class)]
    #[ORM\JoinColumn(name: 'company_id', referencedColumnName: 'id', nullable: true, onDelete: 'CASCADE')]
    private ?B2BCompany $company = null;

    #[ORM\Column(length: 255)]
    private ?string $title = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $content = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $url = null;

    #[ORM\Column(length: 20)]
    private ?string $status = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $published_at = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $ends_at = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $created_at = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getAdsRequest(): ?B2BAdsRequest
    {
        return $this->adsRequest;
    }

    public function setAdsRequest(?B2BAdsRequest $adsRequest): static
    {
        $this->adsRequest = $adsRequest;

        return $this;
    }

    public function getProductListing(): ?ProductListing
    {
        return $this->productListing;
    }

    public function setProductListing(?ProductListing $productListing): static
    {
        $this->productListing = $productListing;

        return $this;
    }

    public function getCompany(): ?B2BCompany
    {
        return $this->company;
    }

    public function setCompany(?B2BCompany $company): static
    {
        $this->company = $company;

        return $this;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;

        return $this;
    }

    public function getContent(): ?string
    {
        return $this->content;
    }

    public function setContent(?string $content): static
    {
        $this->content = $content;

        return $this;
    }

    public function getUrl(): ?string
    {
        return $this->url;
    }

    public function setUrl(?string $url): static
    {
        $this->url = $url;

        return $this;
    }

    public function getStatus(): ?string
    {
        return $this->status;
    }

    public function setStatus(string $status): static
    {
        $this->status = strtoupper($status);

        return $this;
    }

    public function getPublishedAt(): ?\DateTimeImmutable
    {
        return $this->published_at;
    }

    public function setPublishedAt(?\DateTimeImmutable $publishedAt): static
    {
        $this->published_at = $publishedAt;

        return $this;
    }

    public function getEndsAt(): ?\DateTimeImmutable
    {
        return $this->ends_at;
    }

    public function setEndsAt(?\DateTimeImmutable $endsAt): static
    {
        $this->ends_at = $endsAt;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->created_at;
    }

    public function setCreatedAt(?\DateTimeImmutable $createdAt): static
    {
        $this->created_at = $createdAt;

        return $this;
    }
}
