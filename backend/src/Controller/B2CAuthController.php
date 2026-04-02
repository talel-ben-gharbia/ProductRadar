<?php

namespace App\Controller;

use App\Entity\Customer;
use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class B2CAuthController extends AbstractController
{
    #[Route('/api/b2c/auth/firebase', name: 'b2c_auth_firebase', methods: ['POST'])]
    public function firebaseAuth(
        Request $request,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
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

        if ($email === '' || $firebaseUid === '') {
            return $this->json(['error' => 'Email and firebaseUid are required.'], 400);
        }

        $existingByUid = $userRepository->findOneBy(['firebase_uid' => $firebaseUid]);
        $existingByEmail = $userRepository->findOneBy(['email' => $email]);

        $existingUser = $existingByUid ?? $existingByEmail;

        if ($existingUser instanceof User && !$existingUser instanceof Customer) {
            return $this->json([
                'error' => 'This account already exists with a non-customer role.',
            ], 409);
        }

        if ($existingUser instanceof Customer) {
            $customer = $existingUser;
            $customer->setEmail($email);
            $customer->setFirebaseUid($firebaseUid);
            $customer->setIsActive(true);
            $customer->setUpdatedAt(new \DateTimeImmutable());
            $customer->setIsVerified(true);
            $customer->setFullName($fullName);
        } else {
            $customer = new Customer();
            $customer->setEmail($email);
            $customer->setFirebaseUid($firebaseUid);
            $customer->setIsActive(true);
            $customer->setFullName($fullName);
            $customer->setJoinedAt(new \DateTimeImmutable());
            $customer->setUpdatedAt(new \DateTimeImmutable());
            $customer->setIsVerified(true);
            $entityManager->persist($customer);
        }

        $entityManager->flush();

        return $this->json($this->serializeCustomer($customer));
    }

    #[Route('/api/b2c/profile/{firebaseUid}', name: 'b2c_profile_get', methods: ['GET'])]
    public function getProfile(string $firebaseUid, UserRepository $userRepository): JsonResponse
    {
        $user = $userRepository->findOneBy(['firebase_uid' => $firebaseUid]);

        if (!$user instanceof Customer) {
            return $this->json(['error' => 'Customer not found.'], 404);
        }

        return $this->json($this->serializeCustomer($user));
    }

    #[Route('/api/b2c/profile/{firebaseUid}', name: 'b2c_profile_update', methods: ['PUT'])]
    public function updateProfile(
        string $firebaseUid,
        Request $request,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $userRepository->findOneBy(['firebase_uid' => $firebaseUid]);

        if (!$user instanceof Customer) {
            return $this->json(['error' => 'Customer not found.'], 404);
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        if (array_key_exists('fullName', $body)) {
            $fullNameRaw = $body['fullName'];
            $fullName = is_string($fullNameRaw) ? trim($fullNameRaw) : null;
            $user->setFullName($fullName === '' ? null : $fullName);
        }

        if (array_key_exists('adress', $body)) {
            $adressRaw = $body['adress'];
            $adress = is_string($adressRaw) ? trim($adressRaw) : null;
            $user->setAdress($adress === '' ? null : $adress);
        }

        $user->setUpdatedAt(new \DateTimeImmutable());

        $entityManager->flush();

        return $this->json($this->serializeCustomer($user));
    }

    private function serializeCustomer(Customer $customer): array
    {
        return [
            'id' => $customer->getId(),
            'email' => $customer->getEmail(),
            'firebase_uid' => $customer->getFirebaseUid(),
            'type' => 'customer',
            'full_name' => $customer->getFullName(),
            'adress' => $customer->getAdress(),
            'is_verified' => $customer->isVerified(),
            'is_active' => $customer->isActive(),
        ];
    }
}
