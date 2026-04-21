<?php

namespace App\Controller;

use App\Entity\PartnerRequest;
use App\Entity\User;
use App\Repository\PartnerRequestRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
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
    ): JsonResponse {
        $payload = json_decode((string) $request->getContent(), true);

        if (!is_array($payload)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        $email = mb_strtolower(trim((string) ($payload['email'] ?? '')));
        $fullName = $this->normalizeOptional((string) ($payload['fullName'] ?? ''));
        $accountType = strtoupper(trim((string) ($payload['accountType'] ?? '')));
        $companyName = $this->normalizeOptional((string) ($payload['companyName'] ?? ''));
        $companyMarket = $this->normalizeOptional((string) ($payload['companyMarket'] ?? ''));
        $companyCountry = strtoupper(trim((string) ($payload['companyCountry'] ?? '')));
        $companyWebsite = $this->normalizeOptional((string) ($payload['companyWebsite'] ?? ''));
        $notes = $this->normalizeOptional((string) ($payload['notes'] ?? ''));

        if (!in_array($accountType, ['B2B_COMPANY', 'B2B_MARKET'], true)) {
            return $this->json(['error' => 'Invalid account type.'], 422);
        }

        if ($email === '' || $companyName === null || $companyMarket === null || $companyCountry === '' || $companyWebsite === null) {
            return $this->json(['error' => 'Email, company name, market, country, and website are required.'], 422);
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

        $partnerRequest = new PartnerRequest();
        $partnerRequest->setEmail($email);
        $partnerRequest->setFullName($fullName);
        $partnerRequest->setAccountType($accountType);
        $partnerRequest->setCompanyName($companyName);
        $partnerRequest->setCompanyMarket($companyMarket);
        $partnerRequest->setCompanyCountry($companyCountry);
        $partnerRequest->setCompanyWebsite($companyWebsite);
        $partnerRequest->setNotes($notes);
        $partnerRequest->setCreatedAt(new \DateTimeImmutable());

        $entityManager->persist($partnerRequest);
        $entityManager->flush();

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
}
