<?php

namespace App\Controller;

use App\Entity\B2BCompany;
use App\Entity\B2BMarket;
use App\Entity\Customer;
use App\Entity\SubscriptionB2C;
use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\SubscriptionLifecycleService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class B2CAuthController extends AbstractController
{
    private const ACCOUNT_TYPE_B2C = 'B2C';
    private const ACCOUNT_TYPE_B2B_COMPANY = 'B2B_COMPANY';
    private const ACCOUNT_TYPE_B2B_MARKET = 'B2B_MARKET';

    #[Route('/api/b2c/auth/firebase', name: 'b2c_auth_firebase', methods: ['POST'])]
    public function firebaseAuth(
        Request $request,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
        SubscriptionLifecycleService $subscriptionLifecycleService,
    ): JsonResponse {
        $body = json_decode($request->getContent(), true);

        if (!is_array($body)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        $email = trim((string) ($body['email'] ?? ''));
        $firebaseUid = trim((string) ($body['firebaseUid'] ?? ''));
        $fullNameRaw = $body['fullName'] ?? null;
        $fullName = is_string($fullNameRaw) ? trim($fullNameRaw) : null;
        $fullName = $fullName === '' ? null : $fullName;
        $accountTypeRaw = strtoupper(trim((string) ($body['accountType'] ?? self::ACCOUNT_TYPE_B2C)));
        $accountType = in_array($accountTypeRaw, [
            self::ACCOUNT_TYPE_B2C,
            self::ACCOUNT_TYPE_B2B_COMPANY,
            self::ACCOUNT_TYPE_B2B_MARKET,
        ], true) ? $accountTypeRaw : self::ACCOUNT_TYPE_B2C;

        $companyName = $this->normalizeOptionalText($body['companyName'] ?? null);
        $companyMarket = $this->normalizeOptionalText($body['companyMarket'] ?? null);
        $companyCountry = $this->normalizeOptionalText($body['companyCountry'] ?? null);
        $companyWebsite = $this->normalizeOptionalText($body['companyWebsite'] ?? null);

        $isB2B = in_array($accountType, [self::ACCOUNT_TYPE_B2B_COMPANY, self::ACCOUNT_TYPE_B2B_MARKET], true);

        if ($isB2B && ($companyName === null || $companyMarket === null || $companyCountry === null || $companyWebsite === null)) {
            return $this->json([
                'error' => 'B2B registration requires company name, market, country, and website.',
            ], 400);
        }

        if ($email === '' || $firebaseUid === '') {
            return $this->json(['error' => 'Email and firebaseUid are required.'], 400);
        }

        $existingByUid = $userRepository->findOneBy(['firebase_uid' => $firebaseUid]);
        $existingByEmail = $userRepository->findOneBy(['email' => $email]);

        $existingUser = $existingByUid ?? $existingByEmail;

        if ($existingUser instanceof B2BCompany || $existingUser instanceof B2BMarket) {
            if (!$existingUser->isVerified()) {
                return $this->json([
                    'error' => 'Your partner account is still pending admin verification.',
                ], 403);
            }

            $existingUser->setEmail($email);
            $existingUser->setFirebaseUid($firebaseUid);
            $existingUser->setIsActive(true);
            $existingUser->setLastLogin(new \DateTimeImmutable());
            $existingUser->setUpdatedAt(new \DateTimeImmutable());

            $entityManager->flush();

            return $this->json($this->serializeUser($existingUser));
        }

        if ($existingUser instanceof Customer) {
            if ($isB2B) {
                return $this->json([
                    'error' => 'This email is already registered as a customer account.',
                ], 409);
            }

            $customer = $existingUser;
            $customer->setEmail($email);
            $customer->setFirebaseUid($firebaseUid);
            $customer->setIsActive(true);
            $customer->setUpdatedAt(new \DateTimeImmutable());
            $customer->setFullName($fullName);
        } else {
            if ($isB2B) {
                $customer = $this->createB2bAccount($accountType);
            } else {
                $customer = new Customer();
            }

            $customer->setEmail($email);
            $customer->setFirebaseUid($firebaseUid);
            $customer->setIsActive(true);

            if ($customer instanceof Customer) {
                $customer->setFullName($fullName);
                $customer->setJoinedAt(new \DateTimeImmutable());
                $customer->setUpdatedAt(new \DateTimeImmutable());
                $customer->setIsVerified(true);
            }

            if ($customer instanceof B2BCompany || $customer instanceof B2BMarket) {
                $customer->setCompanyName($companyName);
                $customer->setCompanyMarket($companyMarket);
                $customer->setCompanyCountry($companyCountry !== null ? strtoupper($companyCountry) : null);
                $customer->setCompanyWebsite($companyWebsite);
                $customer->setB2bStatus('PENDING');
                $customer->setJoinedAt(new \DateTimeImmutable());
                $customer->setUpdatedAt(new \DateTimeImmutable());
                $customer->setIsVerified(false);
                $customer->setLastLogin(new \DateTimeImmutable());
            }

            $entityManager->persist($customer);
        }

        if ($customer instanceof Customer) {
            $customer->setLastLogin(new \DateTimeImmutable());
            $subscription = $subscriptionLifecycleService->ensureDefaultFreePlan($customer);
            $entityManager->persist($subscription);
        }

        $entityManager->flush();

        return $this->json($this->serializeUser($customer));
    }

    #[Route('/api/b2c/profile/{firebaseUid}', name: 'b2c_profile_get', methods: ['GET'])]
    public function getProfile(string $firebaseUid, UserRepository $userRepository): JsonResponse
    {
        $user = $userRepository->findOneWithSubscriptionByFirebaseUid($firebaseUid);

        if (!$user instanceof Customer && !$user instanceof B2BCompany && !$user instanceof B2BMarket) {
            return $this->json(['error' => 'User not found.'], 404);
        }

        return $this->json($this->serializeUser($user));
    }

    #[Route('/api/b2c/profile/{firebaseUid}', name: 'b2c_profile_update', methods: ['PUT'])]
    public function updateProfile(
        string $firebaseUid,
        Request $request,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $userRepository->findOneBy(['firebase_uid' => $firebaseUid]);

        if (!$user instanceof Customer && !$user instanceof B2BCompany && !$user instanceof B2BMarket) {
            return $this->json(['error' => 'User not found.'], 404);
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        if (array_key_exists('fullName', $body)) {
            $fullNameRaw = $body['fullName'];
            $fullName = is_string($fullNameRaw) ? trim($fullNameRaw) : null;
            $value = $fullName === '' ? null : $fullName;
            if ($user instanceof Customer || $user instanceof B2BCompany || $user instanceof B2BMarket) {
                $user->setFullName($value);
            }
        }

        if (array_key_exists('adress', $body)) {
            $adressRaw = $body['adress'];
            $adress = is_string($adressRaw) ? trim($adressRaw) : null;
            $user->setAdress($adress === '' ? null : $adress);
        }

        $user->setUpdatedAt(new \DateTimeImmutable());

        $entityManager->flush();

        return $this->json($this->serializeUser($user));
    }

    private function serializeUser(User $customer): array
    {
        $accountType = match (true) {
            $customer instanceof B2BCompany => self::ACCOUNT_TYPE_B2B_COMPANY,
            $customer instanceof B2BMarket => self::ACCOUNT_TYPE_B2B_MARKET,
            default => self::ACCOUNT_TYPE_B2C,
        };
        $subscription = $customer->getSubscription();

        return [
            'id' => $customer->getId(),
            'email' => $customer->getEmail(),
            'firebase_uid' => $customer->getFirebaseUid(),
            'type' => strtolower($accountType),
            'full_name' => $customer instanceof Customer ? $customer->getFullName() : ($customer instanceof B2BCompany || $customer instanceof B2BMarket ? $customer->getFullName() : null),
            'adress' => $customer->getAdress(),
            'is_verified' => $customer instanceof Customer ? $customer->isVerified() : ($customer instanceof B2BCompany || $customer instanceof B2BMarket ? $customer->isVerified() : null),
            'is_active' => $customer->isActive(),
            'joined_at' => $customer instanceof Customer || $customer instanceof B2BCompany || $customer instanceof B2BMarket ? $customer->getJoinedAt()?->format(\DateTimeInterface::ATOM) : null,
            'updated_at' => $customer instanceof Customer || $customer instanceof B2BCompany || $customer instanceof B2BMarket ? $customer->getUpdatedAt()?->format(\DateTimeInterface::ATOM) : null,
            'last_login' => $customer->getLastLogin()?->format(\DateTimeInterface::ATOM),
            'account_type' => $accountType,
            'account_status' => $customer->getAccountStatus(),
            'company_name' => $customer instanceof B2BCompany || $customer instanceof B2BMarket ? $customer->getCompanyName() : null,
            'company_market' => $customer instanceof B2BCompany || $customer instanceof B2BMarket ? $customer->getCompanyMarket() : null,
            'company_country' => $customer instanceof B2BCompany || $customer instanceof B2BMarket ? $customer->getCompanyCountry() : null,
            'company_website' => $customer instanceof B2BCompany || $customer instanceof B2BMarket ? $customer->getCompanyWebsite() : null,
            'b2b_status' => $customer instanceof B2BCompany || $customer instanceof B2BMarket ? $customer->getB2bStatus() : null,
            'subscription' => $this->serializeSubscription($subscription),
        ];
    }

    private function serializeSubscription(?SubscriptionB2C $subscription): ?array
    {
        if (!$subscription instanceof SubscriptionB2C) {
            return null;
        }

        return [
            'id' => $subscription->getId(),
            'plan_type' => $subscription->getPlanType(),
            'active' => $subscription->isActive(),
            'start_date' => $subscription->getStartDate()?->format(\DateTimeInterface::ATOM),
            'end_date' => $subscription->getEndDate()?->format(\DateTimeInterface::ATOM),
            'alerts_limit' => $subscription->getAlertsLimit(),
            'favorites_limit' => $subscription->getFavoritesLimit(),
            'price_history_access' => $subscription->getPriceHistoryAccess(),
        ];
    }

    private function createB2bAccount(string $accountType): B2BCompany|B2BMarket
    {
        return $accountType === self::ACCOUNT_TYPE_B2B_MARKET ? new B2BMarket() : new B2BCompany();
    }

    private function normalizeOptionalText(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $normalized = trim($value);

        return $normalized === '' ? null : $normalized;
    }
}
