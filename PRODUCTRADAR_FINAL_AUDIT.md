# PRODUCTRADAR — FINAL PHYSICAL AUDIT DOCUMENT
## Consolidated Findings, Applied Fixes & Recommendations
**Date:** 2026-05-09
**Audit Scope:** Full application — Backend (Symfony 8/PHP 8.4), Frontend (Next.js 16/React 19/TypeScript), Database (PostgreSQL 18), Infrastructure (Memurai/Redis)

---

## 1. EXECUTIVE SUMMARY

**Product:** ProductRadar — multi-sided product intelligence platform aggregating listings across sellers for B2C consumers, B2B vendors/markets, and administrators.

### Maturity Score: 45/100 → 52/100

| Dimension | Previous Score | Current Score | Delta | Rationale |
|-----------|---------------|---------------|-------|-----------|
| Functionality | 75/100 | 78/100 | +3 | Redis caching layer for 21 controllers; trust score auto-recalc |
| Security | 20/100 | 25/100 | +5 | Export route auth guard; B2B proxy query param forwarding |
| Production Hardening | 30/100 | 32/100 | +2 | Memurai/Redis operational; cache invalidation on writes |
| Scalability | 25/100 | 45/100 | +20 | Caching layer active for 21/29 controllers; 48 cached GET routes |
| Test Coverage | 5/100 | 5/100 | 0 | No change |
| Operational Readiness | 20/100 | 22/100 | +2 | Audit document produced; bug tracking established |

**Overall: 52/100** — Improved from 45/100. Caching infrastructure is the primary maturity uplift. Still not production-ready; critical security gaps remain.

### What Changed in This Session

| Category | Count | Details |
|----------|-------|---------|
| Controllers cached | 21/29 | 48 GET routes wrapped with `cachedGet()` |
| Cache invalidations | 36 write endpoints | `invalidateCache()` on POST/PUT/PATCH/DELETE |
| Frontend services cached | 14/14 service files | `cachedFetch()` on all GET routes |
| Bugs fixed | 3 critical | B2BAdminController 502 (missing EntityManager); Export route no auth; B2B proxy no query params |
| Redis backend | Memurai v1.x | `127.0.0.1:6379`, TTL 300s app data / 3600s Doctrine cache |
| Trust score auto-recalc | ProductListingChangeSubscriber | postPersist + postUpdate for price/availability/is_active changes |

### Critical Risks Still Open

| Risk | Severity | Impact |
|------|----------|--------|
| No Symfony security access_control | CRITICAL | All endpoints open if middleware bypassed |
| Firebase API key in source | CRITICAL | Exposed in git history; compliance issue |
| Admin API key fallback in code | CRITICAL | Hardcoded default if env var missing |
| No B2B backend token verification | HIGH | Firebase UID in URL; any UID can be guessed |
| No rate limiting (except admin login) | HIGH | DDoS vulnerability on public endpoints |
| Webhook signature optional | HIGH | Verification skipped if header missing |
| No CSRF protection | MEDIUM | Stateless API vulnerable to CSRF on state-changing ops |
| No test suite | MEDIUM | Zero test coverage frontend or backend |
| Missing DB indexes | MEDIUM | price_history.recorded_at, notification.is_read, alert.cancelled |

---

## 2. SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 16)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐ │
│  │ B2C Pages │ │ Admin UI │ │ B2B Pages │ │ API Proxy Routes│ │
│  │ /B2C/*   │ │ /admin/* │ │ /B2B/*   │ │ /api/admin/*   │ │
│  └──────────┘ └──────────┘ └──────────┘ └───────┬────────┘ │
│         │                │            │          │          │
│         └────────────────┴────────────┴──────────┘          │
│                          │ HTTP                              │
│                    cachedFetch()                             │
│                          │ (Redis check on server side)      │
├──────────────────────────┼──────────────────────────────────┤
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────┐     │
│  │            BACKEND (Symfony 8 / PHP 8.4)            │     │
│  │  ┌────────────┐ ┌──────────────┐ ┌──────────────┐  │     │
│  │  │Controllers │ │   Services   │ │ Repositories │  │     │
│  │  │(29 files)  │ │(Business     │ │(Data access) │  │     │
│  │  │            │ │  Logic)      │ │              │  │     │
│  │  └─────┬──────┘ └──────────────┘ └──────┬───────┘  │     │
│  │        │ cachedGet()                     │          │     │
│  │        ▼                                 │          │     │
│  │  ┌──────────┐                            │          │     │
│  │  │  Memurai  │◄──────────────────────────┘          │     │
│  │  │ (Redis)   │    Doctrine cache pools              │     │
│  │  │ :6379     │                                      │     │
│  │  └──────────┘                                      │     │
│  │        │                                            │     │
│  │        ▼                                            │     │
│  │  ┌──────────────┐                                   │     │
│  │  │  PostgreSQL   │                                   │     │
│  │  │  (Database)   │                                   │     │
│  │  └──────────────┘                                   │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow (With Caching)

1. **Frontend GET request** → `cachedFetch()` server-side checks Redis for cached response
2. **Cache MISS** → Proxy to backend → `cachedGet()` checks Symfony cache pool (Redis)
3. **Backend cache MISS** → Execute DB query → Store result in Redis (TTL 300s app / 3600s Doctrine) → Return JSON
4. **Backend cache HIT** → Return cached JSON immediately (no DB query)
5. **Frontend cache HIT** → Return cached JSON (no HTTP call)
6. **Write endpoint** → Execute mutation → `invalidateCache()` clears relevant cache keys

### Cache Configuration

| Pool | Purpose | TTL | Adapter |
|------|---------|-----|---------|
| `cache.app` | Symfony default | 300s | Redis |
| `cache.system` | Symfony system | 60s | Redis |
| `general.cache` | App-level (used by CachedResponseTrait) | 300s | Redis |
| `products.cache` | Product data | 300s | Redis |
| `listings.cache` | Listing data | 300s | Redis |
| `doctrine.result_cache_pool` | Doctrine result cache | 3600s | Redis |
| `doctrine.system_cache_pool` | Doctrine metadata/query | 3600s | Redis |

---

## 3. FIXES APPLIED DURING THIS SESSION

### 3.1 Cache Infrastructure (Complete Redis Integration)

**Problem:** Zero caching. Every GET request hit the database. No Doctrine cache configured.

**Solution:**
- Installed Memurai (Redis-compatible Windows service) on `127.0.0.1:6379`
- Installed `predis/predis` (backend) and `ioredis` (frontend)
- Configured `cache.yaml` with unified Redis config across all environments
- Created `CachedResponseTrait` with `cachedGet()` + `invalidateCache()` helpers
- Cached 48 GET routes across 21 controllers
- Added 36 cache invalidations on write endpoints
- Added `cachedFetch()` wrapper to all 14 frontend service files
- Configured Doctrine metadata/query/result cache pools (3600s TTL)

**Files Created/Modified:**
- `backend/config/packages/cache.yaml` (NEW)
- `backend/config/packages/doctrine.yaml` (MODIFIED)
- `backend/src/Controller/CachedResponseTrait.php` (NEW)
- `frontend/lib/redis-cache.ts` (NEW)
- `frontend/lib/fetch-with-cache.ts` (NEW)
- 21 controllers (MODIFIED)
- 14 frontend service files (MODIFIED)

### 3.2 B2BAdminController 502 Error (Trust Score Routes)

**Problem:** `GET /api/b2b/admin/trust-score/weights` and `/api/b2b/admin/trust-score/history` returned HTTP 502. `$this->entityManager->getConnection()` called on null — `EntityManagerInterface` was not injected.

**Solution:** Added `EntityManagerInterface $entityManager` to constructor. Routes now return 200 with valid data.

**Files Modified:**
- `backend/src/Controller/B2BAdminController.php`

### 3.3 Export Route Missing Auth

**Problem:** `GET /api/admin/export/[dataset]` had no admin session verification — any user could export CSV/JSON datasets.

**Solution:** Added admin session cookie verification before serving export. Returns 401 if no valid session.

**Files Modified:**
- `frontend/app/api/admin/export/[dataset]/route.ts`

### 3.4 B2B Workflows Proxy Missing Query Params

**Problem:** `POST/PATCH /api/admin/b2b-workflows/[...path]` dropped all query parameters when proxying to backend. Only GET forwarded params.

**Solution:** Refactored catch-all route to use shared `proxy()` helper that forwards query params on all HTTP methods. Also changed `BACKEND_URL` source to import from `@/utils/admin/constants` instead of inline `process.env.NEXT_PUBLIC_BACKEND_URL`.

**Files Modified:**
- `frontend/app/api/admin/b2b-workflows/[...path]/route.ts`

### 3.5 Frontend TypeScript Fixes

**Problem:** Build errors from:
- Duplicate `resyncAllSubscriptions` function in `subscriptions.ts`
- Missing `parseJson` import in `data-sources.ts`

**Solution:** Removed duplicate function; added missing import.

**Files Modified:**
- `frontend/services/admin/subscriptions.ts`
- `frontend/services/admin/data-sources.ts`

### 3.6 B2B Dashboard Empty-on-Navigate Fix

**Problem:** When navigating to `/B2B/dashboard`, if the server-side summary fetch (5s timeout) failed, `B2BProvider` initialized with `summary = null` and never retried client-side. The dashboard rendered with all metrics at 0/defaults — appearing "empty" with no indication that data should load.

**Root Cause:** `B2BProvider` had `refresh()` available but no `useEffect` to auto-trigger it on mount when `initialSummary` was null. The server layout timeout was too aggressive (5s) for cold starts.

**Solution:**
- Added `useEffect` in `B2BProvider` that calls `refresh()` if `initialSummary` is null and `firebaseUid` is set — ensures client-side retry
- Increased server-side fetch timeout from 5s to 10s in layout
- Added loading spinner to dashboard page when `loading` is true and `summary` is null — gives user feedback during data fetch

**Files Modified:**
- `frontend/components/B2B/b2b-context.tsx`
- `frontend/app/B2B/dashboard/layout.tsx`
- `frontend/app/B2B/dashboard/page.tsx`

### 3.7 Trust Score Auto-Recalculation

**Problem:** Trust scores were only recalculated on listing creation (`postPersist`). Price/availability/is_active changes did not trigger recalculation.

**Solution:** Added `postUpdate` handler to `ProductListingChangeSubscriber`. Checks if price, availability, or is_active fields changed before triggering recalculation. Clears TTL cache on update.

**Files Modified:**
- `backend/src/EventSubscriber/ProductListingChangeSubscriber.php`

---

## 4. CONTROLLER CACHE INVENTORY

### Cached (21 controllers — 48 GET routes)

| Controller | GET Routes Cached | Cache Keys | Invalidation Points |
|------------|------------------|------------|-------------------|
| CategoryController | 2 | `categories.all`, `categories.children.{id}` | Create/update category |
| SellerController | 1 | `sellers.all` | Create/update/delete seller |
| PriceHistoryController | 1 | `price_history.{product}.{listing}` | (Read-only) |
| AlertController | 1 | `alerts.{alerter}.{product}` | Create/update/delete alert |
| FavoriteController | 1 | `favorites.{client}.{listing}` | Create/delete favorite |
| NotificationController | 1 | `notifications.{client}` | Mark read |
| B2CSubscriptionController | 1 | `subscription.{firebaseUid}` | Activate subscription |
| AdminController | 1 | `admins.all` | Create/update/delete admin |
| AdminActivityLogController | 1 | `activity_log.{params}` | (Read-only) |
| B2BWorkspaceController | 15 | summary, health, trust-history, notifications, ads, reports, scraping-requests, watchlist, compare | Create/update/delete on 10 write endpoints |
| B2BAdminController | 8 | reports, subscriptions, ads-requests, scraping-requests, companies, markets, weights, history | Approve/reject on 4 write endpoints |
| B2BVerificationController | 2 | partner-requests, subscription-requests | Approve/reject |
| B2CAuthController | 1 | profile.{firebaseUid} | Update profile |
| DataSourceController | 1 | data-sources.{params} | Create/update data source |
| ManualScrapingController | 1 | category-links.{seller}.{category} | Trigger scraping |
| ReviewController | 4 | reviews list, detail, analytics, auto-moderate | Update/batch-update review |
| ScrapingLogController | 2 | recent, filtered logs | (Read-only) |
| ScrapingLogControllerEnhanced | 2 | filtered-enhanced, health | (Read-only) |
| SubscriptionAdminController | 2 | subscriptions list, detail | Update subscription |
| SystemHealthController | 1 | system.health | (Read-only) |
| UserManagementController | 2 | users stats, paginated users | Update user status |

### Not Cached (8 controllers)

| Controller | Reason | Priority |
|------------|--------|----------|
| ProductController | `getProducts()` uses DB query without cache; `getProduct()` detail | HIGH — most-hit endpoint |
| ProductListingController | Listings queries not cached | HIGH — second most-hit endpoint |
| ProductQualityController | Quality report queries not cached | MEDIUM |
| SubscriptionPaymentController | Payment processing (write-heavy) | LOW |
| ScrapingWebhookController | Webhook ingestion (write-only) | LOW |
| PartnerRequestController | B2B partner request submissions | MEDIUM — GET list could cache |
| B2CAnalyticsController | Analytics queries | LOW |
| AdsRedirectController | Redirect only | LOW |
| AdminAuthController | Login endpoint | LOW — rate-limited already |

**Total cached routes:** 48 backend GET routes + 14 frontend service files with `cachedFetch()`

---

## 5. REMAINING ISSUES

### 5.1 Critical (Must Fix Before Production)

| ID | Issue | Location | Impact | Suggested Fix |
|----|-------|----------|--------|--------------|
| C1 | No Symfony security access_control | `security.yaml` | All endpoints open if Next.js middleware bypassed | Add firewall + access_control rules; use #[IsGranted] |
| C2 | Firebase API key hardcoded | `frontend/app/api/b2c/auth/google/route.ts` | Key exposed in git; compliance risk | Move to env var; rotate key |
| C3 | Admin API key fallback in source | `backend/src/Security/AdminApiKeyGuard.php` | Default key usable if env var missing | Remove fallback; throw if not set |
| C4 | No B2B backend token verification | All B2B controllers | Firebase UID in URL is guessable | Verify Firebase token server-side |
| C5 | No rate limiting on public APIs | All non-admin endpoints | DDoS vulnerability | Add Symfony RateLimiter |

### 5.2 High Priority

| ID | Issue | Location | Impact |
|----|-------|----------|--------|
| H1 | Webhook signature optional | `ScrapingWebhookController` | Verification can be bypassed |
| H2 | No CORS configuration | Backend bundle | API open to cross-origin requests |
| H3 | No CSRF protection | Stateless API | State-changing ops vulnerable |
| H4 | No test suite | Entire codebase | Zero regression protection |
| H5 | Missing DB indexes | price_history, notifications, alerts | Query performance degrades at scale |
| H6 | No structured logging | No Monolog/PHP error handler | Cannot debug production issues |
| H7 | ProductController not cached | Most-hit endpoint | High DB load |
| H8 | ProductListingController not cached | Second most-hit endpoint | High DB load |
| H9 | No background job queue | B2B metrics synchronous | Request timeouts on large datasets |
| H10 | No CI/CD pipeline | No .github/workflows | Manual deployment error-prone |

### 5.3 Medium Priority

| ID | Issue | Impact |
|----|-------|--------|
| M1 | No email sending (Gmail SMTP configured but disconnected) | Alerts/notifications never send |
| M2 | No automatic subscription renewal | No recurring revenue |
| M3 | B2B report generation simulated in frontend | Reports are fake |
| M4 | Missing pagination on some backend list endpoints | OOM on large datasets |
| M5 | ProductController caching not applied | Most visited page always hits DB |
| M6 | PartnerRequestController GET routes not cached | Repeated DB hits on partner list pages |

### 5.4 Low Priority

| ID | Issue | Impact |
|----|-------|--------|
| L1 | No OpenAPI/Swagger docs | Developer onboarding friction |
| L2 | Custom HMAC session (not JWT library) | Edge-case security |
| L3 | No soft deletes on Alert entity | Accidental deletes unrecoverable |
| L4 | PriceHistory.seller is int not FK | Data integrity risk |
| L5 | Missing ON DELETE behavior on FKs | Orphaned records |
| L6 | Admin role enum not validated at DB level | Invalid roles possible |
| L7 | B2B dashboard empty-on-navigate | Intermittent UX bug |

---

## 6. PRIORITIZED ACTION PLAN

### SPRINT 1 (Week 1) — Security & Caching Gaps
1. **[C1]** Implement Symfony security access_control with role-based voters
2. **[C2/C3]** Move Firebase key + admin API key to required env vars
3. **[C4]** Implement Firebase token verification on B2B endpoints
4. **[C7/C8]** Add caching to ProductController and ProductListingController (highest traffic)
5. **[H1]** Make webhook signature verification mandatory
6. **[H2]** Configure CORS bundle with explicit allowed origins

### SPRINT 2 (Week 2) — Hardening & Testing
7. **[C5]** Add rate limiting to all public endpoints
8. **[H3]** Implement CSRF protection on state-changing API calls
9. **[H5]** Add missing DB indexes (migration)
10. **[H4]** Set up PHPUnit + Playwright test suites with CI integration
11. **[H6]** Configure Monolog with structured logging + error tracking (Sentry)

### SPRINT 3 (Week 3) — Async Processing & Features
12. **[H9]** Implement Symfony Messenger for background jobs (B2B metrics, trust score)
13. **[H10]** Set up GitHub Actions CI/CD pipeline
14. **[M1]** Connect email service (Gmail SMTP or SendGrid)
15. **[M2]** Implement subscription renewal webhook handling
16. **[M4]** Add KNP paginator to all backend list endpoints

### SPRINT 4 (Week 4) — Remaining Features & Polish
17. **[M3]** Implement real B2B report generation backend
18. **[M6]** Cache PartnerRequestController GET routes
19. **[L1]** Add OpenAPI/Swagger documentation
20. **[L3]** Add soft deletes where missing (Alert entity)

---

## 7. FILE INVENTORY (Key Files)

### Backend (Symfony)

| File | Purpose |
|------|---------|
| `src/Controller/CachedResponseTrait.php` | Reusable `cachedGet()` + `invalidateCache()` |
| `src/Controller/CategoryController.php` | Category CRUD (cached) |
| `src/Controller/SellerController.php` | Seller CRUD (cached) |
| `src/Controller/ProductController.php` | **NOT CACHED** — highest priority |
| `src/Controller/ProductListingController.php` | **NOT CACHED** — second priority |
| `src/Controller/PriceHistoryController.php` | Price history queries (cached) |
| `src/Controller/AlertController.php` | Alert CRUD (cached) |
| `src/Controller/FavoriteController.php` | Favorites CRUD (cached) |
| `src/Controller/NotificationController.php` | Notifications (cached) |
| `src/Controller/ReviewController.php` | Review moderation (cached) |
| `src/Controller/AdminController.php` | Admin management (cached) |
| `src/Controller/AdminActivityLogController.php` | Activity log (cached) |
| `src/Controller/B2CAuthController.php` | B2C auth + profile (cached) |
| `src/Controller/B2CSubscriptionController.php` | Subscription management (cached) |
| `src/Controller/B2BAdminController.php` | B2B admin workflows (cached, EntityManager fix applied) |
| `src/Controller/B2BVerificationController.php` | B2B partner verification (cached) |
| `src/Controller/B2BWorkspaceController.php` | B2B dashboard (cached, 15 GET routes) |
| `src/Controller/DataSourceController.php` | Data source management (cached) |
| `src/Controller/ManualScrapingController.php` | Manual scraping triggers (cached) |
| `src/Controller/ScrapingLogController.php` | Scraping logs (cached) |
| `src/Controller/ScrapingLogControllerEnhanced.php` | Enhanced scraping logs (cached) |
| `src/Controller/SubscriptionAdminController.php` | Admin subscription management (cached) |
| `src/Controller/SystemHealthController.php` | System health endpoint (cached) |
| `src/Controller/UserManagementController.php` | User management (cached) |
| `src/EventSubscriber/ProductListingChangeSubscriber.php` | Trust score auto-recalc (postPersist + postUpdate) |
| `src/Service/TrustScoreCalculationService.php` | Trust score calculation engine |
| `config/packages/cache.yaml` | **NEW** — Unified Redis cache config |
| `config/packages/doctrine.yaml` | **MODIFIED** — Doctrine cache pools |

### Frontend (Next.js)

| File | Purpose |
|------|---------|
| `lib/redis-cache.ts` | **NEW** — ioredis client with graceful fallback + dynamic import |
| `lib/fetch-with-cache.ts` | **NEW** — cachedFetch wrapper with server-side Redis check |
| `app/api/admin/b2b-workflows/[...path]/route.ts` | **FIXED** — query param forwarding on all methods |
| `app/api/admin/export/[dataset]/route.ts` | **FIXED** — admin session auth check added |
| `services/admin/products.ts` | cachedFetch on GET |
| `services/admin/categories.ts` | cachedFetch on GET |
| `services/admin/sellers.ts` | cachedFetch on GET |
| `services/admin/product-listings.ts` | cachedFetch on GET |
| `services/admin/price-history.ts` | cachedFetch on GET |
| `services/admin/users.ts` | cachedFetch on GET |
| `services/admin/subscriptions.ts` | cachedFetch on GET (duplicate function removed) |
| `services/admin/reviews.ts` | cachedFetch on GET |
| `services/admin/enhanced-reviews.ts` | cachedFetch on GET |
| `services/admin/scraping-logs.ts` | cachedFetch on GET |
| `services/admin/data-sources.ts` | cachedFetch on GET (parseJson import fixed) |
| `services/admin/admins.ts` | cachedFetch on GET |
| `services/admin/best-time-to-buy.ts` | cachedFetch on GET |

### Infrastructure

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Redis service defined with REDIS_URL |
| `docker-compose.server.yml` | Production Redis config |

---

## 8. DATABASE INVENTORY

### Tables

| Table | Rows (approx) | Key Columns | Issues |
|-------|--------------|-------------|--------|
| product | N/A | id, name, brand, category_id (FK), description, specs (JSON), image | No unique constraint on reference |
| category | N/A | id, name, parent_id (self-FK) | No depth denormalization |
| seller | N/A | id, name, website, reputation_score | No range constraint (0-10) |
| product_listing | N/A | id, product_id (FK), seller_id (FK), price, availability, is_active | — |
| price_history | N/A | id, listing_id (FK), price, recorded_at, out_of_stock, is_anomaly | seller is INT not FK; no recorded_at index |
| alert | N/A | id, alerter_id (FK), product_id (FK), is_price_notif, is_stock_notif | No cancelled index; no soft delete |
| notification | N/A | id, client_id (FK), type, message, is_read | No is_read index |
| review | N/A | id, listing_id (FK), rating, content, status | Rating not CHECK-constrained (1-5) |
| b2b_company | N/A | id, user_id (FK), name, country, website | — |
| b2b_market | N/A | id, user_id (FK), name, country | — |
| trust_score_weight | 11 | category, weight, label | Configured |
| trust_score_history | 21,943 | listing_id, score, breakdown (JSON), calculated_at | Large table, needs index |
| admin | N/A | id, email, password (Argon2id), role | Role not enum-validated |
| admin_activity_log | N/A | admin_id, action, entity_type, entity_id, before/after (JSON), ip | — |
| scraping_log | N/A | source, workflow, status, duration, records_processed, error | — |
| data_source | N/A | name, base_url, type, is_active, last_sync | — |
| ads_request | N/A | type, budget, duration, status, campaign_id (FK) | — |
| scraping_request | N/A | url, type, status, is_duplicate | — |
| report | N/A | type, status, file_path | — |

### Missing Indexes

| Table | Missing Index | Impact |
|-------|--------------|--------|
| price_history | recorded_at | Slow date-range queries |
| notification | is_read | Slow unread-count queries |
| alert | cancelled | Slow active-alert queries |
| trust_score_history | listing_id, calculated_at | Slow history lookups |

---

## 9. FRONTEND ROUTE INVENTORY

### B2C Routes

| Route | Type | Auth | Cached |
|-------|------|------|--------|
| /B2C/products | Public search/list | None | No (DB hit) |
| /B2C/products/[id] | Product detail | None | No (DB hit) |
| /B2C/alerts | User alerts | B2C session | No |
| /B2C/profile | User profile | B2C session | No |
| /B2C | Landing/redirect | None | N/A |

### Admin Routes

| Route | Type | Auth | Cached |
|-------|------|------|--------|
| /admin | Dashboard | Admin session | No |
| /admin/products | Product CRUD | Admin session | Frontend cachedFetch |
| /admin/categories | Category CRUD | Admin session | Frontend cachedFetch |
| /admin/sellers | Seller CRUD | Admin session | Frontend cachedFetch |
| /admin/product-listings | Listing CRUD | Admin session | Frontend cachedFetch |
| /admin/product-listings/new | Create listing | Admin session | N/A |
| /admin/quality-control | Data quality | Admin session | No |
| /admin/duplicates | Duplicate detection | Admin session | No |
| /admin/system-health | System health | Admin session | Backend cached |
| /admin/activity-log | Admin audit log | Admin session | Backend cached |
| /admin/export | Data export | Admin session | No |
| /admin/bulk-operations | Bulk ops menu | Admin session | N/A |
| /admin/reviews | Review moderation | Admin session | Backend cached |
| /admin/scraping-logs | Scraping logs | Admin session | Backend cached |
| /admin/data-sources | Data sources | Admin session (super) | Backend cached |
| /admin/admins | Admin management | Admin session (super) | Backend cached |
| /admin/users | User management | Admin session | Backend cached |
| /admin/subscriptions | Subscriptions | Admin session | Backend cached |
| /admin/b2b-workflows | B2B admin workflows | Admin session | Backend cached |

### B2B Routes

| Route | Type | Auth | Cached |
|-------|------|------|--------|
| /B2B | Dashboard | B2B session | Backend cached (summary) |
| /B2B/listings | My listings | B2B session | No |
| /B2B/analytics/* | Analytics pages | B2B session (Gold) | Backend cached |
| /B2B/ads | Ads requests | B2B session | Backend cached |
| /B2B/scraping | Scraping requests | B2B session | Backend cached |
| /B2B/reports | Reports | B2B session | Backend cached |
| /B2B/alerts | Notifications | B2B session | Backend cached |
| /B2B/settings | Company settings | B2B session | No |
| /B2B/partner | Onboarding | None | No |

---

## 10. API ENDPOINT INVENTORY

### Public Endpoints (No Auth)

| Method | Path | Backend File | Cached |
|--------|------|-------------|--------|
| GET | /api/products | ProductController | **NO** |
| GET | /api/products/{id} | ProductController | **NO** |
| GET | /api/products/{id}/price-history | PriceHistoryController | YES |
| GET | /api/categories | CategoryController | YES |
| GET | /api/categories/{id}/children | CategoryController | YES |
| GET | /api/sellers | SellerController | YES |

### Admin Endpoints (API Key)

| Method | Path | Backend File | Cached |
|--------|------|-------------|--------|
| POST | /admin/api/login | AdminAuthController | N/A |
| GET | /api/admin/admins | AdminController | YES |
| GET | /api/admin/admins/{id} | AdminController | YES |
| POST | /api/admin/admins | AdminController | N/A |
| PATCH | /api/admin/admins/{id}/role | AdminController | N/A |
| DELETE | /api/admin/admins/{id} | AdminController | N/A |
| GET | /api/admin/activity-log | AdminActivityLogController | YES |
| GET | /api/admin/users/stats | UserManagementController | YES |
| GET | /api/admin/users | UserManagementController | YES |
| PATCH | /api/admin/users/{id}/status | UserManagementController | N/A |
| GET | /api/admin/reviews | ReviewController | YES |
| GET | /api/admin/reviews/{id} | ReviewController | YES |
| PATCH | /api/admin/reviews/{id}/status | ReviewController | N/A |
| POST | /api/admin/reviews/batch-status | ReviewController | N/A |
| GET | /api/admin/reviews/analytics | ReviewController | YES |
| GET | /api/admin/reviews/{id}/auto-moderate | ReviewController | YES |
| GET | /api/admin/subscriptions | SubscriptionAdminController | YES |
| GET | /api/admin/subscriptions/{id} | SubscriptionAdminController | YES |
| POST | /api/admin/subscriptions | SubscriptionAdminController | N/A |
| GET | /api/admin/scraping-logs | ScrapingLogController | YES |
| GET | /api/admin/scraping-logs/recent | ScrapingLogController | YES |
| GET | /api/admin/scraping-logs/filtered | ScrapingLogControllerEnhanced | YES |
| GET | /api/admin/scraping-logs/health | ScrapingLogControllerEnhanced | YES |
| GET | /api/admin/data-sources | DataSourceController | YES |
| POST | /api/admin/data-sources | DataSourceController | N/A |
| GET | /api/admin/system/health | SystemHealthController | YES |
| GET | /api/admin/export/{dataset} | frontend proxy | N/A |
| GET | /api/admin/b2b-workflows/... | frontend proxy (FIXED) | YES |

### B2C Endpoints (Firebase UID)

| Method | Path | Backend File | Cached |
|--------|------|-------------|--------|
| POST | /api/b2c/auth/google | B2CAuthController | N/A |
| GET | /api/b2c/profile | B2CAuthController | YES |
| PUT | /api/b2c/profile | B2CAuthController | N/A |
| GET | /api/b2c/favorites | FavoriteController | YES |
| POST | /api/b2c/favorites | FavoriteController | N/A |
| DELETE | /api/b2c/favorites/{id} | FavoriteController | N/A |
| GET | /api/b2c/alerts | AlertController | YES |
| POST | /api/b2c/alerts | AlertController | N/A |
| PUT | /api/b2c/alerts/{id} | AlertController | N/A |
| DELETE | /api/b2c/alerts/{id} | AlertController | N/A |
| GET | /api/b2c/notifications | NotificationController | YES |
| PATCH | /api/b2c/notifications/{id}/read | NotificationController | N/A |
| GET | /api/b2c/subscription | B2CSubscriptionController | YES |
| POST | /api/b2c/subscription/activate | B2CSubscriptionController | N/A |

### B2B Endpoints (Firebase UID)

| Method | Path | Backend File | Cached |
|--------|------|-------------|--------|
| GET | /api/b2b/workspace/summary | B2BWorkspaceController | YES |
| GET | /api/b2b/workspace/listings | B2BWorkspaceController | YES |
| GET | /api/b2b/workspace/health | B2BWorkspaceController | YES |
| GET | /api/b2b/workspace/trust-score-history | B2BWorkspaceController | YES |
| GET | /api/b2b/workspace/notifications | B2BWorkspaceController | YES |
| POST | /api/b2b/workspace/notifications/read | B2BWorkspaceController | N/A |
| GET | /api/b2b/workspace/ads | B2BWorkspaceController | YES |
| POST | /api/b2b/workspace/ads | B2BWorkspaceController | N/A |
| GET | /api/b2b/workspace/reports | B2BWorkspaceController | YES |
| POST | /api/b2b/workspace/reports | B2BWorkspaceController | N/A |
| GET | /api/b2b/workspace/scraping-requests | B2BWorkspaceController | YES |
| POST | /api/b2b/workspace/scraping-requests | B2BWorkspaceController | N/A |
| GET | /api/b2b/workspace/watchlist | B2BWorkspaceController | YES |
| POST | /api/b2b/workspace/watchlist | B2BWorkspaceController | N/A |
| DELETE | /api/b2b/workspace/watchlist/{id} | B2BWorkspaceController | N/A |
| GET | /api/b2b/workspace/watchlist/search | B2BWorkspaceController | YES |
| GET | /api/b2b/workspace/compare/listing/{id} | B2BWorkspaceController | YES |
| GET | /api/b2b/workspace/compare/product/{id} | B2BWorkspaceController | YES |

---

## 11. KEY ARCHITECTURAL DECISIONS

| Decision | Rationale | Status |
|----------|-----------|--------|
| Memurai (not Docker Redis) on dev | Windows Docker has path issues; Memurai runs as native Windows service | LIVE |
| predis/predis (not phpredis) | Pure PHP, no native extension needed on Windows | LIVE |
| ioredis with dynamic import | Prevents Node.js built-ins bundling into browser JS | LIVE |
| Single cache.yaml for all envs | Memurai on dev, Redis on prod; no split logic needed | LIVE |
| CachedResponseTrait | Reduces boilerplate across 21 controllers | LIVE |
| 300s TTL for app data | Balances freshness with cache hit rate | LIVE |
| 3600s TTL for Doctrine cache | Metadata/query cache rarely changes | LIVE |
| Invalidate entire pool on writes | Simple; avoids complex key tracking | LIVE |
| Proxy pattern for B2B admin routes | Next.js API routes forward to Symfony backend | FIXED (was dropping params) |
| Admin auth via headers (X-Admin-Api-Key, etc.) | Stateless, simple, but relies on client not spoofing | RISKY — needs encryption |

---

## 12. APPENDIX: CURRENT ENVIRONMENT

| Service | Status | Connection |
|---------|--------|------------|
| Memurai (Redis) | RUNNING | `127.0.0.1:6379` — PONG |
| PHP dev server | RUNNING | `0.0.0.0:8000` (via `php -S`, not Symfony CLI) |
| PostgreSQL | Not directly queried | Via Symfony console (`dbal:run-sql`) |
| Frontend dev | NOT STARTED | Needs `npm run dev` |
| Docker | Not used locally | `docker-compose.yml` exists for production |

### Verified Working
- Redis PING/PONG
- `categories.all` key in Memurai with TTL ~245s
- All 48 cached GET routes return HTTP 200 (with auth headers)
- B2BAdminController trust-score routes return HTTP 200 (weights: 11 items, history: 5 items)
- Doctrine metadata cache stored in Redis
- Frontend TypeScript compiles without errors
- Backend PHP files pass lint

---

*This document supersedes PRODUCT_RADAR_FULL_AUDIT.md, PRODUCTRADAR_AUDIT_REPORT.md, and PRODUCT_BACKLOG_AUDIT.md. Generated 2026-05-09 based on live codebase inspection.*
