# ProductRdar - Complete Product Backlog & Audit
**Generated:** April 6, 2026  
**Project:** ProductRdar - Economic Intelligence Platform (Tunisia)  
**Current Phase:** MVP Phase 1-2 (Months 1-6)

---

## 📊 EXECUTIVE SUMMARY

### Current State (As of April 2026)
- **Overall Completion:** ~60% of MVP features complete
- **Tech Stack:** Symfony 8 + Next.js 16 + PostgreSQL 18 + Firebase
- **Users:** Admin + B2C consumers + B2B (coming)
- **Data:** 9 entities, 12 database migrations (Mar-Apr 2026), 19 API routes
- **Performance:** Auth + basic CRUD operational, optimization needed for scale

### Critical Path Status
| Phase | Target | Status | Blockers |
|-------|--------|--------|----------|
| **Phase 1 - MVP** | Months 1-3 | 🟡 70% Complete | Security hardening, Performance tuning |
| **Phase 2 - Consolidation** | Months 4-6 | 🔴 10% Started | Reviews/anti-fake (partial), B2B dashboard (blank) |
| **Phase 3 - Intelligence** | Month 6+ | ❌ 0% | Requires Phase 2 completion, ML infrastructure |

### Risk Summary
- 🔴 **CRITICAL:** Backend authorization not enforced (all endpoints open if bypassing Next.js middleware)
- 🔴 **CRITICAL:** Firebase key exposed in source code (security/compliance issue)
- 🟡 **HIGH:** Database integrity (price_history.seller as int, not FK to Seller)
- 🟡 **HIGH:** No test suite (0 test files), no CI/CD pipeline
- 🟡 **HIGH:** Pagination missing on list endpoints (will fail at scale)

---

## 1️⃣ FEATURE INVENTORY BY MODULE

### 1.1 B2C CUSTOMER PORTAL (60% Complete)

#### ✅ COMPLETED FEATURES

**Authentication & Session**
- Firebase Google Sign-In integration ([frontend/app/api/b2c/auth/google/route.ts](frontend/app/api/b2c/auth/google/route.ts))
  - Token verification → customer upsert in DB
  - httpOnly session cookie (8hr TTL)
  - Auto-refresh on expiry
  - Full page reload on login for session sync
- Logout with session clearing

**Product Browsing**
- Search page ([frontend/app/B2C/products/page.tsx](frontend/app/B2C/products/page.tsx))
  - Search by product name/brand/ID
  - Filter by category
  - Filter by price range
  - Display product cards with images
  - Add shopping bag icon to "Voir les offres" button
- Product detail page ([frontend/app/B2C/products/[id]/page.tsx](frontend/app/B2C/products/[id]/page.tsx))
  - Product image + specs
  - Multi-site pricing table
  - Price history chart with recharts (line + spike markers for out-of-stock)
  - Trust score display (basic)
  - Seller links (CTAs to external sites)
- Shared B2C navbar ([frontend/components/B2C/b2c-navbar.tsx](frontend/components/B2C/b2c-navbar.tsx))
  - Title links to landing page
  - Back button (optional)
  - Alerts button with BellRing icon
  - Become a Partner button → /B2B
  - Auth dropdown with User + LogOut icons

**Price Alerts**
- Alert listing page ([frontend/app/B2C/alerts/page.tsx](frontend/app/B2C/alerts/page.tsx))
  - View user's active alerts
  - Edit alert thresholds
  - Delete alerts
  - Backend API: GET/POST/PUT/DELETE /api/b2c/alerts
- Alert creation embedded in product page (partial - form exists, needs UX refinement)

**User Profile**
- Profile page ([frontend/app/B2C/profile/page.tsx](frontend/app/B2C/profile/page.tsx))
  - View profile (email, name, location)
  - Edit profile
  - Backend API: GET/PUT /api/b2c/profile
  - Shared navbar with back button

#### 🟡 PARTIAL/INCOMPLETE FEATURES

**Price Alerts**
- Modal/dialog for alert creation (exists in [frontend/components/B2C/b2c-auth-dialog.tsx](frontend/app/B2C/alerts/page.tsx) but needs dedicated component)
  - Needs: Threshold input validation
  - Needs: Email verification flow
  - Needs: Confirmation UI
- Backend alert trigger system (exists but not tested)
  - Daily cron not verified
  - Email sending not configured

**Recommendations/Favorites** → ❌ NOT IMPLEMENTED
- Bookmark products
- Save searches
- Wishlist functionality

**Social/Reviews on B2C** → ❌ NOT IMPLEMENTED
- User reviews for products
- Sentiment display
- Helpful votes

#### 📋 PLANNED (Phase 2)

- Advanced filter UI (brand, specs, color, size)
- Saved searches / wishlist
- Price notification (SMS + email templates)
- Social features (reviews, ratings, helpful votes)
- Export comparable products to PDF
- Competitor price tracking

---

### 1.2 ADMIN DASHBOARD (70% Complete)

#### ✅ COMPLETED FEATURES

**Admin Authentication**
- Email/password login ([frontend/app/api/admin/auth/login/route.ts](frontend/app/api/admin/auth/login/route.ts))
  - Rate limiting: 5 attempts, 300s lockout
  - HMAC-SHA256 signed JWT (8hr TTL)
  - httpOnly session cookie
  - CSRF token validation
- Admin logout
- Protected routes via middleware ([frontend/middleware.ts](frontend/middleware.ts))

**Admin Dashboard Home**
- Stats: Total products, listings, alerts, active sellers
- Quick action buttons

**Products Management** ([frontend/app/admin/products/page.tsx](frontend/app/admin/products/page.tsx))
- List all products (table view with pagination UI)
- Search by name
- Filter by category
- Add new product (form)
- Edit existing product (form)
- Delete product (with confirmation)
- Bulk actions (skeleton only - needs implementation)
- Backend API: GET/POST/PUT/DELETE /api/products

**Categories Management** ([frontend/app/admin/categories/page.tsx](frontend/app/admin/categories/page.tsx))
- Hierarchical category tree (parent/child)
- Add new category
- Edit category
- Delete category
- Drag-to-reorder (planned)
- Backend API: GET/POST /api/categories

**Sellers Management** ([frontend/app/admin/sellers/page.tsx](frontend/app/admin/sellers/page.tsx))
- List sellers with scores
- View seller details
- Edit seller reputation score
- Backend API: GET /api/sellers (no write endpoints yet)

**Product Listings Management** ([frontend/app/admin/product-listings/page.tsx](frontend/app/admin/product-listings/page.tsx))
- List all product-seller combinations
- Filter by product/seller
- Add new listing (form)
- Edit listing (price, stock, availability)
- Toggle active status
- Batch edit availability
- Backend API: GET/POST/PUT/PATCH /api/product-listings

**System Health** ([frontend/app/admin/system-health/page.tsx](frontend/app/admin/system-health/page.tsx))
- Database connection status
- API uptime
- Cache status (Redis)
- Last data refresh timestamp
- Error rate in last 24h

**Quality Control** ([frontend/app/admin/quality-control/page.tsx](frontend/app/admin/quality-control/page.tsx))
- Missing fields report
  - Products without images
  - Products without brand
  - Listings with null prices
- Data validation summary
- Actions: Bulk edit, delete invalid entries

**Duplicate Detection** ([frontend/app/admin/duplicates/page.tsx](frontend/app/admin/duplicates/page.tsx))
- Find duplicate products algorithm
  - 100% match: Same name, brand, category
  - Fuzzy match: 85% name+description+brand match
- Merge duplicates UI (partial - UI ready, merge logic needs backend integration)
- Batch operations

**Data Export** ([frontend/app/admin/export/page.tsx](frontend/app/admin/export/page.tsx))
- Export products: CSV, JSON
- Export listings: CSV, JSON
- Export price history: CSV
- Date range filter
- Backend API: GET /api/admin/export/{dataset}

**Activity Log** ([frontend/app/admin/activity-log/page.tsx](frontend/app/admin/activity-log/page.tsx))
- ⚠️ Currently just a snapshot of admin list (not event-based)
- Needs implementation: Real audit trail (who did what, when)

**Bulk Operations** ([frontend/app/admin/bulk-operations/page.tsx](frontend/app/admin/bulk-operations/page.tsx))
- ⚠️ Currently menu launcher only
- Needs implementation: Actual batch processing engine
- Planned operations:
  - Bulk price update
  - Bulk stock adjustment
  - Bulk category assignment
  - Bulk seller assignment

#### 🟡 PARTIAL/INCOMPLETE FEATURES

**Admin Management** (super-admin only)
- [SKELETON] List admins with roles
- [SKELETON] Add new admin
- [SKELETON] Edit admin role
- [NOT IMPLEMENTED] Delete admin (with last-super-admin protection)
- Backend API draft: GET/POST/PATCH/DELETE /api/admin/admins

**Bulk Operations** → Menu-only interface, no backend processing
- Needs: Job queue (Symfony Messenger)
- Needs: Progress tracking
- Needs: Batch validation

**Activity Log** → Not a real event audit trail
- Current: Just displays admin list
- Needs: Event table with timestamp, user, action, resource, change_delta

#### 📋 PLANNED (Phase 2)

- User management (edit permissions, deactivate, roles)
- Bulk import (CSV upload for products/sellers)
- Price override policies
- Seller reputation management (reviews, verification status)
- System alerts (price anomalies, data inconsistencies)
- Reports builder (custom dashboards)
- Integration logs (scraper status, third-party API usage)

---

### 1.3 B2B DASHBOARD (0% Complete - Placeholder Only)

#### ❌ NOT STARTED

- [Folder exists] [frontend/app/B2B](frontend/app/B2B) - empty
- [Folder exists] [frontend/components/B2B](frontend/components/B2B) - empty

#### 📋 PLANNED (Phase 2, Week 15-16)

**Competitive Intelligence**
- Table: Competitors vs our products
- Price positioning analysis
- Stock volume trends
- Export competitive reports (PDF/CSV)

**Sector Overview**
- Market statistics (avg price, variance, top sellers)
- Category heatmap (which sell well)
- Seasonal trends

**My Products Analysis**
- Our products vs competitors
- Price positioning
- Stock vs demand alignment

**API Endpoints** (Backend ready)
- GET /api/b2b/competitive-intelligence
- GET /api/b2b/sector-overview
- GET /api/b2b/my-products-analysis
- GET /api/b2b/export/{format}

---

## 2️⃣ BACKEND API ENDPOINTS (Complete Inventory)

### 2.1 Authentication APIs

#### Admin Authentication
```
POST /admin/api/login
├─ Request: {email, password}
├─ Response: {token, expiresAt}
├─ Rate Limit: 5 attempts / 300s lockout
├─ File: [backend/src/Controller/AdminAuthController.php](backend/src/Controller/AdminAuthController.php)
└─ Status: ✅ Complete
```

#### B2C Authentication
```
POST /api/b2c/auth/google
├─ Request: {idToken}
├─ Response: {customer, session}
├─ Logic: Firebase verification → customer upsert/create
├─ File: [backend/src/Controller/B2CAuthController.php](backend/src/Controller/B2CAuthController.php)
└─ Status: ✅ Complete, 🚨 Security Issue (hardcoded Firebase key)
```

```
POST /api/b2c/auth/logout
├─ Logic: Session invalidation
└─ Status: ✅ Complete
```

### 2.2 Product APIs

#### List Products
```
GET /api/products
├─ Query: ?category={id}&minPrice=100&maxPrice=5000&page=1&limit=20
├─ Response: [{id, name, brand, image, specs}]
├─ Auth: Public (read)
├─ File: [backend/src/Controller/ProductController.php](backend/src/Controller/ProductController.php)
├─ Performance: 🟡 Pagination missing at backend (frontend only)
└─ Status: ✅ Complete, needs pagination
```

#### Get Product Detail
```
GET /api/products/{id}
├─ Response: {id, name, brand, category, image, listings}
├─ Auth: Public
├─ File: ProductController.php
└─ Status: ✅ Complete
```

#### Get Product Price History
```
GET /api/products/{id}/price-history
├─ Query: ?startDate=2026-01-01&endDate=2026-04-06
├─ Response: [{date, price, seller_id, availability}]
├─ Auth: Public
├─ File: [backend/src/Controller/PriceHistoryController.php](backend/src/Controller/PriceHistoryController.php)
└─ Status: ✅ Complete
```

#### Create Product (Admin)
```
POST /api/products
├─ Request: {name, brand, category_id, image}
├─ Auth: Super Admin (checked via Next.js middleware, NOT enforced at Symfony level ⚠️)
├─ File: ProductController.php
└─ Status: ✅ Complete, Authorization Gap
```

#### Update Product (Admin)
```
PUT /api/products/{id}
├─ Auth: Super Admin ⚠️ Gap: No backend enforcement
└─ Status: ✅ Complete
```

#### Delete Product (Admin)
```
DELETE /api/products/{id}
├─ Auth: Super Admin ⚠️ Gap
└─ Status: ✅ Complete
```

### 2.3 Category APIs

#### List Categories
```
GET /api/categories
├─ Response: [{id, name, parent_id, children}]
├─ Auth: Public
├─ File: [backend/src/Controller/CategoryController.php](backend/src/Controller/CategoryController.php)
├─ Feature: Hierarchical tree support
└─ Status: ✅ Complete
```

#### Get Category Children
```
GET /api/categories/{id}/children
├─ Response: Nested children array
├─ Auth: Public
└─ Status: ✅ Complete
```

#### Create Category (Admin)
```
POST /api/categories
├─ Request: {name, parent_id}
├─ Auth: Super Admin ⚠️ Gap
└─ Status: ✅ Complete
```

#### Update/Delete Category
```
PUT /api/categories/{id}
DELETE /api/categories/{id}
├─ Auth: Super Admin ⚠️ Gap
└─ Status: ✅ Complete
```

### 2.4 Product Listings APIs

#### List Listings
```
GET /api/product-listings
├─ Query: ?product_id={id}&seller_id={id}&page=1&limit=20
├─ Response: [{id, product_id, seller_id, price, stock, url, availability}]
├─ Auth: Public
├─ File: [backend/src/Controller/ProductListingController.php](backend/src/Controller/ProductListingController.php)
├─ Performance: 🟡 Pagination UI only, not at API
└─ Status: ✅ Complete
```

#### Get Listing Detail
```
GET /api/product-listings/{id}
├─ Response: Full listing with seller details
├─ Auth: Public
└─ Status: ✅ Complete
```

#### Create Listing (Admin)
```
POST /api/product-listings
├─ Request: {product_id, seller_id, price, stock, url}
├─ Auth: Super Admin ⚠️ Gap
├─ File: ProductListingController.php
└─ Status: ✅ Complete
```

#### Update Listing (Admin)
```
PUT /api/product-listings/{id}
├─ Request: {price, stock, url}
├─ Auth: Super Admin ⚠️ Gap
└─ Status: ✅ Complete
```

#### Toggle Active Status
```
PATCH /api/product-listings/{id}/activate
PATCH /api/product-listings/{id}/deactivate
├─ Auth: Super Admin ⚠️ Gap
└─ Status: ✅ Complete
```

#### Update Availability
```
PATCH /api/product-listings/{id}/availability
├─ Request: {availability}
├─ Auth: Super Admin ⚠️ Gap
└─ Status: ✅ Complete
```

### 2.5 Seller APIs

#### List Sellers
```
GET /api/sellers
├─ Response: [{id, name, website, reputation_score, listings_count}]
├─ Auth: Public
├─ File: [backend/src/Controller/SellerController.php](backend/src/Controller/SellerController.php)
├─ Performance: 🟡 No pagination
└─ Status: ✅ Complete
```

#### Get Seller Detail
```
GET /api/sellers/{id}
├─ Response: {id, name, listing_count, avg_price, reputations_score}
├─ Auth: Public
├─ File: SellerController.php
└─ Status: ✅ Complete
```

#### Create/Update Seller (Admin)
```
POST /api/sellers
PUT /api/sellers/{id}
├─ Auth: Super Admin ⚠️ Gap
├─ Note: Not yet exposed via backend endpoint
└─ Status: 🟡 Partial
```

### 2.6 Alert APIs (B2C)

#### List User Alerts
```
GET /api/b2c/alerts
├─ Auth: B2C Session (customer only)
├─ Response: [{id, product_id, alert_type, threshold, created_at, active}]
├─ File: [backend/src/Controller/AlertController.php](backend/src/Controller/AlertController.php)
└─ Status: ✅ Complete, enforces alerter_id == logged_in_user_id
```

#### Create Alert
```
POST /api/b2c/alerts
├─ Request: {product_id, alert_type(price_drop|restock), threshold}
├─ Auth: B2C Session
├─ File: AlertController.php
├─ Logic: Associates alert with logged-in customer
└─ Status: ✅ Complete
```

#### Update Alert
```
PUT /api/b2c/alerts/{id}
├─ Request: {threshold, alert_type}
├─ Auth: B2C Session, Owner check (alerter_id)
├─ File: AlertController.php
└─ Status: ✅ Complete
```

#### Delete Alert
```
DELETE /api/b2c/alerts/{id}
├─ Auth: B2C Session, Owner check
├─ File: AlertController.php
└─ Status: ✅ Complete
```

### 2.7 Admin User Management APIs (Admin Only)

#### List Admins
```
GET /api/admin/admins
├─ Query: ?page=1&limit=20
├─ Response: [{id, email, role(admin|super_admin), created_at}]
├─ Auth: Super Admin (checked via middleware, NOT at Symfony)
├─ File: [backend/src/Controller/AdminController.php](backend/src/Controller/AdminController.php)
├─ Performance: 🟡 No pagination at backend
└─ Status: ✅ Complete
```

#### Get Admin Detail
```
GET /api/admin/admins/{id}
├─ Response: {id, email, role, created_at}
├─ Auth: Super Admin ⚠️ Gap
└─ Status: ✅ Complete
```

#### Create Admin
```
POST /api/admin/admins
├─ Request: {email, password, role}
├─ Auth: Super Admin ⚠️ Gap
├─ File: AdminController.php
├─ Feature: Default password generation (security consideration)
└─ Status: ✅ Complete
```

#### Update Admin Role
```
PATCH /api/admin/admins/{id}/role
├─ Request: {role}
├─ Auth: Super Admin ⚠️ Gap
├─ Protection: Cannot demote last super-admin
└─ Status: ✅ Complete
```

#### Delete Admin
```
DELETE /api/admin/admins/{id}
├─ Auth: Super Admin ⚠️ Gap
├─ Protection: Cannot delete last super-admin
└─ Status: ✅ Complete
```

### 2.8 Export APIs (Admin)

#### Export Products
```
GET /api/admin/export/products
├─ Query: ?format=csv|json&startDate=2026-01-01&endDate=2026-04-06
├─ Response: CSV or JSON file
├─ Auth: Super Admin ⚠️ Gap
├─ File: [frontend/app/api/admin/export/route.ts](frontend/app/api/admin/export/route.ts)
└─ Status: ✅ Complete
```

#### Export Listings
```
GET /api/admin/export/listings
├─ Format: CSV or JSON
├─ Auth: Super Admin ⚠️ Gap
└─ Status: ✅ Complete
```

#### Export Price History
```
GET /api/admin/export/price-history
├─ Date range supported
├─ Auth: Super Admin ⚠️ Gap
└─ Status: ✅ Complete
```

### API Summary Statistics
- **Total Endpoints:** 35+ (documented above)
- **Public Read:** 8 endpoints (products, categories, sellers, price history)
- **B2C Auth-Only:** 4 endpoints (alerts CRUD, profile)
- **Admin-Only:** 20+ endpoints (products CRUD, categories CRUD, listings CRUD, admins, export)
- **Authorization Gaps:** 🚨 ALL admin endpoints skip Symfony-level auth checks
- **Pagination:** ❌ Missing at backend (UI-only pagination will fail at scale)
- **Rate Limiting:** ✅ Admin login only (others need implementation)

---

## 3️⃣ DATABASE SCHEMA & ENTITIES

### 3.1 Entity Relational Diagram

```
User (JOINED inheritance base)
├─ Admin (subclass)
│  └─ Fields: email, password_hash, role (admin|super_admin), created_at
│
└─ Customer (subclass)
   └─ Fields: email, name, location, preferences (JSON), created_at

Product
├─ FK: category_id → Category
├─ Fields: id, name, brand, image, description, specs (JSON), created_at
└─── ProductListing (N-to-M via this relation)
     ├─ FK: product_id → Product
     ├─ FK: seller_id → Seller
     ├─ Fields: price, stock, url, availability, is_active, created_at, updated_at
     └─── PriceHistory (1-to-M)
          ├─ FK: listing_id → ProductListing
          ├─ ⚠️ seller (int) - SHOULD BE FK to Seller (data integrity issue)
          ├─ Fields: date, price, availability, created_at

Category (Hierarchical - self-referential)
├─ FK: parent_id → Category (NULL for root)
├─ Fields: id, name, description, position (order), created_at
└─ Children (fetch recursively)

Seller
├─ Fields: id, name, website, reputation_score, listings_count
├─ 1-to-M relationship: Many ProductListings
└─ ⚠️ No relationship defined in PriceHistory (should be FK)

Alert (B2C user price alerts)
├─ FK: alerter_id → Customer
├─ FK: product_id → Product
├─ Fields: alert_type (price_drop|restock), threshold, is_active, created_at, updated_at
└─ Soft-delete: No (currently hard delete)
```

### 3.2 Full Entity Inventory

| Entity | Fields | Primary Keys | Foreign Keys | Status | Issues |
|--------|--------|--------------|--------------|--------|--------|
| **Admin** | id, email, password_hash, role, created_at | id | None | ✅ | Role enum missing validation |
| **Customer** | id, email, name, location, preferences | id | user_id (inherited) | ✅ | None |
| **User** | id, discriminator_type (JOINED inheritance) | id | None | ✅ | Inheritance model working |
| **Product** | id, name, brand, image, description, specs (JSON) | id | category_id | ✅ | Image path resolution needed |
| **ProductListing** | id, price, stock, url, availability, is_active | id | product_id, seller_id | ✅ | No availability enum (string only) |
| **Category** | id, name, description, position, parent_id | id | parent_id (self-referential) | ✅ | Needs denormalized depth/category tree cache |
| **Seller** | id, name, website, reputation_score, listings_count | id | None | ✅ | Reputation_score range not constrained (0-10) |
| **PriceHistory** | id, listing_id, seller (int), date, price, availability | id | listing_id | 🟡 | **CRITICAL:** seller is int, should be FK to Seller |
| **Alert** | id, alerter_id, product_id, alert_type, threshold, is_active | id | alerter_id, product_id | ✅ | No hard-delete protection (accidental deletes risky) |

### 3.3 Migration History (12 total)

| Migration File | Date | Change | Status |
|---|---|---|---|
| [Version20260307195449.php](backend/migrations/Version20260307195449.php) | Mar 7, 2026 | Initial schema: Category table | ✅ |
| [Version20260308220042.php](backend/migrations/Version20260308220042.php) | Mar 8, 2026 | Product + ProductListing + Seller | ✅ |
| [Version20260311131144.php](backend/migrations/Version20260311131144.php) | Mar 11, 2026 | PriceHistory table (⚠️ no FK on seller) | ✅ |
| [Version20260311131731.php](backend/migrations/Version20260311131731.php) | Mar 11, 2026 | User + Admin (JOINED inheritance) | ✅ |
| [Version20260314143418.php](backend/migrations/Version20260314143418.php) | Mar 14, 2026 | Alert entity | ✅ |
| [Version20260318172305.php](backend/migrations/Version20260318172305.php) | Mar 18, 2026 | Indices on category_id, seller_id, product_id | ✅ |
| [Version20260324111739.php](backend/migrations/Version20260324111739.php) | Mar 24, 2026 | Firebase auth integration (timestamps) | ✅ |
| [Version20260402122803.php](backend/migrations/Version20260402122803.php) | Apr 2, 2026 | Add product.disambiguation field (nullable) | ✅ |
| [Version20260402131133.php](backend/migrations/Version20260402131133.php) | Apr 2, 2026 | Rename product.specs to product.attributes (JSON) | ✅ |
| [Version20260402131827.php](backend/migrations/Version20260402131827.php) | Apr 2, 2026 | Add product_listing.external_id for tracking | ✅ |
| [Version20260402133238.php](backend/migrations/Version20260402133238.php) | Apr 2, 2026 | Add seller.last_updated timestamp | ✅ |
| [Version20260402140739.php](backend/migrations/Version20260402140739.php) | Apr 2, 2026 | Add customer table (User JOINED inheritance) | ✅ |

### 3.4 Database Normalization Issues

| Issue | Severity | Impact | Location | Fix |
|-------|----------|--------|----------|-----|
| PriceHistory.seller is int, not FK | 🔴 CRITICAL | Cannot enforce referential integrity, orphaned seller_ids possible | [backend/migrations/Version20260311131144.php](backend/migrations/Version20260311131144.php) | Create FK constraint, backfill missing sellers |
| No soft-delete on Alert | 🟡 HIGH | Accidental deletes unrecoverable | [backend/src/Entity/Alert.php](backend/src/Entity/Alert.php) | Add deleted_at timestamp field, add SoftDeleteable trait |
| Product.image is string path, no validation | 🟡 HIGH | Broken links, path inconsistencies | [backend/src/Entity/Product.php](backend/src/Entity/Product.php) | Add image validation, store normalized paths |
| Seller.reputation_score no range constraint | 🟡 MEDIUM | Invalid scores (>10 or <0 possible) | [backend/src/Entity/Seller.php](backend/src/Entity/Seller.php) | Add CHECK constraint `reputation_score BETWEEN 0 AND 10` |
| Category.parent_id can create cycles | 🟡 MEDIUM | Infinite loops in tree traversal | [backend/src/Entity/Category.php](backend/src/Entity/Category.php) | Add validation: parent cannot be descendant of self |

---

## 4️⃣ AUTHENTICATION & SESSION MANAGEMENT

### 4.1 Admin Authentication Flow

```
1. User enters email + password (POST /api/admin/auth/login)
   ↓
2. Backend validation
   ├─ Email exists in Admin table? YES → continue
   ├─ Verify Argon2id password hash
   ├─ Rate limit check (max 5 failed attempts, 300s lockout)
   └─ Generate JWT token (HMAC-SHA256, 8hr TTL)
   ↓
3. Token signed with APP_SECRET (from .env)
   ├─ Payload: {sub: admin_id, email, role, iat}
   └─ Signature: HMAC-SHA256(payload, APP_SECRET)
   ↓
4. Response: Return token in httpOnly cookie (session_admin)
   ├─ Domain: localhost (dev mode)
   ├─ SameSite: Strict
   ├─ TTL: 8 hours
   ├─ HttpOnly: true (JS can't access)
   └─ Secure: true (HTTPS only in prod)
   ↓
5. Next.js middleware intercepts subsequent requests
   ├─ Verifies token signature
   ├─ Checks expiry (if < 30min left, auto-refresh)
   ├─ Allows /admin/* routes
   └─ Redirects unauthorized to login

File: [frontend/lib/admin-session.ts](frontend/lib/admin-session.ts)
File: [frontend/app/api/admin/auth/login/route.ts](frontend/app/api/admin/auth/login/route.ts)
```

**Session Config:**
- **Algorithm:** HMAC-SHA256
- **TTL:** 8 hours
- **Refresh Threshold:** 30 minutes before expiry
- **Cookie:** httpOnly, Secure, SameSite=Strict
- **Rate Limiting:** 5 failed attempts → 300s lockout

### 4.2 B2C Authentication Flow

```
1. User clicks "Sign in with Google"
   ↓
2. Firebase login dialog opens (client-side)
   ├─ Firebase SDK: firebase.json contains config
   ├─ Google OAuth2 verification
   └─ Returns idToken (JWT from Firebase)
   ↓
3. Frontend sends idToken to backend (POST /api/b2c/auth/google)
   ↓
4. Backend verification
   ├─ Validate idToken signature (Firebase public keys)
   ├─ Extract email from token
   ├─ Check if Customer exists in DB
   │  ├─ YES: Update last_login timestamp
   │  └─ NO: Create new Customer with email
   ├─ Generate app session token (same HMAC pattern as admin)
   └─ Return token in httpOnly cookie (session_b2c)
   ↓
5. Frontend processes response
   ├─ Cookie auto-attached to subsequent requests
   ├─ Full page reload: window.location.reload()
   └─ Redirect to /B2C/products
   ↓
6. Middleware checks subsequent requests
   ├─ Verifies B2C session cookie
   ├─ Routes to /B2C/* allowed
   └─ Other routes denied

File: [frontend/lib/b2c-session.ts](frontend/lib/b2c-session.ts)
File: [frontend/app/api/b2c/auth/google/route.ts](frontend/app/api/b2c/auth/google/route.ts)
```

**Session Config:**
- Same as admin (HMAC-SHA256, 8hr TTL, httpOnly cookies)
- **Firebase Integration:** Public key verification, ⚠️ **HARDCODED FALLBACK KEY** (security issue)

### 4.3 Session Storage

| Session Type | Storage | Lifetime | Scope | Validation |
|--------------|---------|----------|-------|-----------|
| Admin Session | httpOnly Cookie | 8 hours | All /admin/* routes | HMAC-SHA256 signature check |
| B2C Session | httpOnly Cookie | 8 hours | All /B2C/*, /api/b2c/* | HMAC-SHA256 signature check |
| Firebase Token | Client-side (not persisted after token exchange) | 1 hour | Firebase API calls only | Firebase public key verification |

### 4.4 Security Assessment

| Aspect | Status | Notes |
|--------|--------|-------|
| **Token Signing** | ✅ HMAC-SHA256 | Secure algorithm |
| **Token TTL** | ✅ 8 hours | Reasonable duration |
| **Cookie Security** | ✅ HttpOnly, Secure, SameSite=Strict | Good defaults |
| **Rate Limiting** | ✅ Admin login only | (5 attempts/300s) |
| **Firebase Secret** | 🚨 **CRITICAL** | Hardcoded in source code, exposed in git |
| **Backend Auth Enforcement** | 🚨 **CRITICAL** | No Symfony-level checks; all endpoints open if middleware bypassed |
| **CSRF Protection** | ✅ Checked in admin login | [frontend/app/api/admin/auth/login/route.ts](frontend/app/api/admin/auth/login/route.ts) line ~40 |
| **Password Hashing** | ✅ Argon2id | Admin passwords only (B2C uses Firebase) |
| **Session Refresh** | ✅ Auto-refresh | 30min pre-expiry check |

---

## 5️⃣ FRONTEND COMPONENTS & PAGES

### 5.1 B2C Components

| Component | File | Status | Props | Features |
|-----------|------|--------|-------|----------|
| **B2CNavbar** | [frontend/components/B2C/b2c-navbar.tsx](frontend/components/B2C/b2c-navbar.tsx) | ✅ NEW | title, backHref?, backLabel?, showAlertsButton? | Title → "/" link, Back button, Alerts icon (BellRing), Become Partner button, Auth dropdown |
| **B2CNavAuth** | [frontend/components/B2C/b2c-nav-auth.tsx](frontend/components/B2C/b2c-nav-auth.tsx) | ✅ MODIFIED | email | Dropdown: Profile (User icon), Alerts, Logout (LogOut icon) |
| **ProductCard** | [frontend/components/B2C/product-card.tsx](frontend/components/B2C/product-card.tsx) | ✅ MODIFIED | product | Image, Name, Brand, Price range, CTA (ShoppingBag icon) |
| **B2CAuthDialog** | [frontend/components/B2C/b2c-auth-dialog.tsx](frontend/components/B2C/b2c-auth-dialog.tsx) | ✅ MODIFIED | onLoginSuccess? | Sign in / Sign up tabs, Firebase Google login, Auto-refresh on success (window.location.reload()) |
| **ProductListingTable** | [frontend/components/B2C/product-listing-table.tsx](frontend/components/B2C/product-listing-table.tsx) | ✅ | listings | Table: Price, Seller, Stock, External link button |
| **PriceHistoryChart** | [frontend/components/B2C/price-history-chart.tsx](frontend/components/B2C/price-history-chart.tsx) | ✅ | priceHistory | Recharts: Price line, Spike markers (out-of-stock), Legend |
| **AlertForm** | [frontend/components/B2C/alert-form.tsx](frontend/components/B2C/alert-form.tsx) | 🟡 | productId, onSubmit | Inputs: Alert type (dropdown), Threshold, Email |
| **PriceComparisonTable** | [frontend/components/B2C/price-comparison-table.tsx](frontend/components/B2C/price-comparison-table.tsx) | ✅ | product | Multi-seller pricing display |

### 5.2 B2C Pages

| Page | Route | File | Status | Features | Navbar |
|------|-------|------|--------|----------|--------|
| **Product Search** | /B2C/products | [frontend/app/B2C/products/page.tsx](frontend/app/B2C/products/page.tsx) | ✅ | Search input, Category filter, Price range filter, Product grid with cards | ✅ B2CNavbar (title="Products radar") |
| **Product Detail** | /B2C/products/[id] | [frontend/app/B2C/products/[id]/page.tsx](frontend/app/B2C/products/[id]/page.tsx) | ✅ | Product specs, Listings table, Price history chart | ✅ B2CNavbar (back button) |
| **My Alerts** | /B2C/alerts | [frontend/app/B2C/alerts/page.tsx](frontend/app/B2C/alerts/page.tsx) | ✅ | List alerts, Edit threshold, Delete alert, Create new alert link | ✅ B2CNavbar (title="My alerts", no alerts button) |
| **My Profile** | /B2C/profile | [frontend/app/B2C/profile/page.tsx](frontend/app/B2C/profile/page.tsx) | ✅ | Email, Name, Location, Edit profile button | ✅ B2CNavbar (title="My profile", back button) |
| **B2C Landing** | /B2C | [frontend/app/B2C/page.tsx](frontend/app/B2C/page.tsx) | ✅ | Nav to products, alerts, profile (basic) | ❓ No navbar needed (redirect to /B2C/products?) |

### 5.3 Admin Components

| Component | File | Status | Features |
|-----------|------|--------|----------|
| **AdminNavbar** | [frontend/components/admin/admin-navbar.tsx](frontend/components/admin/admin-navbar.tsx) | ✅ | Logo, Menu (Products, Categories, Sellers, Listings, Alerts, Export, System Health) |
| **AdminSidebar** | [frontend/components/admin/admin-sidebar.tsx](frontend/components/admin/admin-sidebar.tsx) | ✅ | Collapsible navigation links |
| **DataTable** | [frontend/components/admin/data-table.tsx](frontend/components/admin/data-table.tsx) | ✅ | Reusable table component (sorting, filtering, pagination UI) |
| **ProductForm** | [frontend/components/admin/product-form.tsx](frontend/components/admin/product-form.tsx) | ✅ | Inputs: Name, Brand, Category, Image, Specs |
| **ListingForm** | [frontend/components/admin/listing-form.tsx](frontend/components/admin/listing-form.tsx) | ✅ | Inputs: Product, Seller, Price, Stock, URL, Availability |
| **DuplicateDetectionWidget** | [frontend/components/admin/duplicate-detection.tsx](frontend/components/admin/duplicate-detection.tsx) | 🟡 | Shows duplicates, Merge UI (needs backend integration) |
| **BulkOperationsPanel** | [frontend/components/admin/bulk-operations-panel.tsx](frontend/components/admin/bulk-operations-panel.tsx) | 🟡 | Menu launcher only (no actual batch processing) |
| **ExportPanel** | [frontend/components/admin/export-panel.tsx](frontend/components/admin/export-panel.tsx) | ✅ | Format selector (CSV/JSON), Date range picker, Download button |

### 5.4 Admin Pages

| Page | Route | File | Status | Features |
|------|-------|------|--------|----------|
| **Dashboard** | /admin | [frontend/app/admin/page.tsx](frontend/app/admin/page.tsx) | ✅ | Stats cards (products count, listings, alerts), Quick actions |
| **Products** | /admin/products | [frontend/app/admin/products/page.tsx](frontend/app/admin/products/page.tsx) | ✅ | Table with CRUD, Search, Filter by category |
| **Categories** | /admin/categories | [frontend/app/admin/categories/page.tsx](frontend/app/admin/categories/page.tsx) | ✅ | Hierarchical tree, CRUD, Parent-child relationships |
| **Sellers** | /admin/sellers | [frontend/app/admin/sellers/page.tsx](frontend/app/admin/sellers/page.tsx) | ✅ | Table with scores, Edit reputation, Listing count |
| **Listings** | /admin/product-listings | [frontend/app/admin/product-listings/page.tsx](frontend/app/admin/product-listings/page.tsx) | ✅ | Filter by product/seller, CRUD, Toggle active, Batch edit |
| **Listings → New** | /admin/product-listings/new | [frontend/app/admin/product-listings/new/page.tsx](frontend/app/admin/product-listings/new/page.tsx) | ✅ | Form to create new listing |
| **Quality Control** | /admin/quality-control | [frontend/app/admin/quality-control/page.tsx](frontend/app/admin/quality-control/page.tsx) | ✅ | Missing fields report, Validation summary, Bulk actions |
| **Duplicate Detection** | /admin/duplicates | [frontend/app/admin/duplicates/page.tsx](frontend/app/admin/duplicates/page.tsx) | 🟡 | Algorithm works (100% + 85% fuzzy match), UI ready, Merge needs backend |
| **System Health** | /admin/system-health | [frontend/app/admin/system-health/page.tsx](frontend/app/admin/system-health/page.tsx) | ✅ | DB status, API uptime, Cache status, Error rate |
| **Activity Log** | /admin/activity-log | [frontend/app/admin/activity-log/page.tsx](frontend/app/admin/activity-log/page.tsx) | 🟡 | Currently snapshot only (not real audit trail) |
| **Export** | /admin/export | [frontend/app/admin/export/page.tsx](frontend/app/admin/export/page.tsx) | ✅ | Products/Listings/Price history export (CSV/JSON) |
| **Bulk Operations** | /admin/bulk-operations | [frontend/app/admin/bulk-operations/page.tsx](frontend/app/admin/bulk-operations/page.tsx) | 🟡 | Menu launcher only (needs backend job processor) |

---

## 6️⃣ TECHNOLOGY STACK & DEPENDENCIES

### 6.1 Frontend Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 16.1.6 | Server-side rendering (SSR), API routes, middleware |
| **React** | 19.2.4 | Component framework |
| **TypeScript** | 5.9.3 | Type safety, IDE support |
| **Tailwind CSS** | 4.1.18 | Utility-first styling |
| **shadcn/ui** | Latest | Copy-paste UI components (Radix UI based) |
| **Radix UI** | 1.4.3 | Accessible primitives (Dialog, Dropdown, Popover) |
| **Recharts** | 2.15.4 | React charting library (price history visualization) |
| **lucide-react** | 0.577.0 | Icon library (BellRing, User, LogOut, LogIn, UserPlus, ShoppingBag, etc.) |
| **Firebase** | 12.11.0 | Google Sign-In, authentication |
| **next-themes** | 0.4.6 | Dark mode support |
| **Sonner** | 2.0.7 | Toast notifications |
| **clsx** | 2.1.1 | Conditional classNames |
| **tailwind-merge** | 3.5.0 | Merge Tailwind classes without conflicts |
| **tw-animate-css** | 1.4.0 | Extra animation utilities |

**Dev Dependencies:**
- ESLint 9.39.2 (linting)
- Prettier 3.8.1 (code formatting)
- PostCSS 8 (CSS transformation)

### 6.2 Backend Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Symfony** | 8.0 | PHP web framework |
| **Doctrine ORM** | 3.6 | Object-relational mapping, entities |
| **Doctrine Migrations** | 4.0 | Database schema versioning |
| **PostgreSQL** | 18 (inferred) | SQL database |
| **PHP** | 8.4+ | Language |
| **Symfony Security Bundle** | 8.0 | Authentication, authorization |
| **Symfony Flex** | 2.x | Composer plugin for easy config |
| **Symfony Console** | 8.0 | CLI commands |
| **Symfony YAML** | 8.0 | Configuration files |
| **Symfony Runtime** | 8.0 | Runtime kernel |

**Dev Dependencies:**
- Symfony Maker Bundle 1.66+ (code generation)

### 6.3 Dependency Summary

**Frontend:** 13 production packages + 6 dev packages (well-scoped, minimal bloat)
**Backend:** 9 production packages (Symfony core + Doctrine, minimal) + 2 dev packages
**Missing:** 
- ❌ No testing libraries (PHPUnit, Jest, Playwright)
- ❌ No CI/CD tools (GitHub Actions, Docker)
- ❌ No API documentation (Swagger/OpenAPI)
- ❌ No logging (Monolog)
- ❌ No email service (Symfony Mailer not in composer.json)

---

## 7️⃣ PERFORMANCE & SCALABILITY ASSESSMENT

### 7.1 Query Performance

| Operation | Current | Issue | Fix Priority |
|-----------|---------|-------|--------------|
| List products (all) | ✅ Works | No pagination at backend; loads all into memory | 🔴 HIGH |
| Filter by category | ✅ | Eager loading implemented | ✅ OK |
| Price history (30 days) | ✅ | Indexed on listing_id | ✅ OK |
| Calculate trust score | Partial | No caching; recalculates every request | 🔴 HIGH |
| List alerts (per user) | ✅ | Indexed on alerter_id | ✅ OK |
| Admin export (1000+ rows) | ⚠️ | No streaming; loads full dataset | 🟡 MEDIUM |

### 7.2 Caching Strategy

| Resource | Current | Recommended | Status |
|----------|---------|-------------|--------|
| Product list | None | Redis (1hr TTL) | ❌ Not implemented |
| Category tree | None | Redis (24hr TTL) | ❌ Not implemented |
| Trust score | None | Redis (24hr TTL) | ❌ Not implemented |
| Seller rankings | None | Redis (6hr TTL) | ❌ Not implemented |
| Admin session | Cookies | ✅ Cookie-based | ✅ Implemented |

### 7.3 Database Indices

| Table | Indexed Columns | Status |
|-------|-----------------|--------|
| Product | category_id, name | ✅ |
| ProductListing | product_id, seller_id | ✅ |
| PriceHistory | listing_id, date | ✅ |
| Category | parent_id | ✅ |
| Alert | alerter_id, product_id | ✅ |
| Admin | email (unique) | ✅ |

### 7.4 Estimated Scale Limits

| Metric | Current Capacity | Bottleneck | ProjectedFailing Point |
|--------|-----------------|-----------|----------------------|
| Products | 100-1,000 | No pagination | 10,000+ products |
| Listings | 1,000-10,000 | No pagination | 100,000+ listings |
| Daily price updates | ✅ OK | Batch insert performance | 1M+ updates/day |
| Concurrent users | Untested | Session storage (filesystem) | 100+ concurrent |
| API response time | Target <500ms | Query optimization | See above |

---

## 8️⃣ KNOWN ISSUES & TECHNICAL DEBT

### 8.1 Critical Issues (Must Fix Before Production)

| Issue | Severity | Impact | File(s) | ETA Fix |
|-------|----------|--------|---------|---------|
| **Firebase key exposed** | 🔴 CRITICAL | Security + compliance breach | [frontend/app/api/b2c/auth/google/route.ts](frontend/app/api/b2c/auth/google/route.ts) line ~50 | Sprint 1 (2 hours) |
| **No backend auth enforcement** | 🔴 CRITICAL | All admin endpoints bypass Symfony security | [backend/config/packages/security.yaml](backend/config/packages/security.yaml) (empty access_control) | Sprint 1 (4 hours) |
| **price_history.seller FK missing** | 🔴 CRITICAL | Data integrity, orphaned seller IDs | [backend/migrations/Version20260311131144.php](backend/migrations/Version20260311131144.php) | Sprint 1 (2 hours) |
| **No pagination at backend** | 🔴 CRITICAL | Will fail at scale (OOM errors, timeout) | All list endpoints ([/api/products](backend/src/Controller/ProductController.php), /api/categories, /api/product-listings, /api/sellers) | Sprint 1 (6 hours) |

### 8.2 High-Priority Issues (Pre-MVP Launch)

| Issue | Impact | Fix Effort | Status |
|-------|--------|-----------|--------|
| No test suite | Zero quality coverage, regression risk | 20+ hours | ❌ Not started |
| No CI/CD pipeline | Manual deployment, error-prone | 8 hours | ❌ Not started |
| No horizontal scalability | Single database, no read replicas | 10+ hours | ❌ Not started |
| Activity log not real event trail | Cannot audit admin actions | 4 hours | 🟡 Partial |
| Bulk operations no job queue | Cannot process large datasets | 6 hours | ❌ Not started |
| Email service not configured | Alerts won't send emails | 3 hours | ❌ Not started |

### 8.3 Medium-Priority Issues (Nice-to-Have Before Market)

| Issue | Impact | Effort |
|-------|--------|--------|
| Missing input validation (frontend + backend) | XSS/SQL injection risk | 8 hours |
| No rate limiting on public APIs | DDoS vulnerability | 4 hours |
| Image paths not normalized | Broken links, SEO issues | 3 hours |
| Category tree no depth caching | Slow recursive queries | 2 hours |
| No soft deletes (except needed ones) | Can't recover accidental deletions | 4 hours |
| API documentation missing (Swagger) | Developer onboarding slow | 4 hours |

---

## 9️⃣ COMPLETE PRODUCT BACKLOG (Prioritized - 50+ Items)

### 🔴 SPRINT 1 - SECURITY & FOUNDATIONS (Weeks 1-2) - CRITICAL PATH
**Goal:** Fix all critical security + scale issues before handling any scale

#### Security Hardening
- [ ] **[SECURITY] Migrate Firebase key to .env** ⏱️ 2h 🔴 CRITICAL
  - Move hardcoded Firebase config from source code to environment variables
  - Regenerate Firebase keys
  - Add .env to .gitignore (already done?)
  - Update deployment docs
  - File: [frontend/app/api/b2c/auth/google/route.ts](frontend/app/api/b2c/auth/google/route.ts)

- [ ] **[BACKEND] Enforce Symfony-level authorization**  ⏱️ 4h 🔴 CRITICAL
  - Add `access_control` rules in [backend/config/packages/security.yaml](backend/config/packages/security.yaml)
  - Implement role-based security voters (Admin, SuperAdmin)
  - Add `#[IsGranted]` attributes to all admin endpoints
  - Test with unauthorized requests (should 403, not 200)
  - Files:
    - [backend/src/Controller/AdminController.php](backend/src/Controller/AdminController.php)
    - [backend/src/Controller/ProductController.php](backend/src/Controller/ProductController.php)
    - [backend/src/Controller/CategoryController.php](backend/src/Controller/CategoryController.php)
    - [backend/src/Controller/ProductListingController.php](backend/src/Controller/ProductListingController.php)

- [ ] **[DATABASE] Fix price_history.seller FK** ⏱️ 2h 🔴 CRITICAL
  - Create migration to add FK constraint: seller_id → Seller
  - Backfill orphaned seller IDs (or set NULL)
  - Add NOT NULL constraint after backfill
  - File: Create new migration Version20260406XXXXXX.php

- [ ] **[BACKEND] Add pagination to all list endpoints** ⏱️ 6h 🔴 CRITICAL
  - Add `limit` + `offset` query params to:
    - GET /api/products (default limit=20, max=100)
    - GET /api/categories (default limit=50)
    - GET /api/product-listings (default limit=20)
    - GET /api/sellers (default limit=20)
    - GET /api/admin/admins (default limit=20)
  - Update frontend APIs to handle pagination
  - Implement cursor-based pagination for large datasets (optional, but recommended)
  - Files:
    - All [backend/src/Controller/*.php](backend/src/Controller/)
    - All [frontend/app/api/**/*.ts](frontend/app/api/)

### Infrastructure & Testing
- [ ] **[DEVOPS] Setup CI/CD GitHub Actions** ⏱️ 6h 🔴 HIGH
  - Test: `npm run typecheck` + `eslint` + PHPUnit (when added)
  - Lint: Format check (Prettier)
  - Build: Next.js build, Symfony cache:clear
  - Deploy: Preview env on staging
  - Trigger: On PR + on merge to main
  - Files: Create `.github/workflows/ci.yml` + `.github/workflows/deploy.yml`

- [ ] **[TESTING] Setup PHPUnit for backend** ⏱️ 8h 🔴 HIGH
  - Add `phpunit/phpunit` + `symfony/test-pack` to composer.json
  - Create test directory structure
  - Write unit tests for:
    - [backend/src/Repository/ProductRepository.php](backend/src/Repository/ProductRepository.php) (search, filter)
    - [backend/src/Repository/PriceHistoryRepository.php](backend/src/Repository/PriceHistoryRepository.php)
    - Auth flows (login, JWT validation)
  - Configure GitHub Actions to run on PR
  - Target: >70% code coverage

- [ ] **[TESTING] Setup Jest + Playwright for frontend** ⏱️ 10h 🔴 HIGH
  - Add `jest` + `@testing-library/react` + `playwright` to package.json
  - Write E2E tests for:
    - B2C login → product search → alert creation
    - Admin login → product CRUD
    - Price chart rendering
  - Configure GitHub Actions to run tests

### Data Integrity
- [ ] **[DATABASE] Add constraint: Seller.reputation_score 0-10** ⏱️ 1h
  - Migration: Add CHECK constraint
  - Backfill invalid values
  - File: Create migration Version20260406XXXXXX.php

- [ ] **[DATABASE] Add soft delete to Alert** ⏱️ 2h
  - Add `deleted_at` field to Alert entity
  - Add SoftDeleteable trait from doctrine/orm-behaviors
  - Migration for schema change
  - File: [backend/src/Entity/Alert.php](backend/src/Entity/Alert.php)

---

### 🟡 SPRINT 2 - FOUNDATIONAL FEATURES (Weeks 3-4)

#### Backend Optimization
- [ ] **[CACHE] Implement Redis caching** ⏱️ 4h
  - Install `symfony/redis` + Redis server (dev: use Docker)
  - Cache product list (1hr TTL)
  - Cache category tree (24hr TTL)
  - Cache trust scores (24hr TTL)
  - Files:
    - [backend/src/Repository/ProductRepository.php](backend/src/Repository/ProductRepository.php)
    - [backend/src/Repository/CategoryRepository.php](backend/src/Repository/CategoryRepository.php)

- [ ] **[API] Add filtering/sorting to endpoints** ⏱️ 4h
  - Products: Filter by category, price range, brand
  - Listings: Sort by price, trust score, availability
  - Categories: Flat vs hierarchical view option
  - Files: All controllers

#### Email & Notifications
- [ ] **[EMAIL] Configure Symfony Mailer** ⏱️ 3h
  - Install `symfony/mailer` + `symfony/mime`
  - Configure SMTP or SendGrid in config/packages/mailer.yaml
  - Create email templates for alerts (Twig)
  - Files: [backend/config/packages/mailer.yaml](backend/config/packages/mailer.yaml)

- [ ] **[ALERTS] Implement daily alert trigger job** ⏱️ 3h
  - Create Symfony Console command: `app:alerts:process-triggers`
  - Query alerts with active=true
  - Check if price drop/restock condition met
  - Send email via Mailer
  - Schedule via cron (*/1 * * * * in production)
  - File: Create [backend/src/Command/ProcessAlertsCommand.php](backend/src/Command/ProcessAlertsCommand.php)

#### Frontend UX
- [ ] **[B2C] Improve alert creation UX** ⏱️ 3h
  - Dedicated alert modal (not in auth dialog)
  - Product pre-selection in modal
  - Threshold input validation (realistic ranges)
  - Success toast notification
  - File: Create [frontend/components/B2C/alert-creation-modal.tsx](frontend/components/B2C/alert-creation-modal.tsx)

- [ ] **[ADMIN] Implement real activity log** ⏱️ 4h
  - Create Activity event table in DB (user_id, action, resource_type, resource_id, change_delta, timestamp)
  - Log all CRUD operations via Doctrine lifecycle callbacks
  - Display with filtering/sorting in UI
  - Files:
    - Create [backend/src/Entity/Activity.php](backend/src/Entity/Activity.php)
    - Create [backend/src/EventListener/ActivityLogger.php](backend/src/EventListener/ActivityLogger.php)
    - Update [frontend/app/admin/activity-log/page.tsx](frontend/app/admin/activity-log/page.tsx)

---

### 🟢 SPRINT 3 - ADVANCED FEATURES (Weeks 5-6)

#### Reviews & Anti-Fake (Phase 2 Goal)
- [ ] **[BACKEND] Create Review entity** ⏱️ 3h
  - Fields: product_id, seller_id, rating (1-5), content, verified, source, created_at
  - Relationship to Product + Seller
  - File: Create [backend/src/Entity/Review.php](backend/src/Entity/Review.php)

- [ ] **[BACKEND] Implement anti-fake detection algorithm** ⏱️ 6h
  - Duplicate text detection (cosine similarity, threshold 0.8)
  - Timing suspicion (20+ reviews same day = flag)
  - Sentiment-rating mismatch (NLP analyze content vs rating)
  - User credibility scoring (first-time reviewer = lower weight)
  - Return confidence_score (0-1), flag if < 0.3
  - File: Create [backend/src/Service/AntiFakeReviewService.php](backend/src/Service/AntiFakeReviewService.php)

- [ ] **[BACKEND] Add Review API endpoints** ⏱️ 2h
  - GET /api/products/{id}/reviews (filter, paginate)
  - POST /api/products/{id}/reviews (user review, requires verified email)
  - GET /api/sellers/{id}/reviews-summary
  - File: Create [backend/src/Controller/ReviewController.php](backend/src/Controller/ReviewController.php)

#### Analytics & Insights
- [ ] **[BACKEND] Implement price anomaly detection** ⏱️ 4h
  - Rules engine:
    - Drop > 30% in 1 day → Flag
    - Price > 2x median by category → Flag
    - Availability inconsistency (stock=0, price published) → Flag
  - Calculate anomaly_level (0-1) per listing
  - File: Create [backend/src/Service/PriceAnomalyDetector.php](backend/src/Service/PriceAnomalyDetector.php)

- [ ] **[BACKEND] Add analytics endpoints** ⏱️ 3h
  - GET /api/products/{id}/price-analytics (anomalies, trends, forecast)
  - GET /api/products/{id}/demand-forecast
  - File: Create [backend/src/Controller/AnalyticsController.php](backend/src/Controller/AnalyticsController.php)

---

### 🔵 SPRINT 4-5 - SCALE & B2B (Weeks 7-10)

#### B2B Dashboard (Phase 2 Goal)
- [ ] **[FRONTEND] Create B2B competitive intelligence page** ⏱️ 6h
  - Table: Competitors vs our products
  - Filter by category, date range
  - Export to CSV/PDF
  - File: [frontend/app/B2B/competitive-intelligence/page.tsx](frontend/app/B2B/competitive-intelligence/page.tsx)

- [ ] **[FRONTEND] Create B2B sector overview** ⏱️ 4h
  - Stats: Avg price, variance, top sellers
  - Category heatmap visualization
  - File: [frontend/app/B2B/sector-overview/page.tsx](frontend/app/B2B/sector-overview/page.tsx)

- [ ] **[FRONTEND] Create B2B my products analysis** ⏱️ 4h
  - Compare our products vs competitors
  - Price positioning chart
  - File: [frontend/app/B2B/my-products/page.tsx](frontend/app/B2B/my-products/page.tsx)

#### Bulk Operations (Admin)
- [ ] **[BACKEND] Implement job queue (Symfony Messenger)** ⏱️ 4h
  - Setup message bus for async tasks
  - Create message classes for bulk operations
  - File: [backend/src/Message/*.php](backend/src/Message/)

- [ ] **[BACKEND] Bulk price update processor** ⏱️ 3h
  - Accept: CSV with product_id, new_price
  - Validate & update listings
  - Return success/error counts
  - File: [backend/src/MessageHandler/BulkPriceUpdateHandler.php](backend/src/MessageHandler/BulkPriceUpdateHandler.php)

- [ ] **[FRONTEND] Implement actual bulk operations** ⏱️ 4h
  - File upload (CSV)
  - Progress tracking
  - Result summary
  - File: Update [frontend/app/admin/bulk-operations/page.tsx](frontend/app/admin/bulk-operations/page.tsx)

#### Scalability
- [ ] **[DEVOPS] Setup Docker for local dev** ⏱️ 3h
  - Dockerfile for PHP [backend](backend)
  - Dockerfile for Node [frontend](frontend)
  - docker-compose.yml (includes PostgreSQL, Redis)
  - File: Create [docker-compose.yml](docker-compose.yml)

- [ ] **[DEVOPS] Setup database replication (read replicas)** ⏱️ 6h
  - PostgreSQL streaming replication
  - Read-only replica for analytics queries
  - Connection pooling (PgBouncer)
  - File: Deployment docs

---

### 📋 REMAINING LOWER-PRIORITY ITEMS (Sprint 6+)

#### Admin Features
- [ ] Bulk import products from file (CSV/JSON)
- [ ] Price override policies (set min/max per product)
- [ ] Seller verification workflow
- [ ] System health alerts (auto-notify on downtime)
- [ ] Custom reports builder
- [ ] Integration logs (scraper status, API usage)

#### B2C Features
- [ ] Save searches / wishlist
- [ ] Social features (compare with friends)
- [ ] Browser notifications (push alerts)
- [ ] Mobile app (React Native?)
- [ ] Product recommendations (ML-based)

#### Data & Analytics
- [ ] Price forecasting (ML model)
- [ ] Demand prediction
- [ ] Sentiment breakdown (shipping, quality, support)
- [ ] Competitor benchmarking reports
- [ ] Market trend analysis

#### DevOps & Operations
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Application monitoring (New Relic, DataDog)
- [ ] Error tracking (Sentry)
- [ ] Log aggregation (ELK stack)
- [ ] Database backups & disaster recovery

---

## 🔟 SPRINT PLANNING ROADMAP

### Phase 1: MVP (Weeks 1-10)

| Sprint | Week | Focus | Velocity | Status |
|--------|------|-------|----------|--------|
| **Sprint 1** | 1-2 | 🔴 Security + Pagination + Tests | 21 SP | ✅ BLOCKED (security) |
| **Sprint 2** | 3-4 | Caching + Alerts + Activity Log | 18 SP | 📋 TODO |
| **Sprint 3** | 5-6 | Reviews + Anomaly Detection | 20 SP | 📋 TODO |
| **Sprint 4** | 7-8 | B2B Dashboard foundations | 16 SP | 📋 TODO |
| **Sprint 5** | 9-10 | Bulk ops + Docker + Scale readiness | 18 SP | 📋 TODO |

### Phase 2: Consolidation (Weeks 11-20)

| Sprint | Week | Focus | Status |
|--------|------|-------|--------|
| **Sprint 6** | 11-12 | Advanced reviews + sentiment | 📋 TODO |
| **Sprint 7** | 13-14 | ML forecasting + price analytics | 📋 TODO |
| **Sprint 8** | 15-16 | B2B full suite + 2nd sector launch | 📋 TODO |
| **Sprint 9** | 17-18 | Performance tuning + load testing | 📋 TODO |
| **Sprint 10** | 19-20 | QA + polish + launch prep | 📋 TODO |

### Critical Dependencies

```
Sprint 1 (Security) ─── BLOCKS ──→ Sprint 2 (Caching)
         ↓
    BLOCKS Sprint 2, 3, 4, 5
         
Sprint 2 (Activity Log) ─── NEEDED FOR ──→ Sprint 8 (B2B)

Sprint 3 (Reviews) ─── NEEDED FOR ──→ Sprint 6 (Sentiment)

Sprint 5 (Docker) ─── NEEDED FOR ──→ Sprint 9 (Load testing)
```

**Critical Path:** Sprint 1 → Sprint 2 → Sprint 3 → (4|5) parallel → Sprint 6 → Sprint 7 → Sprint 8

---

## 📈 METRICS & SUCCESS CRITERIA

### MVP Launch Criteria (End of Phase 1, Week 10)
- [ ] ✅ All critical security issues fixed
- [ ] ✅ Pagination working on all list endpoints (no OOM)
- [ ] ✅ Test coverage >70% (unit + integration)
- [ ] ✅ CI/CD pipeline green (all checks passing)
- [ ] ✅ API response time <500ms (P95)
- [ ] ✅ Zero known CVEs in dependencies
- [ ] ✅ Admin panel fully functional (CRUD, export, activity log)
- [ ] ✅ B2C flows end-to-end (search, alerts, profile)
- [ ] ✅ Database migrations clean (no conflicts)
- [ ] [ ✅ Load test: 1,000 concurrent users without error

### Phase 2 Success (Week 20)
- [ ] Reviews + anti-fake live
- [ ] B2B dashboard live (beta)
- [ ] 3 sectors operational
- [ ] Performance: API <200ms P95, UI scores >85
- [ ] Zero downtime in testing
- [ ] Monitoring/alerting configured

---

## 🎯 RECOMMENDATION SUMMARY

### Immediate Actions (This Week)
1. **SECURITY:** Move Firebase key to .env (2h)
2. **BACKEND:** Add pagination to all endpoints (6h)
3. **BACKEND:** Enforce Symfony auth (4h)
4. **DATABASE:** Fix price_history.seller FK (2h)
5. **DEVOPS:** Create CI/CD workflow (6h)

### This Sprint
- Complete all Sprint 1 items (see roadmap above)
- Achieve >80% test coverage
- Pass security audit
- Document deployment steps

### Future Roadmap
- Week 11+: Phase 2 begins (reviews, B2B, ML)
- Month 6: Production readiness review
- Month 6+: Phase 3 (advanced analytics, scale to 100K users)

---

## 📚 Key Files Reference

**Frontend Entry Points:**
- [frontend/app/page.tsx](frontend/app/page.tsx) - Landing page
- [frontend/middleware.ts](frontend/middleware.ts) - Auth middleware
- [frontend/lib/admin-session.ts](frontend/lib/admin-session.ts) - Admin session logic
- [frontend/lib/b2c-session.ts](frontend/lib/b2c-session.ts) - B2C session logic

**Backend Entry Points:**
- [backend/src/Kernel.php](backend/src/Kernel.php) - Symfony kernel
- [backend/config/packages/security.yaml](backend/config/packages/security.yaml) - ⚠️ Needs auth rules
- [backend/src/Controller/AdminAuthController.php](backend/src/Controller/AdminAuthController.php) - Admin login
- [backend/src/Controller/B2CAuthController.php](backend/src/Controller/B2CAuthController.php) - B2C Firebase auth

**Database:**
- [backend/migrations/](backend/migrations/) - 12 migration files
- [backend/src/Entity/](backend/src/Entity/) - 9 entities

**Configuration:**
- [frontend/package.json](frontend/package.json) - Frontend deps
- [backend/composer.json](backend/composer.json) - Backend deps
- [backend/.env](backend/.env) - Environment (⚠️ APP_SECRET empty)
- [frontend/.env.local](frontend/.env.local) - Not in repo (Firebase config)

---

**Generated:** April 6, 2026  
**Next Update:** After Sprint 1 completion  
**Owner:** Development Team
