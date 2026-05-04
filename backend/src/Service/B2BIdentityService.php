<?php

namespace App\Service;

use App\Entity\B2BCompany;
use App\Entity\B2BMarket;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * Enforces strict ownership-based identity binding for B2B users.
 *
 * CRITICAL SECURITY: Every B2B data access MUST resolve owner_user_id first,
 * NOT company_id. This prevents spoofing and cross-company data leakage.
 */
final class B2BIdentityService
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    /**
     * Resolves B2BCompany by firebaseUid, enforcing strict ownership.
     *
     * Returns company IF AND ONLY IF:
     * - User exists with this firebaseUid
     * - User has B2BCompany entity
     * - B2BCompany.owner_user_id = user.id (primary key match)
     *
     * @return B2BCompany|JsonResponse (error response if validation fails)
     */
    public function resolveB2BCompanyByOwnership(string $firebaseUid): B2BCompany|JsonResponse
    {
        // Step 1: Resolve user from Firebase UID
        $user = $this->entityManager->getRepository(User::class)->findOneBy([
            'firebase_uid' => $firebaseUid,
        ]);

        if (!$user instanceof User) {
            return new JsonResponse(['error' => 'User not found.'], 404);
        }

        // Step 2: Resolve B2BCompany (should be single, polymorphic relation)
        $company = $this->entityManager->getRepository(B2BCompany::class)->findOneBy([
            'id' => $user->getId(),
        ]);

        if (!$company instanceof B2BCompany) {
            return new JsonResponse(['error' => 'B2B company not found for this user.'], 404);
        }

        // CRITICAL: Enforce ownership as PRIMARY ACCESS KEY
        if ($company->getOwnerUser()?->getId() !== $user->getId()) {
            return new JsonResponse(
                ['error' => 'Access denied: ownership mismatch.'],
                403
            );
        }

        // Verify user is verified
        if (!$company->isVerified()) {
            return new JsonResponse(
                ['error' => 'B2B company not verified yet.'],
                403
            );
        }

        return $company;
    }

    /**
     * Resolves B2BMarket by firebaseUid, enforcing strict ownership.
     * Same rules as company resolution.
     *
     * @return B2BMarket|JsonResponse
     */
    public function resolveB2BMarketByOwnership(string $firebaseUid): B2BMarket|JsonResponse
    {
        $user = $this->entityManager->getRepository(User::class)->findOneBy([
            'firebase_uid' => $firebaseUid,
        ]);

        if (!$user instanceof User) {
            return new JsonResponse(['error' => 'User not found.'], 404);
        }

        $market = $this->entityManager->getRepository(B2BMarket::class)->findOneBy([
            'id' => $user->getId(),
        ]);

        if (!$market instanceof B2BMarket) {
            return new JsonResponse(['error' => 'B2B market not found for this user.'], 404);
        }

        // CRITICAL: Enforce ownership as PRIMARY ACCESS KEY
        if ($market->getOwnerUser()?->getId() !== $user->getId()) {
            return new JsonResponse(
                ['error' => 'Access denied: ownership mismatch.'],
                403
            );
        }

        if (!$market->isVerified()) {
            return new JsonResponse(
                ['error' => 'B2B market not verified yet.'],
                403
            );
        }

        return $market;
    }

    /**
     * Validates that user owns a specific company.
     * Used for operations on company_id sent by client.
     *
     * SECURITY: Must call this before allowing any update to a company entity.
     */
    public function validateCompanyOwnership(string $firebaseUid, int $companyId): bool
    {
        $company = $this->resolveB2BCompanyByOwnership($firebaseUid);
        if ($company instanceof JsonResponse) {
            return false;
        }

        return $company->getId() === $companyId;
    }

    /**
     * Validates that user owns a specific market.
     */
    public function validateMarketOwnership(string $firebaseUid, int $marketId): bool
    {
        $market = $this->resolveB2BMarketByOwnership($firebaseUid);
        if ($market instanceof JsonResponse) {
            return false;
        }

        return $market->getId() === $marketId;
    }
}
