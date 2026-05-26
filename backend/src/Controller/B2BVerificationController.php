<?php

namespace App\Controller;

use App\Entity\Activity;
use App\Entity\B2B;
use App\Entity\B2BCompany;
use App\Entity\B2BMarket;
use App\Entity\Brand;
use App\Entity\PartnerRequest;
use App\Entity\Subscription;
use App\Entity\User;
use App\Repository\AdminRepository;
use App\Repository\BrandRepository;
use App\Repository\PartnerRequestRepository;
use App\Repository\SellerRepository;
use App\Repository\UserRepository;
use App\Security\AdminApiGuard;
use App\Service\BrandDiscoveryService;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Mailer\MailerInterface;
use Psr\Cache\CacheItemPoolInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Mime\Email;

#[Route('/admin/api/users/b2b')]
final class B2BVerificationController extends AbstractController
{
    use CachedResponseTrait;

    private const CACHE_KEY_PENDING = 'b2b_verification.pending';
    private const CACHE_KEY_RECENT = 'b2b_verification.recent';

    public function __construct(
        #[Autowire(service: 'general.cache')]
        private readonly CacheItemPoolInterface $cache,
        private readonly BrandDiscoveryService $brandDiscoveryService,
        private readonly BrandRepository $brandRepository,
    ) {
    }

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
        $cacheKey = self::CACHE_KEY_PENDING . ".l{$limit}.o{$offset}." . md5($search);

        return $this->cachedGet($this->cache, $cacheKey, function () use ($partnerRequestRepository, $limit, $offset, $search): array {
            $result = $partnerRequestRepository->paginatePending($limit, $offset, $search);

            return [
                'items' => array_map(fn (PartnerRequest $pr) => $this->serializeRequest($pr), $result['items']),
                'pagination' => [
                    'limit' => $limit,
                    'offset' => $offset,
                    'total' => $result['total'],
                ],
            ];
        });
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
        $cacheKey = self::CACHE_KEY_RECENT . ".l{$limit}";

        return $this->cachedGet($this->cache, $cacheKey, static function () use ($entityManager, $limit): array {
            $logs = $entityManager->createQueryBuilder()
                ->select('log, admin')
                ->from(Activity::class, 'log')
                ->leftJoin('log.admin', 'admin')
                ->andWhere('log.subject_type = :entityType')
                ->andWhere('log.action IN (:actions)')
                ->setParameter('entityType', 'PARTNER_REQUEST')
                ->setParameter('actions', ['B2B_APPROVE', 'B2B_REJECT'])
                ->orderBy('log.created_at', 'DESC')
                ->setMaxResults($limit)
                ->getQuery()
                ->getResult();

            return [
                'items' => array_map(
                    static fn (Activity $log) => [
                        'id' => $log->getId(),
                        'action' => $log->getAction() ?? $log->getVerb(),
                        'created_at' => $log->getCreatedAt()?->format(\DateTimeInterface::ATOM),
                        'admin' => $log->getAdmin()?->getEmail(),
                        'entity_id' => $log->getSubjectId(),
                        'before' => $log->getContext(),
                        'after' => $log->getMetadata(),
                    ],
                    $logs,
                ),
            ];
        });
    }

    #[Route('/{id}/status', name: 'admin_b2b_status_update', methods: ['PATCH'])]
    public function updateStatus(
        int $id,
        Request $request,
        PartnerRequestRepository $partnerRequestRepository,
        UserRepository $userRepository,
        SellerRepository $sellerRepository,
        EntityManagerInterface $entityManager,
        AdminRepository $adminRepository,
        AdminApiGuard $adminApiGuard,
        LoggerInterface $logger,
        MailerInterface $mailer,
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

        $isRejected = $status === 'REJECTED';

        if ($status === 'APPROVED') {
            $existingUser = $userRepository->findOneBy(['email' => $partnerRequest->getEmail()]);
            if ($existingUser !== null) {
                if (!$existingUser instanceof B2BCompany && !$existingUser instanceof B2BMarket) {
                    return $this->json(['error' => 'An account already exists with this partner email.'], 409);
                }

                if ($existingUser->isVerified() === true) {
                    return $this->json(['error' => 'This B2B account has already been approved.'], 409);
                }

                $approvedUser = $existingUser;
            }

            $isMarketRequest = strtoupper((string) $partnerRequest->getAccountType()) === 'B2B_MARKET';
            $sellerId = $payload['seller_id'] ?? null;
            $seller = null;
            $brandName = $isMarketRequest ? trim((string) ($payload['brand_name'] ?? '')) : '';

            // Seller integration applies to both B2B companies and B2B markets.
            if ($sellerId) {
                $seller = $sellerRepository->find($sellerId);
                if (!$seller) {
                    return $this->json(['error' => 'Provided Seller ID does not exist.'], 404);
                }
            } else {
                // Auto-create seller if not provided
                $seller = new \App\Entity\Seller();
                $seller->setName((string) $partnerRequest->getCompanyName());
                $seller->setUrl((string) $partnerRequest->getCompanyWebsite());
                $entityManager->persist($seller);
            }

            $plainPassword = $this->decryptProvisioningPassword((string) $partnerRequest->getB2bPassword());
            if ($plainPassword === null) {
                return $this->json(['error' => 'Unable to decrypt B2B provisioning password.'], 500);
            }

            try {
                $entityManager->wrapInTransaction(function (EntityManagerInterface $em) use (
                    $existingUser, $partnerRequest, $seller, $payload, $plainPassword, $logger, $brandName,
                    &$approvedUser, &$subscription, &$firebaseUid
                ) {
                    if ($existingUser === null) {
                        $approvedUser = $this->createVerifiedB2bUser($partnerRequest, $em);
                    }

                    $approvedUser->setOwnerUser($approvedUser);
                    $approvedUser->setIsActive(true);
                    $approvedUser->setAccountStatus('ACTIVE');
                    $approvedUser->setB2bStatus('APPROVED');
                    $approvedUser->setIsVerified(true);
                    $approvedUser->setUpdatedAt(new \DateTimeImmutable());

                    if (($approvedUser instanceof B2BCompany || $approvedUser instanceof B2BMarket) && $seller !== null) {
                        $approvedUser->setSeller($seller);
                    }

                    if ($approvedUser instanceof B2BMarket && $brandName !== '') {
                        $approvedUser->setBrandName($brandName);
                        $brand = $this->brandRepository->findOneBy(['name' => $brandName]);
                        if ($brand !== null) {
                            $approvedUser->setBrandEntity($brand);
                        }
                    }

                    // Persist user first so getId() returns a real ID for the subscription
                    $em->persist($approvedUser);
                    $em->flush();

                    $planType = $payload['plan_type'] ?? 'SILVER';
                    $durationMonths = (int) ($payload['duration_months'] ?? 3);
                    $subscription = $this->attachB2bSubscription($approvedUser, $planType, $durationMonths);
                    $em->persist($subscription);
                    $em->flush();

                    // Firebase provisioning — if this fails, the transaction rolls back everything
                    $provisionResult = $this->provisionFirebaseB2bUser((string) $partnerRequest->getEmail(), $plainPassword, $logger);
                    $firebaseUid = $provisionResult['uid'] ?? null;
                    if ($firebaseUid === null) {
                        $logger->error('Firebase provisioning failed for B2B approval', ['email' => $partnerRequest->getEmail()]);
                        throw new \RuntimeException($provisionResult['error'] ?? 'Firebase provisioning returned no UID');
                    }

                    $approvedUser->setFirebaseUid($firebaseUid);
                    $em->flush();
                });

                // Handle Firebase failure — the transaction was already rolled back
                $subscription = null;
            } catch (\Throwable $e) {
                $logger->error('Exception during B2B approval flow', ['exception' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
                $appEnv = $_ENV['APP_ENV'] ?? $_SERVER['APP_ENV'] ?? 'prod';
                if (is_string($appEnv) && strtolower($appEnv) === 'dev') {
                    return $this->json(['error' => 'Internal server error during B2B approval.', 'exception' => $e->getMessage(), 'trace' => $e->getTraceAsString()], 500);
                }

                return $this->json(['error' => 'Internal server error during B2B approval.'], 500);
            }

            // Trigger brand discovery for B2B Market accounts
            if ($approvedUser instanceof B2BMarket && $brandName !== '') {
                try {
                    $this->brandDiscoveryService->discover($approvedUser);
                    $logger->info('Brand discovery completed for B2B Market', [
                        'market_id' => $approvedUser->getId(),
                        'brand_name' => $brandName,
                    ]);
                } catch (\Throwable $e) {
                    $logger->error('Brand discovery failed after approval', [
                        'market_id' => $approvedUser->getId(),
                        'brand_name' => $brandName,
                        'exception' => $e->getMessage(),
                    ]);
                }
            }
        }

        $after = [
            'decision' => $status,
            'reviewer_note' => $reviewerNote,
            'approved_user_id' => null,
            'approved_email' => $responsePayload['email'] ?? null,
        ];

        $activityLog = new Activity();
        $activityLog
            ->setActorType('ADMIN')
            ->setActorId($admin?->getId())
            ->setAdmin($admin)
            ->setVerb($status === 'APPROVED' ? 'B2B_APPROVE' : 'B2B_REJECT')
            ->setAction($status === 'APPROVED' ? 'B2B_APPROVE' : 'B2B_REJECT')
            ->setSubjectType('PARTNER_REQUEST')
            ->setSubjectId($partnerRequest->getId())
            ->setContext($before)
            ->setMetadata($after)
            ->setIpAddress($request->getClientIp())
            ->setCreatedAt(new \DateTimeImmutable());
        $entityManager->persist($activityLog);

        $entityManager->remove($partnerRequest);
        $entityManager->flush();

        if ($isRejected) {
            $this->sendRejectionEmail((string) $partnerRequest->getEmail(), (string) $partnerRequest->getCompanyName(), $reviewerNote, $logger, $mailer);
        }

        if ($approvedUser !== null) {
            $responsePayload = $this->serializeApprovedUser($approvedUser);
            $responsePayload['reviewer_note'] = $reviewerNote;

            $this->sendApprovalConfirmationEmail((string) $approvedUser->getEmail(), (string) $approvedUser->getCompanyName(), $logger, $mailer);
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

        $this->invalidateCache($this->cache);

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

    private function createVerifiedB2bUser(PartnerRequest $partnerRequest, EntityManagerInterface $entityManager): B2B
    {
        $email = (string) $partnerRequest->getEmail();
        $userRepo = $entityManager->getRepository(User::class);
        $existing = $userRepo->findOneBy(['email' => $email]);

        if ($existing instanceof B2BCompany || $existing instanceof B2BMarket) {
            $user = $existing;
        } else {
            // Fallback if for some reason the pre-created user is missing or of wrong type
            $user = $partnerRequest->getAccountType() === 'B2B_MARKET' ? new B2BMarket() : new B2BCompany();
            $user->setEmail($email);
            $user->setJoinedAt(new \DateTimeImmutable());
        }

        $user->setFullName($partnerRequest->getFullName());
        // firebase_uid is non-nullable in DB — use a temporary placeholder until provisioning succeeds
        if (!$user->getFirebaseUid() || str_starts_with($user->getFirebaseUid(), 'pending_')) {
            $user->setFirebaseUid('pending_' . uniqid('', true));
        }
        $user->setIsActive(true);
        $user->setAccountStatus('ACTIVE');

        $user->setCompanyName((string) $partnerRequest->getCompanyName());
        $user->setCompanyMarket((string) $partnerRequest->getCompanyMarket());
        $user->setCompanyCountry((string) $partnerRequest->getCompanyCountry());
        $user->setCompanyWebsite((string) $partnerRequest->getCompanyWebsite());
        $user->setB2bStatus('APPROVED');
        $user->setUpdatedAt(new \DateTimeImmutable());
        $user->setIsVerified(true);
        $user->setOwnerUser($user);

        return $user;
    }

    private function attachB2bSubscription(B2B $user, string $planType, int $durationMonths): Subscription
    {
        $startDate = new \DateTimeImmutable();
        $endDate = $startDate->modify('+' . $durationMonths . ' months');

        $cleanPlan = strtoupper(trim($planType));
        $cleanPlan = str_replace('B2B_', '', $cleanPlan);
        if (!in_array($cleanPlan, ['SILVER', 'GOLD'])) {
            $cleanPlan = 'SILVER';
        }

        $subscription = new Subscription();
        $subscription->setOwnerType($user instanceof B2BMarket ? 'MARKET' : 'COMPANY');
        $subscription->setOwnerId((int) $user->getId());
        $subscription->setPlanType('B2B_' . $cleanPlan);
        $subscription->setDurationMonths($durationMonths);
        $subscription->setStartDate($startDate);
        $subscription->setEndDate($endDate);
        $subscription->setActive(true);
        $subscription->setCreatedAt(new \DateTimeImmutable());
        $subscription->setActivatedAt(new \DateTimeImmutable());

        return $subscription;
    }

    private function sellerWebsiteExists(string $companyWebsite, SellerRepository $sellerRepository): bool
    {
        return $sellerRepository->findOneByWebsiteHost($companyWebsite) !== null;
    }

    private function decryptProvisioningPassword(string $encrypted): ?string
    {
        $secret = $this->resolveProvisioningSecret();
        if (!is_string($secret) || trim($secret) === '') {
            return null;
        }

        $parts = explode(':', $encrypted, 2);
        if (count($parts) !== 2) {
            return null;
        }

        $iv = base64_decode($parts[0], true);
        $ciphertext = base64_decode($parts[1], true);
        if (!is_string($iv) || strlen($iv) !== 16 || !is_string($ciphertext) || $ciphertext === '') {
            return null;
        }

        $key = hash('sha256', $secret, true);
        $plain = openssl_decrypt($ciphertext, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);

        return is_string($plain) && $plain !== '' ? $plain : null;
    }

    private function provisionFirebaseB2bUser(string $email, string $password, LoggerInterface $logger): array
    {
        $apiKey = $_ENV['FIREBASE_WEB_API_KEY']
            ?? $_SERVER['FIREBASE_WEB_API_KEY']
            ?? $_ENV['NEXT_PUBLIC_FIREBASE_API_KEY']
            ?? $_SERVER['NEXT_PUBLIC_FIREBASE_API_KEY']
            ?? '';
        if (!is_string($apiKey) || trim($apiKey) === '') {
            return ['uid' => null, 'error' => 'FIREBASE_WEB_API_KEY environment variable not set'];
        }

        $signup = $this->postJson(
            'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' . urlencode($apiKey),
            [
                'email' => $email,
                'password' => $password,
                'returnSecureToken' => true,
            ],
        );

        if (($signup['status'] >= 200 && $signup['status'] < 300) && is_array($signup['data']) && isset($signup['data']['localId']) && is_string($signup['data']['localId'])) {
            return ['uid' => $signup['data']['localId'], 'error' => null];
        }

        $logger->warning('Firebase signUp did not return localId', ['email' => $email, 'response' => $signup]);

        $signIn = $this->postJson(
            'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' . urlencode($apiKey),
            [
                'email' => $email,
                'password' => $password,
                'returnSecureToken' => true,
            ],
        );
        if (($signIn['status'] >= 200 && $signIn['status'] < 300) && is_array($signIn['data']) && isset($signIn['data']['localId']) && is_string($signIn['data']['localId'])) {
            return ['uid' => $signIn['data']['localId'], 'error' => null];
        }

        $logger->warning('Firebase signIn did not return localId', ['email' => $email, 'response' => $signIn]);

        return ['uid' => null, 'error' => ['signup' => $signup['data'] ?? 'No data', 'signin' => $signIn['data'] ?? 'No data']];
    }

    /**
     * @return array{status: int, data: array<string, mixed>|null}
     */
    private function postJson(string $url, array $payload): array
    {
        $headers = [
            'Content-Type: application/json',
            'Accept: application/json',
        ];

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => implode("\r\n", $headers),
                'content' => json_encode($payload, JSON_THROW_ON_ERROR),
                'ignore_errors' => true,
                'timeout' => 15,
            ],
        ]);

        $raw = @file_get_contents($url, false, $context);
        $status = 0;
        if (isset($http_response_header) && is_array($http_response_header) && isset($http_response_header[0])) {
            if (preg_match('/\s(\d{3})\s/', (string) $http_response_header[0], $matches) === 1) {
                $status = (int) $matches[1];
            }
        }

        $data = null;
        if (is_string($raw) && $raw !== '') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $data = $decoded;
            }
        }

        return [
            'status' => $status,
            'data' => $data,
        ];
    }

    private function sendApprovalConfirmationEmail(string $businessEmail, string $companyName, LoggerInterface $logger, MailerInterface $mailer): void
    {
        $from = $_ENV['B2B_NOTIFICATIONS_FROM'] ?? $_SERVER['B2B_NOTIFICATIONS_FROM'] ?? 'noreply@productradar.tn';
        $subject = 'Your ProductRadar B2B account has been approved';
        $message = "Hello,\n\nYour B2B registration for {$companyName} has been approved successfully.\nYou can now sign in and access the B2B dashboard.\n\nBest regards,\nProductRadar Team";

        try {
            $email = (new Email())
                ->from($from)
                ->to($businessEmail)
                ->subject($subject)
                ->text($message);

            $mailer->send($email);
        } catch (\Throwable $e) {
            $logger->warning('B2B approval email could not be sent.', [
                'email' => $businessEmail,
                'from' => $from,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function sendRejectionEmail(string $businessEmail, string $companyName, string $reviewerNote, LoggerInterface $logger, MailerInterface $mailer): void
    {
        $from = $_ENV['B2B_NOTIFICATIONS_FROM'] ?? $_SERVER['B2B_NOTIFICATIONS_FROM'] ?? 'noreply@productradar.tn';
        $subject = 'Update on Your ProductRadar B2B Registration';
        $reasonText = $reviewerNote !== '' ? "\n\nReason: {$reviewerNote}" : '';
        $message = "Hello,\n\nYour B2B registration for {$companyName} was not approved at this time.{$reasonText}\n\nIf you have any questions, please contact our support team.\n\nBest regards,\nProductRadar Team";

        try {
            $email = (new Email())
                ->from($from)
                ->to($businessEmail)
                ->subject($subject)
                ->text($message);

            $mailer->send($email);
        } catch (\Throwable $e) {
            $logger->warning('B2B rejection email could not be sent.', [
                'email' => $businessEmail,
                'from' => $from,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function resolveProvisioningSecret(): ?string
    {
        $secret = $_ENV['B2B_PROVISIONING_SECRET']
            ?? $_SERVER['B2B_PROVISIONING_SECRET']
            ?? $_ENV['APP_SECRET']
            ?? $_SERVER['APP_SECRET']
            ?? '';

        return is_string($secret) && trim($secret) !== '' ? $secret : null;
    }

    private function serializeApprovedUser(B2B $user): array
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
