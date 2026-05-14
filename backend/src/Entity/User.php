<?php

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: '`user`', indexes: [
    new ORM\Index(name: 'idx_user_account_status', columns: ['account_status']),
])]
#[ORM\InheritanceType('JOINED')]
#[ORM\DiscriminatorColumn(name: 'type', type: 'string')]
#[ORM\DiscriminatorMap([
    'user' => User::class,
    'customer' => Customer::class,
    'b2b_company' => B2BCompany::class,
    'b2b_market' => B2BMarket::class,
])]
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
    private ?string $address = null;

    /**
     * @var Collection<int, Alert>
     */
    #[ORM\OneToMany(targetEntity: Alert::class, mappedBy: 'alerter', orphanRemoval: true)]
    private Collection $alert;

    #[ORM\Column(length: 255)]
    private ?string $firebase_uid = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $last_login = null;

    #[ORM\Column(length: 50, options: ['default' => 'ACTIVE'])]
    private ?string $account_status = 'ACTIVE';

    /**
     * @var Collection<int, Favorite>
     */
    #[ORM\OneToMany(targetEntity: Favorite::class, mappedBy: 'client', orphanRemoval: true)]
    private Collection $favorite;

    private ?Subscription $subscription = null;

    /**
     * @var Collection<int, Notification>
     */
    #[ORM\OneToMany(targetEntity: Notification::class, mappedBy: 'client')]
    private Collection $notifications;

    public function __construct()
    {
        $this->alert = new ArrayCollection();
        $this->favorite = new ArrayCollection();
        $this->notifications = new ArrayCollection();
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

    public function getAddress(): ?string
    {
        return $this->address;
    }

    public function setAddress(?string $address): static
    {
        $this->address = $address;

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

    public function getLastLogin(): ?\DateTimeImmutable
    {
        return $this->last_login;
    }

    public function setLastLogin(?\DateTimeImmutable $last_login): static
    {
        $this->last_login = $last_login;

        return $this;
    }

    public function getAccountStatus(): ?string
    {
        return $this->account_status;
    }

    public function setAccountStatus(string $account_status): static
    {
        $this->account_status = strtoupper($account_status);

        return $this;
    }

    /**
     * @return Collection<int, Favorite>
     */
    public function getFavorite(): Collection
    {
        return $this->favorite;
    }

    public function addFavorite(Favorite $favorite): static
    {
        if (!$this->favorite->contains($favorite)) {
            $this->favorite->add($favorite);
            $favorite->setClient($this);
        }

        return $this;
    }

    public function removeFavorite(Favorite $favorite): static
    {
        if ($this->favorite->removeElement($favorite)) {
            // set the owning side to null (unless already changed)
            if ($favorite->getClient() === $this) {
                $favorite->setClient(null);
            }
        }

        return $this;
    }

    public function getSubscription(): ?Subscription
    {
        return $this->subscription;
    }

    public function setSubscription(?Subscription $subscription): static
    {
        $this->subscription = $subscription;

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
            $notification->setClient($this);
        }

        return $this;
    }

    public function removeNotification(Notification $notification): static
    {
        if ($this->notifications->removeElement($notification)) {
            // set the owning side to null (unless already changed)
            if ($notification->getClient() === $this) {
                $notification->setClient(null);
            }
        }

        return $this;
    }

}
