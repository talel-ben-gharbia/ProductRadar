<?php

namespace App\Entity;

use App\Repository\B2BRequestRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: B2BRequestRepository::class)]
#[ORM\Table(name: 'b2b_ads_request', indexes: [
    new ORM\Index(name: 'idx_b2b_ads_request_owner_type', columns: ['owner_type']),
    new ORM\Index(name: 'idx_b2b_ads_request_status', columns: ['status']),
])]
class B2BRequest
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 20)]
    private ?string $owner_type = null;

    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    private ?int $company_id = null;

    #[ORM\ManyToOne(targetEntity: B2BMarket::class)]
    #[ORM\JoinColumn(name: 'market_id', referencedColumnName: 'id', nullable: true, onDelete: 'CASCADE')]
    private ?B2BMarket $market = null;

    #[ORM\Column(length: 20)]
    private ?string $request_type = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $image_url = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $link_url = null;

    #[ORM\Column(type: Types::BLOB, nullable: true)]
    private mixed $image_data = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $image_mime_type = null;

    #[ORM\Column(length: 20)]
    private ?string $status = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $created_at = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $updated_at = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getOwnerType(): ?string
    {
        return $this->owner_type;
    }

    public function setOwnerType(string $ownerType): static
    {
        $this->owner_type = strtoupper($ownerType);

        return $this;
    }

    public function getCompanyId(): ?int
    {
        return $this->company_id;
    }

    public function setCompanyId(?int $companyId): static
    {
        $this->company_id = $companyId;

        return $this;
    }

    public function getMarket(): ?B2BMarket
    {
        return $this->market;
    }

    public function setMarket(?B2BMarket $market): static
    {
        $this->market = $market;

        return $this;
    }

    public function getRequestType(): ?string
    {
        return $this->request_type;
    }

    public function setRequestType(string $requestType): static
    {
        $this->request_type = strtoupper($requestType);

        return $this;
    }

    public function getImageUrl(): ?string
    {
        return $this->image_url;
    }

    public function setImageUrl(?string $imageUrl): static
    {
        $this->image_url = $imageUrl;

        return $this;
    }

    public function getLinkUrl(): ?string
    {
        return $this->link_url;
    }

    public function setLinkUrl(?string $linkUrl): static
    {
        $this->link_url = $linkUrl;

        return $this;
    }

    public function getImageData(): mixed
    {
        return $this->image_data;
    }

    public function setImageData(mixed $imageData): static
    {
        if (is_resource($imageData)) {
            $imageData = stream_get_contents($imageData);
        }
        $this->image_data = $imageData;

        return $this;
    }

    public function getImageMimeType(): ?string
    {
        return $this->image_mime_type;
    }

    public function setImageMimeType(?string $imageMimeType): static
    {
        $this->image_mime_type = $imageMimeType;

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

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->created_at;
    }

    public function setCreatedAt(?\DateTimeImmutable $createdAt): static
    {
        $this->created_at = $createdAt;

        return $this;
    }

    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updated_at;
    }

    public function setUpdatedAt(?\DateTimeImmutable $updatedAt): static
    {
        $this->updated_at = $updatedAt;

        return $this;
    }
}
