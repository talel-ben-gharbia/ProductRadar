<?php

namespace App\Controller;

use App\Entity\PartnerRequest;
use App\Entity\User;

use App\Repository\PartnerRequestRepository;
use App\Repository\UserRepository;
use Doctrine\DBAL\Exception\ForeignKeyConstraintViolationException;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\DBAL\Exception\NotNullConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class PartnerRequestController extends AbstractController
{
    #[Route('/api/b2b/partner-request', name: 'b2b_partner_request_create', methods: ['POST'])]
    public function create(
        Request $request,
        PartnerRequestRepository $partnerRequestRepository,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
        LoggerInterface $logger,
    ): JsonResponse {
        $payload = json_decode((string) $request->getContent(), true);

        if (!is_array($payload)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        $email = mb_strtolower(trim((string) ($payload['email'] ?? '')));
        $password = (string) ($payload['password'] ?? '');
        $confirmPassword = (string) ($payload['confirmPassword'] ?? $payload['passwordConfirmation'] ?? $payload['comfirmPassword'] ?? '');
        $accountType = strtoupper(trim((string) ($payload['accountType'] ?? '')));
        $fullName = $this->normalizeOptional((string) ($payload['fullName'] ?? ''));
        $companyName = $this->normalizeOptional((string) ($payload['companyName'] ?? ''));
        $companyMarket = $this->normalizeOptional((string) ($payload['companyMarket'] ?? ''));
        $companyCountry = strtoupper(trim((string) ($payload['companyCountry'] ?? '')));
        $companyWebsite = $this->normalizeOptional((string) ($payload['companyWebsite'] ?? ''));
        $notes = $this->normalizeOptional((string) ($payload['notes'] ?? ''));

        if (!in_array($accountType, ['B2B_COMPANY', 'B2B_MARKET'], true)) {
            return $this->json(['error' => 'Invalid account type.'], 422);
        }

        if ($email === '' || $password === '' || $confirmPassword === '' || $companyName === null || $companyMarket === null || $companyCountry === '' || $companyWebsite === null) {
            return $this->json(['error' => 'Email, password, company name, market, country, and website are required.'], 422);
        }

        if (mb_strlen($password) < 8) {
            return $this->json(['error' => 'Password must be at least 8 characters.'], 422);
        }

        if ($password !== $confirmPassword) {
            return $this->json(['error' => 'Password confirmation does not match.'], 422);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->json(['error' => 'Invalid email format.'], 422);
        }

        if (strlen($companyCountry) !== 2) {
            return $this->json(['error' => 'Company country must be a 2-letter ISO code.'], 422);
        }

        $existingUser = $userRepository->findOneBy(['email' => $email]);
        if ($existingUser instanceof User) {
            return $this->json(['error' => 'An account with this email already exists.'], 409);
        }

        $duplicateRequest = $partnerRequestRepository->findOneBy(['email' => $email, 'account_type' => $accountType]);
        if ($duplicateRequest instanceof PartnerRequest) {
            return $this->json(['error' => 'A pending partner request already exists for this email.'], 409);
        }

        $encryptedPassword = $this->encryptProvisioningPassword($password);
        if ($encryptedPassword === null) {
            return $this->json(['error' => 'Server is missing B2B password encryption configuration.'], 500);
        }

        $partnerRequest = new PartnerRequest();
        $partnerRequest->setEmail($email);
        $partnerRequest->setFullName($fullName);
        $partnerRequest->setAccountType($accountType);
        $partnerRequest->setCompanyName($companyName);
        $partnerRequest->setCompanyMarket($companyMarket);
        $partnerRequest->setCompanyCountry($companyCountry);
        $partnerRequest->setCompanyWebsite($companyWebsite);
        $partnerRequest->setB2bPassword($encryptedPassword);
        $partnerRequest->setNotes($notes);
        $partnerRequest->setCreatedAt(new \DateTimeImmutable());

        // Only persist the partner request. The B2B user is created during admin approval
        // in B2BVerificationController, which handles the full entity hierarchy correctly.
        $entityManager->getConnection()->beginTransaction();
        try {
            $entityManager->persist($partnerRequest);
            $entityManager->flush();
            $entityManager->getConnection()->commit();
        } catch (UniqueConstraintViolationException $e) {
            $entityManager->getConnection()->rollBack();
            $logger->warning('Partner request duplicate constraint: ' . $e->getMessage(), [
                'email' => $email,
                'accountType' => $accountType,
            ]);

            // If the email already exists as a user, return a specific message.
            $existingUser = $userRepository->findOneBy(['email' => $email]);
            if ($existingUser instanceof User) {
                return $this->json([
                    'error' => 'An account with this email already exists.',
                ], 409);
            }

            return $this->json([
                'error' => 'A request with this information already exists. Please try again.',
            ], 409);
        } catch (ForeignKeyConstraintViolationException $e) {
            $entityManager->getConnection()->rollBack();
            $logger->error('Partner request FK violation: ' . $e->getMessage() . "\n" . $e->getTraceAsString(), [
                'email' => $email,
                'accountType' => $accountType,
            ]);

            return $this->json([
                'error' => 'Unable to create account due to a database constraint. Please try again.',
            ], 500);
        } catch (NotNullConstraintViolationException $e) {
            $entityManager->getConnection()->rollBack();
            $logger->error('Partner request NOT NULL violation: ' . $e->getMessage() . "\n" . $e->getTraceAsString(), [
                'email' => $email,
                'accountType' => $accountType,
            ]);

            return $this->json([
                'error' => 'A required field is missing. Please check your form and try again.',
            ], 422);
        } catch (\Throwable $e) {
            $entityManager->getConnection()->rollBack();
            $logger->error('Partner request creation failed: ' . $e->getMessage() . "\n" . $e->getTraceAsString(), [
                'email' => $email,
                'accountType' => $accountType,
            ]);

            return $this->json([
                'error' => 'An unexpected error occurred. Please try again.',
            ], 500);
        }

        return $this->json([
            'id' => $partnerRequest->getId(),
            'message' => 'Partner request submitted successfully. We will review it shortly.',
        ], 201);
    }

    private function normalizeOptional(string $value): ?string
    {
        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }

    private function encryptProvisioningPassword(string $password): ?string
    {
        $secret = $this->resolveProvisioningSecret();
        if (!is_string($secret) || trim($secret) === '') {
            return null;
        }

        $key = hash('sha256', $secret, true);
        $iv = random_bytes(16);
        $ciphertext = openssl_encrypt($password, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);

        if (!is_string($ciphertext) || $ciphertext === '') {
            return null;
        }

        return base64_encode($iv) . ':' . base64_encode($ciphertext);
    }

    private function resolveProvisioningSecret(): string
    {
        $secret = $_ENV['B2B_PROVISIONING_SECRET']
            ?? $_SERVER['B2B_PROVISIONING_SECRET']
            ?? $_ENV['APP_SECRET']
            ?? $_SERVER['APP_SECRET']
            ?? 'default-b2b-provisioning-secret-key-12345'; // Fallback to prevent null errors

        return is_string($secret) && trim($secret) !== '' ? $secret : 'default-b2b-provisioning-secret-key-12345';
    }
}
