<?php

namespace App\Controller;

use App\Entity\Customer;
use App\Entity\Subscription;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Stripe\Exception\ApiErrorException;
use Stripe\Exception\SignatureVerificationException;
use Stripe\StripeClient;
use Stripe\Webhook;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class SubscriptionPaymentController extends AbstractController
{
    private const PLAN_DEFINITIONS = [
        'premium_monthly' => [
            'name' => 'ProductRdar Premium Monthly',
            'description' => 'Premium plan billed monthly',
            'unit_amount' => 5000,
            'interval' => 'month',
            'plan_type' => 'premium_monthly',
            'alerts_limit' => 20,
            'favorites_limit' => 999,
            'price_history_access' => 6,
            'duration' => 'P1M',
        ],
        'premium_yearly' => [
            'name' => 'ProductRdar Premium Yearly',
            'description' => 'Premium plan billed yearly',
            'unit_amount' => 42000,
            'interval' => 'year',
            'plan_type' => 'premium_yearly',
            'alerts_limit' => 20,
            'favorites_limit' => 999,
            'price_history_access' => 6,
            'duration' => 'P1Y',
        ],
    ];

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly UserRepository $userRepository,
    ) {
    }

    #[Route('/api/b2c/payments/checkout-session', name: 'b2c_payments_checkout_session', methods: ['POST'])]
    public function createCheckoutSession(Request $request): JsonResponse
    {
        $body = json_decode($request->getContent(), true);

        if (!is_array($body)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        $firebaseUid = trim((string) ($body['firebaseUid'] ?? ''));
        $planId = trim((string) ($body['planId'] ?? ''));
        $successUrl = trim((string) ($body['successUrl'] ?? ''));
        $cancelUrl = trim((string) ($body['cancelUrl'] ?? ''));

        if ($firebaseUid === '' || $planId === '' || $successUrl === '' || $cancelUrl === '') {
            return $this->json(['error' => 'firebaseUid, planId, successUrl and cancelUrl are required.'], 400);
        }

        $plan = self::PLAN_DEFINITIONS[$planId] ?? null;
        if ($plan === null) {
            return $this->json(['error' => 'Unsupported plan selected.'], 400);
        }

        $stripeSecretKey = $this->getEnv('STRIPE_SECRET_KEY');
        if ($stripeSecretKey === null || $stripeSecretKey === '') {
            return $this->json(['error' => 'Stripe is not configured on the server.'], 500);
        }

        $user = $this->userRepository->findOneBy(['firebase_uid' => $firebaseUid]);
        if (!$user instanceof Customer) {
            return $this->json(['error' => 'Customer not found.'], 404);
        }

        try {
            $stripeCurrency = strtolower($this->getEnv('STRIPE_CURRENCY') ?? 'usd');
            if (!preg_match('/^[a-z]{3}$/', $stripeCurrency)) {
                return $this->json(['error' => 'Invalid STRIPE_CURRENCY. Use a 3-letter ISO currency code like usd or tnd.'], 500);
            }

            $successUrlWithSession = $this->appendQueryParam(
                $successUrl,
                'session_id={CHECKOUT_SESSION_ID}'
            );

            $stripe = new StripeClient($stripeSecretKey);
            $checkoutSession = $stripe->checkout->sessions->create([
                'mode' => 'subscription',
                'customer_email' => $user->getEmail(),
                'client_reference_id' => $firebaseUid,
                'payment_method_types' => ['card'],
                'line_items' => [[
                    'quantity' => 1,
                    'price_data' => [
                        'currency' => $stripeCurrency,
                        'unit_amount' => $plan['unit_amount'],
                        'recurring' => [
                            'interval' => $plan['interval'],
                        ],
                        'product_data' => [
                            'name' => $plan['name'],
                            'description' => $plan['description'],
                        ],
                    ],
                ]],
                'success_url' => $successUrlWithSession,
                'cancel_url' => $cancelUrl,
                'metadata' => [
                    'firebase_uid' => $firebaseUid,
                    'plan_id' => $planId,
                ],
            ]);

            return $this->json([
                'sessionId' => $checkoutSession->id,
                'url' => $checkoutSession->url,
            ]);
        } catch (ApiErrorException $exception) {
            return $this->json([
                'error' => 'Stripe API error: ' . $exception->getMessage(),
            ], 502);
        } catch (\Throwable $exception) {
            $isDev = ($this->getEnv('APP_ENV') ?? '') === 'dev';

            return $this->json([
                'error' => $isDev
                    ? sprintf('Failed to create checkout session (%s): %s', $exception::class, $exception->getMessage())
                    : 'Failed to create checkout session.',
            ], 502);
        }
    }

    #[Route('/api/b2c/payments/stripe/webhook', name: 'b2c_payments_stripe_webhook', methods: ['POST'])]
    public function stripeWebhook(Request $request): JsonResponse
    {
        $stripeWebhookSecret = $this->getEnv('STRIPE_WEBHOOK_SECRET');
        if ($stripeWebhookSecret === null || $stripeWebhookSecret === '') {
            return $this->json(['error' => 'Stripe webhook secret is not configured.'], 500);
        }
        if (!str_starts_with($stripeWebhookSecret, 'whsec_')) {
            return $this->json(['error' => 'Invalid STRIPE_WEBHOOK_SECRET. It must start with "whsec_".'], 500);
        }

        $payload = $request->getContent();
        $signature = (string) $request->headers->get('stripe-signature', '');

        try {
            $event = Webhook::constructEvent($payload, $signature, $stripeWebhookSecret);
        } catch (\UnexpectedValueException|SignatureVerificationException) {
            return $this->json(['error' => 'Invalid Stripe webhook payload.'], 400);
        }

        if ($event->type === 'checkout.session.completed') {
            $session = $event->data->object;
            $metadata = $session->metadata ?? null;

            $firebaseUid = is_object($metadata) ? (string) ($metadata->firebase_uid ?? '') : '';
            $planId = is_object($metadata) ? (string) ($metadata->plan_id ?? '') : '';

            $this->activatePlanFromStripe($firebaseUid, $planId);
        }

        return $this->json(['received' => true]);
    }

    #[Route('/api/b2c/payments/confirm-session', name: 'b2c_payments_confirm_session', methods: ['POST'])]
    public function confirmCheckoutSession(Request $request): JsonResponse
    {
        $body = json_decode($request->getContent(), true);

        if (!is_array($body)) {
            return $this->json(['error' => 'Invalid request body.'], 400);
        }

        $firebaseUid = trim((string) ($body['firebaseUid'] ?? ''));
        $sessionId = trim((string) ($body['sessionId'] ?? ''));

        if ($firebaseUid === '' || $sessionId === '') {
            return $this->json(['error' => 'firebaseUid and sessionId are required.'], 400);
        }

        $stripeSecretKey = $this->getEnv('STRIPE_SECRET_KEY');
        if ($stripeSecretKey === null || $stripeSecretKey === '') {
            return $this->json(['error' => 'Stripe is not configured on the server.'], 500);
        }

        try {
            $stripe = new StripeClient($stripeSecretKey);
            $session = $stripe->checkout->sessions->retrieve($sessionId, []);
        } catch (ApiErrorException $exception) {
            return $this->json([
                'error' => 'Stripe API error: ' . $exception->getMessage(),
            ], 502);
        }

        $sessionFirebaseUid = (string) ($session->client_reference_id ?? '');
        $metadata = $session->metadata ?? null;
        $planId = is_object($metadata) ? (string) ($metadata->plan_id ?? '') : '';

        if ($sessionFirebaseUid !== $firebaseUid) {
            return $this->json(['error' => 'Session does not belong to this customer.'], 403);
        }

        if ($session->mode !== 'subscription') {
            return $this->json(['error' => 'Unsupported checkout mode.'], 400);
        }

        if ($session->status !== 'complete' || $session->payment_status !== 'paid') {
            return $this->json([
                'error' => 'Checkout session is not completed and paid yet.',
                'status' => $session->status,
                'payment_status' => $session->payment_status,
            ], 409);
        }

        $this->activatePlanFromStripe($firebaseUid, $planId);

        // Refresh the user from the database to ensure subscription data is loaded
        $user = $this->userRepository->findOneBy(['firebase_uid' => $firebaseUid]);
        if (!$user instanceof Customer) {
            return $this->json(['error' => 'Customer not found.'], 404);
        }

        // Clear Doctrine cache to ensure fresh data
        $this->entityManager->refresh($user);

        return $this->json([
            'success' => true,
            'subscription' => $this->serializeSubscription($user->getSubscription()),
        ]);
    }

    private function activatePlanFromStripe(string $firebaseUid, string $planId): void
    {
        if ($firebaseUid === '') {
            return;
        }

        $plan = self::PLAN_DEFINITIONS[$planId] ?? null;
        if ($plan === null) {
            return;
        }

        $user = $this->userRepository->findOneBy(['firebase_uid' => $firebaseUid]);
        if (!$user instanceof Customer) {
            return;
        }

        $subscription = $user->getSubscription();
        if (!$subscription instanceof Subscription) {
            $subscription = new Subscription();
            $subscription->setOwnerType('USER');
            $subscription->setOwnerId((int) $user->getId());
            $subscription->setCreatedAt(new \DateTimeImmutable());
            $user->setSubscription($subscription);
            $this->entityManager->persist($subscription);
            $this->entityManager->flush();
        }

        $startDate = new \DateTimeImmutable();
        $endDate = $startDate->add(new \DateInterval($plan['duration']));

        $subscription
            ->setPlanType($plan['plan_type'])
            ->setStartDate($startDate)
            ->setEndDate($endDate)
            ->setActive(true)
            ->setAlertsLimit($plan['alerts_limit'])
            ->setFavoritesLimit($plan['favorites_limit'])
            ->setPriceHistoryAccess($plan['price_history_access']);

        $this->entityManager->flush();
    }

    private function getEnv(string $name): ?string
    {
        $value = $_ENV[$name] ?? $_SERVER[$name] ?? getenv($name);

        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }

    private function appendQueryParam(string $url, string $param): string
    {
        return str_contains($url, '?') ? $url . '&' . $param : $url . '?' . $param;
    }

    private function serializeSubscription(?Subscription $subscription): ?array
    {
        if (!$subscription instanceof Subscription) {
            return null;
        }

        return [
            'id' => $subscription->getId(),
            'plan_type' => $subscription->getPlanType(),
            'start_date' => $subscription->getStartDate()?->format(DATE_ATOM),
            'end_date' => $subscription->getEndDate()?->format(DATE_ATOM),
            'active' => $subscription->isActive(),
            'alerts_limit' => $subscription->getAlertsLimit(),
            'favorites_limit' => $subscription->getFavoritesLimit(),
            'price_history_access' => $subscription->getPriceHistoryAccess(),
        ];
    }
}
