<?php

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: '`user`')]
#[ORM\InheritanceType('JOINED')]
#[ORM\DiscriminatorColumn(name: 'type', type: 'string')]
#[ORM\DiscriminatorMap(['user' => User::class, 'customer' => Customer::class])]
class User
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $email = null;

    #[ORM\Column]
    private ?bool $is_active = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $adress = null;

    /**
     * @var Collection<int, Alert>
     */
    #[ORM\OneToMany(targetEntity: Alert::class, mappedBy: 'alerter', orphanRemoval: true)]
    private Collection $alert;

    #[ORM\Column(length: 255)]
    private ?string $firebase_uid = null;

    public function __construct()
    {
        $this->alert = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(string $email): static
    {
        $this->email = $email;

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

    public function getAdress(): ?string
    {
        return $this->adress;
    }

    public function setAdress(?string $adress): static
    {
        $this->adress = $adress;

        return $this;
    }

    /**
     * @return Collection<int, Alert>
     */
    public function getAlert(): Collection
    {
        return $this->alert;
    }

    public function addAlert(Alert $alert): static
    {
        if (!$this->alert->contains($alert)) {
            $this->alert->add($alert);
            $alert->setAlerter($this);
        }

        return $this;
    }

    public function removeAlert(Alert $alert): static
    {
        if ($this->alert->removeElement($alert)) {
            // set the owning side to null (unless already changed)
            if ($alert->getAlerter() === $this) {
                $alert->setAlerter(null);
            }
        }

        return $this;
    }

    public function getFirebaseUid(): ?string
    {
        return $this->firebase_uid;
    }

    public function setFirebaseUid(string $firebase_uid): static
    {
        $this->firebase_uid = $firebase_uid;

        return $this;
    }

}
