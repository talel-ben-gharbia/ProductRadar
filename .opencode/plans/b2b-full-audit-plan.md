# B2B Complete System Fix Plan

## Phase 1: Critical Backend Bugs

### 1.1 Fix `createVerifiedB2bUser()` overwrite — `B2BVerificationController.php:207-210`

**Problem**: Line 210 always calls `createVerifiedB2bUser()` even when `$existingUser` was already found and set as `$approvedUser` at line 181. This overwrites the existing user with a new entity.

**Fix**: Wrap in `wrapInTransaction()`. Only call `createVerifiedB2bUser()` when `$existingUser === null`.

**Edit** — Replace lines 207-246 (from `try {` to `$entityManager->flush();`) with:

```php
            $entityManager->wrapInTransaction(function (EntityManagerInterface $em) use (
                $existingUser, $partnerRequest, $approvedUser, $seller, $payload, $plainPassword, $logger, &$approvedUser, &$subscription, &$firebaseUid
            ) {
                if ($existingUser === null) {
                    $approvedUser = $this->createVerifiedB2bUser($partnerRequest, $em);
                }

                $approvedUser->setIsActive(true);
                $approvedUser->setAccountStatus('ACTIVE');
                $approvedUser->setB2bStatus('APPROVED');
                $approvedUser->setIsVerified(true);
                $approvedUser->setUpdatedAt(new \DateTimeImmutable());

                if (($approvedUser instanceof B2BCompany || $approvedUser instanceof B2BMarket) && $seller !== null) {
                    $approvedUser->setSeller($seller);
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

            // Handle Firebase failure outside transaction (we need to return the JSON response)
            if ($firebaseUid === null) {
                return $this->json([
                    'error' => 'Firebase Error: This email already exists in Firebase Auth but the password does not match. If you are testing, please delete the user from the Firebase Console first.',
                    'firebase_details' => $provisionResult['error'] ?? 'Unknown error',
                ], 502);
            }
```

**Also needed**: Remove the old catch block (lines 247-265) since the transaction now handles rollback. Replace it with a try/catch around the transaction:

```php
            try {
                // ... wrapInTransaction code ...
            } catch (\Throwable $e) {
                $logger->error('Exception during B2B approval flow', ['exception' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
                $appEnv = $_ENV['APP_ENV'] ?? $_SERVER['APP_ENV'] ?? 'prod';
                if (is_string($appEnv) && strtolower($appEnv) === 'dev') {
                    return $this->json(['error' => 'Internal server error during B2B approval.', 'exception' => $e->getMessage(), 'trace' => $e->getTraceAsString()], 500);
                }
                return $this->json(['error' => 'Internal server error during B2B approval.'], 500);
            }
```

### 1.2 Fix Firebase provisioning race — `B2BVerificationController.php:231`

**Already fixed by 1.1**: The `wrapInTransaction` ensures that if Firebase fails, the entire DB operation (user + subscription) is rolled back. No orphan subscriptions.

### 1.3 Add Firebase token verification — `B2BAuthSubscriber.php`

**Problem**: Current auth only validates HMAC of firebaseUid. Anyone who knows the shared secret can impersonate any user.

**Fix**: Add Firebase Admin SDK token verification as a secondary check. Requires:
1. Install `kreait/firebase-php` package
2. Add Firebase service account credentials to `.env`
3. In `B2BAuthSubscriber`, after HMAC check, verify the `Authorization: Bearer <id_token>` header using Firebase SDK
4. Extract UID from verified token and compare with the UID in the URL path

**Implementation detail**: The subscriber should:
```php
// After existing HMAC check passes:
$authHeader = $request->headers->get('Authorization', '');
if (str_starts_with($authHeader, 'Bearer ')) {
    $idToken = substr($authHeader, 7);
    try {
        $verifiedIdToken = $auth->verifyIdToken($idToken);
        $tokenUid = $verifiedIdToken->claims()->get('sub');
        if ($tokenUid !== $firebaseUid) {
            throw new AccessDeniedHttpException('Firebase UID mismatch.');
        }
    } catch (\Throwable $e) {
        throw new AccessDeniedHttpException('Invalid Firebase token.');
    }
}
```

### 1.4 Wire B2BIdentityService into controllers

**Problem**: `B2BIdentityService` exists with explicit `owner_user_id` checks but is never used. All controllers use inline `resolveWorkspaceUser()` which skips this check.

**Fix**: In `B2BWorkspaceController.php`, replace `resolveWorkspaceUser()` calls with `B2BIdentityService::resolveB2BCompanyByOwnership()` (or the market equivalent). This ensures `owner_user_id` is verified.

**Edit** `B2BWorkspaceController.php`:
```php
// Replace:
$user = $this->resolveWorkspaceUser($firebaseUid, $userRepository);
// With:
$user = $this->b2bIdentityService->resolveB2BCompanyByOwnership($firebaseUid);
if (!$user) {
    $user = $this->b2bIdentityService->resolveB2BMarketByOwnership($firebaseUid);
}
```

Inject `B2BIdentityService` via constructor.

### 1.5 Fix B2BAdsQuotaService SQL — `B2BAdsQuotaService.php:36`

**Problem**: SQL uses `company_id` for both company AND market owners. Market users get wrong quota.

**Edit** line 36: Change SQL to use `market_id` when `owner_type` is `MARKET`.

```php
// From:
$sql = 'SELECT COUNT(*) FROM b2b_ads_request WHERE owner_type = :owner_type AND company_id = :owner_id AND created_at >= :since';
// To:
$sql = 'SELECT COUNT(*) FROM b2b_ads_request WHERE owner_type = :owner_type AND created_at >= :since';
$params = ['owner_type' => $ownerType, 'since' => $since->format('Y-m-d H:i:s')];

if ($ownerType === 'COMPANY') {
    $sql .= ' AND company_id = :owner_id';
    $params['owner_id'] = $ownerId;
} elseif ($ownerType === 'MARKET') {
    $sql .= ' AND market_id = :owner_id';
    $params['owner_id'] = $ownerId;
}
```

### 1.6 Fix ads request listing for B2BMarket — `B2BWorkspaceController.php:350`

**Problem**: Criteria is `[]` for market users → fetches ALL ads requests.

**Edit**: Change the criteria to filter by `market` for market-type users.

```php
// From:
$criteria = $user instanceof B2BCompany ? ['company' => $user] : [];
// To:
$criteria = $user instanceof B2BCompany
    ? ['company' => $user]
    : ['market' => $user];
return $this->json($this->paginateArray(
    $entityManager->getRepository(B2BAdsRequest::class)->findBy($criteria, ['created_at' => 'DESC']),
    $limit, $offset
));
```

Also apply same fix to scraping requests listing at the similar location.

---

## Phase 2: Feature Completeness

### 2.1 Watchlist (supervisor-requested)

**Backend**: 3 endpoints already exist (see B2BWorkspaceController lines around `/{firebaseUid}/watchlist`). Verify they work:
- `GET /{uid}/watchlist` — returns list
- `POST /{uid}/watchlist` — add product
- `DELETE /{uid}/watchlist/{id}` — remove

**Frontend**: Build the watchlist page:
- New page: `app/B2B/dashboard/watchlist/page.tsx` (replace placeholder)
- Follow button: Bookmark icon on listing table rows
- Price delta display: Compare `baseline_price` vs current cheapest

### 2.2 Compare listing vs market (supervisor-requested)

**Backend**: Endpoints exist:
- `GET /{uid}/listings/{listingId}/compare` 
- `GET /{uid}/products/{productId}/compare`

**Frontend**: Build comparison page:
- New page: `app/B2B/dashboard/comparison/page.tsx` (upgrade existing placeholder)
- Vendor row highlighted in blue
- All competitor rows sorted by price
- Recommendation header

### 2.3 Intelligence feed

**Backend**: Event hooks in scraping ingestion service:
1. After listing price update → check if vendor undercut → write notification
2. After listing availability change → check OOS → write notification
3. After trust score recalculation → check drop >10 → write notification
4. New competitor listing for vendor product → write notification

**Frontend**: Update dashboard feed section to display notification types with icons and action links.

### 2.4 Market position rank column

**Backend**: Add subquery to listing fetch query in `B2BWorkspaceController.php`:
```sql
SELECT ..., (
    SELECT COUNT(*) + 1 FROM product_listing pl2 
    WHERE pl2.product_id = pl.product_id 
    AND pl2.is_active = true 
    AND pl2.price < pl.price
) AS price_rank,
(
    SELECT COUNT(*) FROM product_listing pl3
    WHERE pl3.product_id = pl.product_id
    AND pl3.is_active = true
) AS total_sellers
FROM product_listing pl WHERE pl.seller_id = :sellerId
```

**Frontend**: Add position badge column to the listings table.

### 2.5 Notification on ads/scraping decisions

**Backend**: In `B2BAdminController.php`, after approve/reject:
```php
// In approveAdsRequest():
$this->notificationService->notifyCompany($company, 'ADS_APPROVED', $message, 'SUCCESS');

// In rejectAdsRequest():
$this->notificationService->notifyCompany($company, 'ADS_REJECTED', $message, 'WARNING');
```

Same for scraping requests.

### 2.6 Real CSV export

**Backend**: `B2BWorkspaceController.php` already has `/{uid}/reports/export/{reportType}` and `/{uid}/listings/export`. Verify they work and stream real data.

---

## Phase 3: UX Polish

### 3.1 Subscription expiry warning
- `B2BSubscriptionExpiryCommand.php` already exists — verify it runs
- Add expiry banner component to dashboard
- Add notification trigger 10 days before expiry

### 3.2 Quota progress bars
- Parse `usage_json` field from B2BCompany/B2BMarket entity
- Render as progress bars on ads/scraping/reports pages

### 3.3 Trust score breakdown display
- Read `trust_score_breakdown` JSON from listing entity
- Render as 5 progress bars with labels and weights

### 3.4 Price history chart per listing
- Reuse B2C `product-price-history-linear-chart.tsx` component
- Add cheapest competitor overlay line

### 3.5 Stronger duplicate URL blocking
- `>95%` similarity → block submission with error message
- `70-95%` → amber warning with confirmation dialog

### 3.6 Renewal/Upgrade request buttons
- Add "Request Renewal" button in settings page (shown when <=30 days to expiry)
- Add "Upgrade to Gold" button on Gold-gated feature screens

---

## Phase 4: Code Quality

### 4.1 Replace `any` types with proper interfaces
- Create `frontend/types/b2b.ts` with interfaces for:
  - `B2BDashboardMetrics`
  - `B2BNotification`
  - `B2BProductListing`  
  - `B2BCompetitorPricing`
  - `B2BStockItem`
  - `B2BAdsRequest`
  - `B2BScrapingRequest`
  - `B2BWatchlistItem`
  - `B2BReport`

### 4.2 Split oversized files
- `dashboard/page.tsx` (899 lines) → Extract sections: KpiCards, IntelligenceFeed, ChartsSection, QuickActions
- `dashboard/listings/page.tsx` (627 lines) → Extract: ListingTable, ListingFilters, ListingActions

### 4.3 Fix listings cache invalidation
- Include filter params in cache key in `B2BWorkspaceController.php`
