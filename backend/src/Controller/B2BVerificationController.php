<?php

namespace App\Controller;

use App\Entity\AdminActivityLog;
use App\Entity\B2BCompany;
use App\Entity\B2BMarket;
use App\Entity\PartnerRequest;
use App\Repository\AdminRepository;
use App\Repository\PartnerRequestRepository;
use App\Repository\UserRepository;
use App\Security\AdminApiGuard;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/admin/api/users/b2b')]
final class B2BVerificationController extends AbstractController
{
    #[Route('/pending', name: 'admin_b2b_pending_list', methods: ['GET'])]
    public function listPending(
        Request $request,
        PartnerRequestRepository $partnerRequestRepository,
        AdminApiGuard $adminApiGuard,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        $limit = max(1, min(100, $request->query->getInt('limit', 25)));
        $offset = max(0, $request->query->getInt('offset', 0));
        $search = trim((string) $request->query->get('search', ''));

        $result = $partnerRequestRepository->paginatePending($limit, $offset, $search);

        return $this->json([
            'items' => array_map(fn (PartnerRequest $request) => $this->serializeRequest($request), $result['items']),
            'pagination' => [
                'limit' => $limit,
                'offset' => $offset,
                'total' => $result['total'],
            ],
        ]);
    }

    #[Route('/recent', name: 'admin_b2b_recent_reviews', methods: ['GET'])]
    public function listRecent(
        Request $request,
        EntityManagerInterface $entityManager,
        AdminApiGuard $adminApiGuard,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        $limit = max(1, min(100, $request->query->getInt('limit', 10)));

        $logs = $entityManager->createQueryBuilder()
            ->select('log, admin')
            ->from(AdminActivityLog::class, 'log')
            ->leftJoin('log.admin', 'admin')
            ->andWhere('log.entityType = :entityType')
            ->andWhere('log.action IN (:actions)')
            ->setParameter('entityType', 'PARTNER_REQUEST')
            ->setParameter('actions', ['B2B_APPROVE', 'B2B_REJECT'])
            ->orderBy('log.createdAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        return $this->json([
            'items' => array_map(
                fn (AdminActivityLog $log) => [
                    'id' => $log->getId(),
                    'action' => $log->getAction(),
                    'created_at' => $log->getCreatedAt()?->format(\DateTimeInterface::ATOM),
                    'admin' => $log->getAdmin()?->getEmail(),
                    'entity_id' => $log->getEntityId(),
                    'before' => $log->getBeforeJson(),
                    'after' => $log->getAfterJson(),
                ],
                $logs,
            ),
        ]);
    }

    #[Route('/{id}/status', name: 'admin_b2b_status_update', methods: ['PATCH'])]
    public function updateStatus(
        int $id,
        Request $request,
        PartnerRequestRepository $partnerRequestRepository,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
        AdminRepository $adminRepository,
        AdminApiGuard $adminApiGuard,
        LoggerInterface $logger,
    ): JsonResponse {
        $authError = $adminApiGuard->assertAuthorized($request);
        if ($authError !== null) {
            return $authError;
        }

        $payload = json_decode((string) $request->getContent(), true);
        $status = strtoupper((string) ($payload['status'] ?? ''));
        $reviewerNote = $this->normalizeOptional((string) ($payload['reviewer_note'] ?? ''));

        if (!in_array($status, ['APPROVED', 'REJECTED'], true)) {
            return $this->json(['error' => 'Invalid B2B status.'], 422);
        }

        if ($reviewerNote !== null && mb_strlen($reviewerNote) > 1000) {
            return $this->json(['error' => 'Reviewer note cannot exceed 1000 characters.'], 422);
        }

        $partnerRequest = $partnerRequestRepository->find($id);
        if (!$partnerRequest instanceof PartnerRequest) {
            return $this->json(['error' => 'Partner request not found.'], 404);
        }

        $admin = null;
        $adminId = $adminApiGuard->getAdminId($request);
        if ($adminId !== null) {
            $admin = $adminRepository->find($adminId);
        }

        $before = $this->serializeRequest($partnerRequest);

        $responsePayload = [
            'id' => $partnerRequest->getId(),
            'status' => $status,
            'email' => $partnerRequest->getEmail(),
            'reviewer_note' => $reviewerNote,
        ];

        $approvedUser = null;

        if ($status === 'APPROVED') {
            $existingUser = $userRepository->findOneBy(['email' => $partnerRequest->getEmail()]);
            if ($existingUser !== null) {
                return $this->json(['error' => 'An account already exists with this partner email.'], 409);
            }

            $approvedUser = $this->createVerifiedB2bUser($partnerRequest);
            $entityManager->persist($approvedUser);
        }

        $after = [
            'decision' => $status,
            'reviewer_note' => $reviewerNote,
            'approved_user_id' => null,
            'approved_email' => $responsePayload['email'] ?? null,
        ];

        $activityLog = new AdminActivityLog();
        $activityLog
            ->setAdmin($admin)
            ->setAction($status === 'APPROVED' ? 'B2B_APPROVE' : 'B2B_REJECT')
            ->setEntityType('PARTNER_REQUEST')
            ->setEntityId($partnerRequest->getId())
            ->setBeforeJson($before)
            ->setAfterJson($after)
            ->setIpAddress($request->getClientIp())
            ->setCreatedAt(new \DateTimeImmutable());
        $entityManager->persist($activityLog);

        $entityManager->remove($partnerRequest);
        $entityManager->flush();

        if ($approvedUser !== null) {
            $responsePayload = $this->serializeApprovedUser($approvedUser);
            $responsePayload['reviewer_note'] = $reviewerNote;
        }

        $logger->info('B2B moderation decision completed', [
            'partner_request_id' => $before['id'] ?? $id,
            'decision' => $status,
            'reviewer_note' => $reviewerNote,
            'approved_user_id' => $approvedUser?->getId(),
            'admin_id' => $adminId,
            'admin_role' => $adminApiGuard->getRole($request),
            'ip' => $request->getClientIp(),
        ]);

        return $this->json($responsePayload);
    }

    private function serializeRequest(PartnerRequest $request): array
    {
        return [
            'id' => $request->getId(),
            'email' => $request->getEmail(),
            'full_name' => $request->getFullName(),
            'joined_at' => $request->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            'updated_at' => null,
            'last_login' => null,
            'is_active' => true,
            'is_verified' => false,
            'account_type' => $request->getAccountType(),
            'account_status' => 'PENDING_REVIEW',
            'b2b_status' => 'PENDING',
            'company_name' => $request->getCompanyName(),
            'company_market' => $request->getCompanyMarket(),
            'company_country' => $request->getCompanyCountry(),
            'company_website' => $request->getCompanyWebsite(),
            'notes' => $request->getNotes(),
            'subscription' => null,
        ];
    }

    private function normalizeOptional(string $value): ?string
    {
        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }

    private function createVerifiedB2bUser(PartnerRequest $partnerRequest): B2BCompany|B2BMarket
    {
        $user = $partnerRequest->getAccountType() === 'B2B_MARKET' ? new B2BMarket() : new B2BCompany();

        $user->setEmail((string) $partnerRequest->getEmail());
        $user->setFullName($partnerRequest->getFullName());
        $user->setFirebaseUid('pending_partner_' . $partnerRequest->getId());
        $user->setIsActive(true);
        $user->setAccountStatus('ACTIVE');

        $user->setCompanyName((string) $partnerRequest->getCompanyName());
        $user->setCompanyMarket((string) $partnerRequest->getCompanyMarket());
        $user->setCompanyCountry((string) $partnerRequest->getCompanyCountry());
        $user->setCompanyWebsite((string) $partnerRequest->getCompanyWebsite());
        $user->setB2bStatus('APPROVED');
        $user->setJoinedAt(new \DateTimeImmutable());
        $user->setUpdatedAt(new \DateTimeImmutable());
        $user->setIsVerified(true);

        return $user;
    }

    private function serializeApprovedUser(B2BCompany|B2BMarket $user): array
    {
        return [
            'id' => $user->getId(),
            'email' => $user->getEmail(),
            'full_name' => $user->getFullName(),
            'account_type' => $user instanceof B2BMarket ? 'B2B_MARKET' : 'B2B_COMPANY',
            'b2b_status' => $user->getB2bStatus(),
            'account_status' => $user->getAccountStatus(),
            'company_name' => $user->getCompanyName(),
            'company_market' => $user->getCompanyMarket(),
            'company_country' => $user->getCompanyCountry(),
            'company_website' => $user->getCompanyWebsite(),
        ];
    }
}
