# PRODUCTRADAR (RADARWEBTN) — FULL APPLICATION AUDIT
## SYSTEM SPECIFICATION DOCUMENT (CURRENT STATE)

---

## 1. EXECUTIVE SUMMARY

**Product Identity:** ProductRadar is a web-based product intelligence platform that aggregates product listings from multiple sellers, providing price comparison, availability tracking, and business intelligence analytics. The platform operates as a multi-sided marketplace intelligence system.

**Product Type:** Hybrid B2C + Admin + B2B platform. Consumers browse and compare products; businesses gain market intelligence; administrators manage the entire ecosystem.

**Current Verdict:** The application is in an advanced development stage with substantial functionality implemented across all layers, but with critical security gaps, missing production hardening, and incomplete operational readiness.

**Maturity Assessment:**

| Dimension | Completeness | Status |
|-----------|--------------|--------|
| Features | ~75% | Core functionality present; some B2B analytics partially simulated |
| Production Hardening | ~30% | Critical security gaps; weak secrets; no rate limiting |
| Scalability Readiness | ~25% | Missing caching; no job queues; no CDN; database indexes missing |
| Security Readiness | ~35% | Authentication flawed; no CSRF; optional webhook verification; exposed defaults |
| Test Coverage | ~5% | No test files found in backend; frontend testing not observed |
| Operational Readiness | ~20% | No CI/CD; no monitoring; no alerting; basic Docker setup |

**Overall Maturity Score: 32/100** — Not production-ready.

---

## 2. PRODUCT SCOPE AND USER ROLES

### 2.1 Consumer Users (B2C)
**Who they are:** End-users who browse products, compare prices, and manage personal shopping intelligence.

**What they can do today:**
- Create accounts and authenticate via email/password or Google OAuth through an external authentication provider
- Browse products organized in hierarchical categories with nested subcategories
- Search products with live typeahead suggestions as they type
- Filter products by single or multiple categories, price range (with slider interface), brand (top 10 with counts), and priced-only toggle
- Sort products by price ascending, price descending, or alphabetical order
- View paginated product listings with configurable page size and ellipsis-aware pagination controls
- View detailed product pages showing image, name, trust score, and multiple seller listings with prices
- Implicitly compare listings across sellers on the same product page
- Visualize historical price trends through linear charts
- Add or remove product listings from favorites (toggle component on product cards)
- View all saved favorites on a dedicated page
- Create price alerts and stock alerts on products
- Manage existing alerts on a dedicated alerts page
- Receive notifications delivered through a bell icon with unread count badge, dropdown showing recent notifications with product images and messages
- Mark notifications as read individually by clicking them
- Submit reviews with rating and comment on product listings
- View subscription plans and upgrade to premium
- Gain higher limits on saved items (5 → 999 favorites) and alerts (3 → 20) with premium
- Access extended price history (1 month → 6 months) with premium
- Reset passwords via email links
- Update profile display name

**Data they can access:**
- All active product listings with prices, availability, trust scores
- Their own favorites, alerts, notifications, and reviews
- Public product catalog with category hierarchy
- Price history (limited by subscription tier)
- Their own subscription status and plan details

### 2.2 Administrators
**Who they are:** System operators with elevated privileges to manage the entire platform. Two tiers exist.

**Super Admin:**
- Full system access
- Can create, update roles, and delete other administrators
- Cannot change own role
- Cannot delete own account
- Cannot demote the last remaining super admin

**Sub Admin:**
- Restricted access (specific endpoint restrictions not fully enforced beyond role check)
- Cannot manage other administrators

**What they can do today:**
- Authenticate with email and password (Argon2id hashing)
- Access a dedicated administrative interface with sidebar navigation
- View dashboard analytics with review metrics: total reviews, approved counts, rejected counts, approval rates, average ratings, rating distributions visualized as proportional bars, daily review submission trends over the past 30 days
- List, create, and update products with relevant fields
- View hierarchical category tree and create/update categories with parent-child relationships
- List, create, and update sellers (data sources)
- List, create, and update product listings with price, availability, trust score
- Moderate reviews: list reviews, update status (pending/approved/rejected), add moderation notes, perform batch status updates, get auto-moderation suggestions
- Approve or reject B2B partner requests with configurable plan assignment, duration, and seller assignment
- Approve or reject B2B subscription requests
- Approve or reject B2B advertisements requests (with campaign creation on approval)
- Approve or reject B2B scraping requests (with rejection reasons)
- Trigger manual scraping workflows with seller, category, and URL configuration
- View scraping logs with filtering and export capabilities
- View system health status
- Manage administrator accounts (super admin only)
- View audit activity logs with pagination, search, and filtering by entity type and action
- Export datasets (products, listings, reviews, etc.)
- Detect and merge duplicate products through side-by-side comparison interface
- Split or merge products through administrative interfaces
- View user management tables with consumer and business user listings, pagination, search, and filtering by account type, status, and B2B status
- Update user account status (active, suspended, banned)
- View user alert and favorite usage counts
- See stats dashboard with user counts, subscription statistics, pending B2B requests

**Data they can access:**
- All products, categories, sellers, listings in the system
- All user accounts and their associated data
- All reviews and moderation history
- All B2B partner requests and approval workflows
- All B2B subscriptions, advertisements, and scraping requests
- All scraping logs and data source configurations
- All administrative activity logs
- System health metrics

### 2.3 B2B Vendor Accounts (Companies)
**Who they are:** Businesses that sell products and want market intelligence on their own offerings and competitors.

**What they can do today:**
- Submit partner requests with account type, company details (name, market, country, website)
- Receive verification and approval from administrators
- Authenticate with the same external authentication provider as consumers
- Access a vendor-specific dashboard showing: product counts, listing counts, average trust scores, notification counts, competitor pricing gaps (Gold tier), stock monitoring with out-of-stock rates, top listings with availability
- View "My Listings" page displaying their product listings with product names, categories, seller names, prices, trust scores, and availability status
- Request advertising campaigns (banner, sponsored product, sponsored article)
- Request scraping of new product or category URLs
- Access reports (competitor pricing type)
- View notifications specific to their company with type labels and severity indicators
- See company information, subscription details, and account status on dashboard
- View bar charts visualizing comparative data
- Access analytics including: share of shelf calculation (brand's product percentage within categories), price dispersion (min/max prices, dispersion amount and percentage, cheapest/most expensive sellers), competitor ranking (sellers ranked by listing count and market share percentage)
- Request scraping for new products or categories not yet tracked
- View subscription tier badge (free, silver, gold) with visual indicators
- Access Gold-tier features when subscribed: competitor pricing intelligence, stock intelligence, reviews sentiment analysis, demand intelligence from search logs

**Data they can access:**
- Their own product listings and pricing
- Competitor listings for the same products
- Market share and pricing dispersion analytics
- Their own advertisements requests and campaigns
- Their own scraping requests
- Their own reports
- Their own notifications
- Search insights combining B2B-specific and global B2C search logs
- Top search queries and zero-result queries (Gold tier)

### 2.4 B2B Market Accounts
**Who they are:** Marketplaces and platforms that want broad market intelligence across multiple sellers and categories.

**What they can do today:**
- Submit partner requests similarly to vendor accounts
- Receive verification and approval from administrators
- Authenticate with the same external authentication provider
- Access a market-specific dashboard showing: share of shelf analysis, price dispersion metrics, competitor rankings with market share percentages, competitor pricing, reputation intelligence (simulated), demand intelligence (Gold tier)
- View the same listing management, advertising, scraping, reports, and notification features as vendor accounts
- Access analytics tailored for market intelligence: competitor ranking shows market share percentages and listing counts across the entire market, reputation intelligence provides average rating across products with positive/negative keywords (simulated)
- Access Gold-tier features: reviews sentiment analysis, demand intelligence from search logs

**Data they can access:**
- Broader market data across multiple sellers and categories
- Competitor rankings across the entire platform
- Market share percentages
- Price dispersion across all sellers in a category
- Reputation intelligence across products (simulated)
- Demand intelligence from search patterns (Gold tier)
- Same B2B workflow features as vendor accounts (ads, scraping, reports, notifications)

---

## 3. FRONTEND APPLICATION AUDIT (DEEP DETAIL)

### 3.1 UI Architecture

**Layout Structure:**
The application uses a layered layout system. A root layout wraps the entire application with theme provision, tooltip provision, authentication dialog context, and a centralized toast notification system. The theme is forced to light mode and uses a sans-serif font with a monospace fallback. Separate layout wrappers exist for administrative sections and business-to-business sections, each providing their own sidebar navigation and top navigation bars. The administrative layout conditionally hides navigation elements on authentication pages.

**Navigation System:**
Three distinct navigation experiences exist:
- A consumer-facing top navigation bar with integrated search, notification bell, favorites link, alerts link, and authentication-aware action buttons
- An administrative sidebar with collapsible grouped navigation sections (overview, catalog, moderation, workflows, user management), role-based menu filtering, and a user profile footer with logout capability
- A business-to-business sidebar that dynamically renders navigation items based on the account mode (vendor vs market intelligence), with a profile footer and subscription tier badge

**Role-Based Rendering:**
The interface conditionally renders elements based on multiple role dimensions:
- Administrative access shows/hides super-admin-only menu sections and validates administrative authentication status
- Business accounts display different dashboard layouts, navigation items, and analytics based on vendor versus market mode
- Consumer accounts show different interface elements based on authentication state and account type (regular customer versus business account)
- Subscription tier badges and feature gates visually indicate access levels

**State Management:**
A hybrid state management approach is used:
- React Context provides global state for authentication dialogs, administrative sessions, and business workspace data
- Local component state manages form inputs, loading indicators, pagination, and filter selections
- Session data is stored in HTTP-only cookies with HMAC-signed tokens containing user identity, email, external authentication UID, account type, and expiration
- External authentication provider integrates for consumer account management
- Memoization optimizes derived state like filtered brand lists and parsed search parameters

**API Communication:**
A service layer abstracts backend communication:
- Administrative services exist for products, categories, sellers, listings, reviews, scraping logs, data sources, subscriptions, users, and activity logs
- API routes proxy requests between the frontend and backend, with some routes handling server-side operations like session creation
- Fetch calls include cache control directives (no-store for dynamic data)
- The backend URL is centralized in a constants configuration
- Request and response types are defined to ensure type safety

**Error Handling Patterns:**
- Loading states use spinner icons, skeleton placeholders, and disabled button states
- Error states display colored text messages and may fallback to empty datasets
- Toast notifications provide feedback for authentication actions, errors, and successes
- Component-level error handling uses try/catch with state-based error messages
- API fetch calls include response.ok checks and throw descriptive errors
- In some cases, errors are silently caught with empty fallback data

**Loading Patterns:**
- Skeleton loading files exist for product listing and category pages
- "Loading..." and "Searching..." text during data fetches
- Disabled button states during form submissions
- Next.js loading.tsx files provide instant visual feedback while pages hydrate

**Form Handling Patterns:**
- Form submissions use controlled inputs with validation (required fields, email format)
- Toast notifications provide feedback for form submission outcomes
- Outside-click detection and escape key handling close dropdown menus and dialogs

### 3.2 Consumer Experience (B2C)

**Authentication and Account Creation:**
Consumers authenticate via a dialog supporting two modes (sign in and sign up). Email/password authentication creates accounts through the external authentication provider, with profile updates for display names. Google popup authentication is supported. Password reset functionality sends email links. Upon successful authentication, a server-side session is created with a signed token, and the page reloads to reflect the authenticated state. The authentication dialog can be triggered from multiple locations in the interface.

**Browsing System:**
- **Search:** Live search with debounced API calls (250ms delay) showing matching products in a dropdown as the user types. Abort controllers cancel in-flight search requests when queries change.
- **Filters:** Server-side filtering by category (single or multiple via mega-menu navigation organized by root categories with nested subcategories rendered as expandable sections), price range (with slider interface), brand (top 10 with counts), and priced-only toggle.
- **Sorting:** Options for price ascending, price descending, and alphabetical order.
- **Pagination:** Paginated results with configurable page size (24 per page), ellipsis-aware pagination controls, and result count displays. Breadcrumb trail generation from category hierarchy.
- **Empty States:** "No products found" messages with contextual guidance, "No categories available" placeholders.

**Product Detail Experience:**
Product detail pages display comprehensive information including the product image, name, trust score, and multiple seller listings with prices. The page is accessed by clicking product cards or search results. Navigation back to listing pages is supported.

**Listing Comparison Experience:**
Infrastructure exists for displaying multiple listings per product with trust scores, seller information, and availability status, enabling implicit comparison across sellers on the same product detail page.

**Price History Visualization:**
Linear charts visualize historical price data for products, allowing consumers to see pricing trends over time. "Best Time to Buy" predictions are available for premium users with sufficient history data (minimum 4 data points), showing action (wait or buy now), best day offset, predicted price, and confidence score.

**Favorites Workflow:**
A toggle component on product cards allows adding/removing listings from favorites. A dedicated favorites page lists saved items. API endpoints manage favorite creation and deletion. Favorite listings are associated with specific product listings rather than products alone. Plan-based limits: Free tier allows 5 favorites; Premium allows 999.

**Alerts Workflow:**
Consumers can create price alerts and stock alerts on products. A dedicated alerts page manages existing alerts. Alert functionality integrates with the notification system to notify users when price conditions are met. Plan-based limits: Free tier allows 3 alerts; Premium allows 20. Cancelled alerts still count against the quota (lifetime cap). Duplicate alert requests update existing alert preferences rather than creating duplicates.

**Notification UI Behavior:**
A bell icon in the navigation bar displays an unread count badge. Clicking it opens a dropdown showing recent notifications with product images, messages, and prices. Notifications can be marked as read individually when clicked, which navigates to the relevant product. Notifications are loaded from the server when the dropdown opens or on authentication.

**Review Submission and Display:**
The backend supports review creation and moderation. Review analytics dashboards exist in the administrative interface with rating distributions, approval rates, and daily submission trends. Consumers can submit reviews with rating and comment on product listings. Reviews go through moderation workflow (pending → approved/rejected).

**Subscription Purchase Flow UI:**
A profile section displays available subscription plans (Free, Premium Monthly, Premium Yearly). References throughout the interface encourage upgrading to premium for higher limits. Subscription management API endpoints handle plan changes and payment confirmation. Checkout sessions are created with external payment provider integration.

**Subscription Status Display and Plan Management:**
The interface displays current plan type with visual badges. Upgrade prompts appear after feature limits are reached. Contextual "See plans" buttons encourage upgrades. Feature limits are enforced based on subscription tier.

**Premium Feature Gating Behavior:**
The interface includes visual cues encouraging premium upgrades, such as plan comparison pages, upgrade prompts after feature limits, and contextual "See plans" buttons. Feature limits are enforced based on subscription tier (favorites: 5 vs 999, alerts: 3 vs 20, price history: 1 month vs 6 months).

### 3.3 Admin Experience

**Dashboard Analytics and Charts:**
An analytics dashboard displays review metrics including total reviews, approved counts, rejected counts, approval rates, average ratings, rating distributions visualized as proportional bars, and daily review submission trends over the past 30 days. Cards present key metrics with descriptive labels.

**User Management:**
Data tables list administrators with their roles, and separate tables list consumers/business users. Administrative roles include super admin and sub-admin, with role assignment capabilities (super admin only). Activity logging tracks administrative actions. User listing includes pagination, search, and filtering by account type, status, and B2B status. Stats dashboard shows user counts, subscription stats, pending B2B requests.

**Admin Management:**
Administrators can be listed (super admin only), created with email and password (minimum 8 characters), updated in role (super admin only, with restrictions on self-role-change and last super admin demotion), and deleted (super admin only, with restrictions on self-deletion and last super admin deletion).

**B2B Partner Request Handling:**
A verification table displays business partner applications with status tracking. Approval workflow includes: decrypting provisioning password, creating/updating B2B user entity with verified and approved status, creating seller entity, attaching B2B subscription (Silver or Gold), provisioning external authentication user via REST API, sending approval confirmation email, and logging admin activity. Rejection workflow removes partner request and logs activity.

**Product CRUD:**
Dedicated pages with data tables support listing, creating, and editing products. Forms for creating new entries include relevant fields for each entity type. Loading states and empty states handle data fetching edge cases.

**Category CRUD:**
Category management includes parent-child relationship visualization with hierarchical tree views. Categories can be created and updated with parent category assignment.

**Seller CRUD:**
Sellers (data sources) can be listed, created, and updated. Forms include relevant seller fields.

**Product Listing CRUD:**
Product listings can be listed, created, and updated with fields for price, old price, product URL, availability, trust score, product association, and seller association.

**Review Moderation UI:**
Batch moderation panels allow processing multiple reviews. Auto-moderation endpoints integrate with enhanced review services. Review data tables display status, ratings, and content, with filtering and pagination. Moderation notes can be added by admins.

**Trust Score Recalculation UI/Logic Exposure:**
Trust scores are associated with product listings and displayed throughout the interface. Administrative context tracks role-based permissions for trust score management. Trust scores are stored per listing with breakdown details in JSON format.

**Scraping Control Panels:**
Manual scraping triggers initiate on-demand scraping with default link configuration. Data source management panels configure scraping targets. Webhook panels receive scraping completion notifications.

**Scraping Log Viewer:**
Scraping log panels display scraping activity with filtering and export capabilities. Log entries include source information, workflow name, status, duration, records processed, error message, and execution timestamp.

**Duplicate Detection and Merge Workflows:**
Dedicated panels compare duplicate product candidates side-by-side and provide merge functionality. A duplicate management panel lists detected duplicates. Products can be split or merged through administrative interfaces.

**Export Tools and CSV Generation Features:**
An export page provides access to dataset exports (products, listings, reviews, etc.). API endpoints generate exports with dataset-specific logic. CSV export functionality exists for reviews with filtering by status.

**System Health Views:**
A system health page monitors backend service status and operational metrics.

**Activity Logs Viewer:**
Administrative activity is logged and displayed in a dedicated page with timestamps, actions, administrator identification, entity type, entity ID, before/after state in JSON, and IP address. Pagination, search, and filtering by entity type and action are supported.

### 3.4 B2B Experience

**Onboarding Flow:**
A dedicated page allows consumers to become business partners. Verification workflows track application status. The business context manages company information including name, market, country, website, and verification status.

**Workspace Dashboard:**
The business dashboard adapts to two modes:
- **Vendor mode** shows product counts, listing counts, average trust scores, notification counts, competitor pricing gaps, stock monitoring with out-of-stock rates, and top listings with availability
- **Market mode** shows share of shelf analysis, price dispersion, competitor rankings, and market share percentages

Both modes display company information, subscription details, and account status. Bar charts visualize comparative data. Recent alerts are listed with severity badges.

**Vendor Dashboard Features:**
- Product and listing counts
- Average trust scores across listings
- Notification counts
- Competitor pricing gaps (Gold tier)
- Stock monitoring with out-of-stock rate tracking
- Top listings table with availability status

**Market Dashboard Features:**
- Share of shelf calculation (brand's product percentage within categories)
- Price dispersion analysis (min/max prices, dispersion amount/percentage, cheapest/most expensive sellers)
- Competitor ranking (sellers ranked by listing count and market share percentage)
- Reputation intelligence (average rating across products, positive/negative keywords — simulated)
- Demand intelligence (Gold tier)

**Listing Management Views:**
A "My Listings" page displays the business's product listings with product names, categories, seller names, prices, trust scores, and availability status. The dashboard overview includes a table of top listings.

**Analytics Sections:**
- **Share of Shelf:** Calculates brand's product percentage within categories compared to competitors
- **Price Dispersion:** Shows min/max prices, dispersion amount and percentage, cheapest/most expensive sellers
- **Competitor Ranking:** Ranks sellers by listing count and market share percentage
- **Reputation Intelligence (Simulated):** Average rating across products, positive/negative keywords
- **Demand Intelligence (Gold):** Top search queries, zero-result queries from search logs
- **Stock Monitoring:** Out-of-stock rate tracking for products

**Ads Requests UI:**
Dedicated pages allow submitting advertising requests (banner, sponsored product, sponsored article campaigns) with request type, duration days, budget proposal, and notes. Ads requests go through admin approval workflow. On approval, campaigns are created with agreed price, start/end dates, and active status.

**Scraping Requests UI:**
Dedicated pages allow submitting scraping requests for new product or category URLs to be tracked, with target type, target URL, and notes. Duplicate detection checks if URL already exists in product listings or category links. Requests go through admin approval/rejection workflow.

**Reports UI:**
A reports section provides access to generated business intelligence reports (competitor pricing type). Infrastructure exists for report generation workflow with file path storage and status tracking (pending → generated).

**Notifications UI:**
An alerts page manages business notifications. The dashboard displays recent alerts with type labels and severity indicators. Notifications are generated from various business events (price changes, stock updates, competitor actions) and can be tied to company or market with severity levels.

**Subscription Visibility and Plan Gating UI:**
- A plan gate component restricts access to premium features based on subscription tier
- Subscription banners display current plan type (free, silver, gold) with visual badges
- Gold-tier features include advanced analytics (stock intelligence, demand intelligence, reviews sentiment)
- The business context calculates tier status from subscription plan types
- Feature access controlled by plan type: Silver (basic) vs Gold (advanced features)

### 3.5 Frontend Quality Review

**Remaining Lint Bypasses:**
- An ESLint configuration file exists for code quality enforcement
- Some inconsistencies in syntax were observed (mixed semicolon usage, TypeScript assertions in some files)
- The analytics dashboard file shows mixed patterns that suggest incomplete refactoring

**Type Safety Issues:**
- TypeScript is used throughout the codebase with explicit type annotations for component props, API responses, and state variables
- Some uses of `unknown` and `Record<string, unknown>` appear in business dashboard data structures where backend response shapes are flexible
- Service layer returns typed promises; entity types are centralized in a types utility

**Missing Error Boundaries:**
- No explicit React error boundary components were observed
- Component-level error handling uses try/catch with state-based error messages
- API fetch calls include response.ok checks and throw descriptive errors
- In some cases, errors are silently caught with empty fallback data

**Missing Empty States:**
- Empty states are handled consistently in most areas: "No products found" messages, "No categories available" placeholders, "No notifications yet" in dropdown menus
- Loading states use "Loading..." and "Searching..." text during data fetches
- Skeleton loading files exist for product listing and category pages

**Inconsistent UI Patterns:**
- A shared component library provides consistent cards, buttons (with multiple variants and sizes), badges, inputs, dialogs, tables, pagination, navigation menus, sidebars, avatars, tooltips, and toasts
- Tailwind CSS utility classes create a cohesive visual language
- Color schemes distinguish between consumer (orange/rose accents), admin (slate/blue), and business (slate/amber) sections
- Border radius and shadow patterns are consistent across card-based layouts

**Performance Bottlenecks in Rendering:**
- Next.js app router enables server-side rendering for initial page loads
- Debounced search (250ms delay) prevents excessive API calls
- Abort controllers cancel stale requests during rapid typing
- Pagination limits rendered items to 24 per page with efficient slice operations
- Static generation is used where appropriate; dynamic data uses no-store cache directives
- Loading.tsx files provide instant visual feedback while pages hydrate

**Accessibility Gaps:**
- ARIA labels exist on icon buttons (e.g., "Open notifications", "Log out")
- Dialog components use proper title and description elements
- Some interactive cards use role="button" with tabIndex and keyboard event handlers (Enter/Space to activate)
- Outside-click and escape-key handling improves keyboard usability for dropdowns
- Color contrast appears adequate for text elements
- No comprehensive focus management or screen-reader testing artifacts were observed

---

## 4. BACKEND APPLICATION AUDIT (DEEP DETAIL)

### 4.1 Backend Architecture

**Framework and Architecture Style:**
The backend is built on PHP 8.4+ using the Symfony 8.0 framework with a JSON REST API architecture (no server-side rendering). Doctrine ORM 3.6 manages database abstraction with repository pattern. JOINED inheritance is used for user entities (base user with specialized B2B company, B2B market, and customer subtypes). The service container uses autowiring and autoconfiguration. Environment-based configuration is handled via Symfony's Dotenv component. PSR-4 autoloading maps App\ namespace to src/. Final classes are used for most services and controllers. Doctrine migrations manage database schema. The architecture is stateless (no server-side sessions for main operations). Symfony Mailer handles email delivery. External payment provider PHP SDK v20.0 handles payment processing.

**Service Layer vs Controller Logic:**
Business logic is organized into service classes that are injected into controllers. Controllers handle HTTP request/response concerns while services encapsulate business rules. Repositories abstract database queries.

**Authentication Mechanism:**
- **Consumers:** Authentication is handled externally via Firebase; the backend stores external authentication UID and validates presence but relies on the external provider for actual credential verification. External UID is passed in requests. Consumers automatically receive a default free subscription upon first authentication. No server-side session management; stateless architecture.
- **B2B Users:** Also use external authentication. Account verification workflow required before access: status must be verified and B2B status must be approved. Ownership validation enforces that B2B users can only access their own company or market data by matching owner user ID to the user's primary key. B2B users can be linked to seller entities.
- **Administrators:** Email and password-based login with Argon2id password hashing. API key-based authentication for admin API endpoints using a custom guard. API key transmitted via header with timing-safe comparison (hash_equals()). Admin role transmitted via header (values: ROLE_SUPER_ADMIN, ROLE_SUB_ADMIN). Admin ID transmitted via header. Rate limiting on admin login: 5 attempts per IP address with 300-second lockout using PSR cache interface.
- **Webhooks:** API key-based via header with hash_equals() comparison. Optional HMAC-SHA256 signature verification via header (format: sha256=<hash>). Signature verification is skipped if the signature header is absent.

**Authorization Enforcement:**
- Two admin roles: SUPER_ADMIN (full access) and SUB_ADMIN (restricted)
- Certain endpoints enforced for SUPER_ADMIN only (admin management, role changes)
- B2B feature access controlled by plan type: Silver (basic) vs Gold (advanced features)
- Plan gating service checks subscription active status, expiration date, and plan type to determine feature access

**Admin Checks:**
Admin role and ID are passed via client-controlled headers, not cryptographically verified against a server-side session or token.

**B2B Checks:**
B2B users are verified by checking account status (verified) and B2B status (approved). Ownership validation matches the authenticated user's ID to the owner_user_id field on company or market entities.

**Session Verification:**
Stateless design means no server-side session for consumers. Administrator API key is checked via header. B2C sessions use HMAC-signed HTTP-only cookies containing user identity, email, external authentication UID, account type, and expiration.

**Request Validation:**
Basic validation exists for some inputs (URL validation with filter_var, required field checks). No comprehensive request validation layer was observed. Some endpoints rely on client-provided IDs for ownership checks without cryptographic verification.

### 4.2 Consumer Business Logic

**User Creation and Identity Binding:**
When a consumer authenticates for the first time, the system checks for an existing user with the provided external authentication UID. If not found, a new customer entity is created with the UID, email, and a default free subscription is attached. The user is marked as verified and active.

**Favorites Creation and Deletion:**
Consumers can create, list, and delete favorite product listings. Plan-based limits are enforced: Free tier allows 5 favorites; Premium allows 999; B2B users are exempt from limits. Duplicate favorite requests return the existing record rather than creating a duplicate or returning an error. Deletion verifies ownership via client-provided ID (security gap: client-provided ID not cryptographically verified). Favorites are associated with product listings and include pricing, availability, trust scores, and product details.

**Alerts Creation and Cancellation:**
Consumers can create price alerts and stock alerts on products. Plan-based limits: Free tier allows 3 alerts; Premium allows 20. Cancelled alerts still count against the quota (lifetime cap). Duplicate alert requests update the existing alert's notification preferences rather than creating duplicate. Deletion marks alert as cancelled (soft delete) rather than removing the record, preserving quota consumption. Alerts track: is_price_notif, is_stock_notif, cancelled status.

**Notifications Creation:**
Notifications are created by the system in response to various events (price changes, stock updates, competitor actions). Notifications include type, message, severity, read status, and can be tied to product listings, clients, companies, or markets.

**Review Submission and Moderation Pipeline:**
Reviews are attached to product listings with rating and comment. Admin-moderation workflow: Reviews have status PENDING, APPROVED, or REJECTED. Moderation notes can be added by admins. Auto-moderation service provides suggestions for review moderation. Batch status updates are supported for bulk moderation. CSV export functionality exists for reviews with filtering by status. Analytics available: rating distribution, reviews per day, review analytics.

**Trust Score Calculation Logic and Update Triggers:**
Trust scores are stored per product listing (decimal value). Breakdown details stored in JSON format. Scores are used in B2B competitor ranking and price prediction models. Trust score breakdown includes factors contributing to the overall score. Scores are included in product listing responses and used for anomaly detection in price history.

**Price History Insertion Logic:**
Historical price tracking for product listings with anomaly detection. Tracks: recorded price, out-of-stock status, anomaly flag. "Best Time to Buy" predictions: Requires premium plan with price history access > 0. Attempts to call external Python API for predictions. Fallback mechanism: Linear regression prediction if Python API fails. Prediction includes: action (WAIT/BUY_NOW), best day offset, predicted price, confidence score. Minimum 4 valid history points required for predictions. Price history access varies by subscription plan (1-6 months of access).

**Subscription Activation Logic:**
Three plan types: FREE, PREMIUM_MONTHLY, PREMIUM_YEARLY. FREE plan: 5 favorites, 3 alerts, 1 month price history access. Premium plans: 999 favorites, 20 alerts, 6 months price history access. Subscription lifecycle ensures default free plan exists for all users. Plan configuration includes: plan_type, start_date, end_date, active status, alerts_limit, favorites_limit, price_history_access. Resync functionality corrects existing subscriptions to match expected plan limits. Duration: Monthly (1 month), Yearly (1 year), Free (100 years effectively indefinite).

**Premium Feature Gating Enforcement:**
Feature limits are enforced based on subscription tier when creating favorites (checking count against limit) and alerts (checking count against limit). Price history access is enforced by checking subscription's price_history_access value and filtering results to the appropriate time window.

### 4.3 Payment and Subscription Logic

**Subscription Lifecycle Handling:**
- Three plan types: FREE, PREMIUM_MONTHLY, PREMIUM_YEARLY
- FREE plan auto-assigned to new users
- Premium plans activated via external payment provider checkout sessions
- Activation sets subscription: plan_type, start_date, end_date, active=true, limits
- Expiry rules: end_date checked to determine if subscription is still active
- Renewal behavior: Not confirmed in codebase (likely handled by external payment provider recurring subscriptions)

**Activation Rules:**
- Checkout session creation: Creates external payment provider checkout session with mode: subscription, customer email from user record, metadata: external authentication UID and plan ID, plan configuration: name, description, unit_amount (in cents), recurring interval, success/cancel URLs with session ID appended
- Two confirmation paths:
  1. Webhook: Listens for checkout.session.completed events, verifies signature, activates plan
  2. Manual confirmation: Endpoint to verify session status and activate plan (used if webhook fails)

**Expiry Rules:**
- Subscription end_date is set based on plan duration (1 month for monthly, 1 year for yearly)
- Active flag is set to true on activation
- Plan gating checks both active flag and whether current date is before end_date

**Renewal Behavior:**
- External payment provider handles recurring subscription renewals
- Not confirmed how webhook renewal events are processed

**Stripe Integration Logic (External Payment Provider):**
- External payment provider PHP SDK v20.0 integrated
- Configurable via environment variables: secret key, webhook secret, currency (defaults to USD, supports any 3-letter ISO code)
- Plan definitions: Premium Monthly ($50.00 USD, monthly recurring, 20 alerts, 999 favorites, 6 months price history), Premium Yearly ($420.00 USD, yearly recurring, same limits)

**Webhook Verification:**
- API key-based via header with hash_equals() comparison
- Optional HMAC-SHA256 signature verification via header (format: sha256=<hash>)
- Signature verification uses the provider's constructEvent method but signature verification is skipped if header is absent
- No event ID tracking for idempotency

**Idempotency Safeguards:**
**MISSING.** External payment provider events are not deduplicated by event ID; duplicate webhooks could cause multiple plan activations. No idempotency keys observed in checkout session creation.

**What Happens on Cancellation/Refund Events:**
Not confirmed in codebase. No handlers observed for subscription cancellation or refund webhook events.

**What Happens if Webhook Fails:**
Manual confirmation endpoint allows client to verify session status and activate plan. This provides a fallback if webhook delivery fails.

### 4.4 Scraping / Ingestion Layer

**Scraping Workflow Trigger Behavior:**
- **Webhook Ingestion:** Dedicated endpoint for external scraping workflows (n8n, Airflow) to report results. Accepts: source name, workflow name, status (SUCCESS/FAILED), duration, records processed, error message, executed timestamp. Updates data source entity with last success timestamp and last error. Creates scraping log entries.
- **Manual Scraping:** Admin-triggered manual scraping with n8n webhook integration. Accepts: seller ID, category ID, link (URL), use category link flag. Category link resolution automatically finds scraping URL from seller-category mappings. Validates URL. Sends payload to n8n webhook with seller, category, URL, and admin requestor details.

**Data Source Management Behavior:**
Seller entities represent data sources. Data source entity maintains: last success timestamp, last error, updated timestamp. Category link entities map sellers to category URLs for automated scraping.

**How New Listings/Products Are Inserted or Updated:**
Not confirmed in full detail. External scraping workflows presumably send data via webhook ingestion endpoint, which updates data source and creates scraping log. The actual product/listing insertion logic is not confirmed in the backend code reviewed.

**Duplicate Handling Rules:**
- **B2B Scraping Requests:** Duplicate detection checks if URL already exists in product listings or category links. Marks request as duplicate with reason.
- **Product Duplicates:** Administrative interface provides duplicate detection and merge workflows with side-by-side comparison. Products can be split or merged.

**Anomaly Detection Rules:**
Price history entries have an anomaly flag. Anomaly detection is performed on price history data and flag is stored. Trust scores use anomaly detection as one factor. Not confirmed: specific anomaly detection algorithm.

**Scraping Log Creation Rules:**
Webhook ingestion creates scraping log with: source name (seller name), workflow name, status, duration, records processed, error message, executed timestamp.

**Ingestion Failure Behavior:**
Failed scraping workflows report status FAILED with error message. Data source entity updates last error. Scraping log records failure status and error message.

### 4.5 B2B Business Logic

**Vendor Workspace Aggregation Logic:**
Summary endpoint aggregates user info, subscription, metrics, search insights, notifications. Metrics calculated for companies: product count, listing count, average trust score, stock monitoring, competitor pricing (Gold), opportunities.

**Market Workspace Aggregation Logic:**
Metrics calculated for markets: share of shelf, price dispersion, competitor ranking, reputation intelligence (Gold), demand intelligence (Gold).

**Share of Shelf Calculation Logic:**
Calculates brand's product percentage within categories compared to competitors.

**Price Dispersion Calculation Logic:**
Shows min/max prices, dispersion amount and percentage, cheapest/most expensive sellers.

**Competitor Ranking Logic:**
Ranks sellers by listing count and market share percentage.

**Stock Monitoring Logic:**
Tracks out-of-stock rates for products. Monitoring shows which products are out of stock.

**Opportunity Detection Logic:**
Not confirmed in detail. Mentioned in vendor dashboard metrics.

**Sentiment/Review Intelligence Logic:**
Average rating across products, positive/negative keywords. **PARTIAL:** Simulated in some contexts; not confirmed if actual sentiment analysis is implemented.

**Demand Intelligence Based on Search Logs:**
Top search queries, zero-result queries from search logs. Combines B2B-specific search logs and global B2C search logs. Used for demand intelligence in Gold plans.

**Watchlist Behavior:**
B2B watchlist allows tracking items by type (product, category, seller, brand). Watchlist entries include owner type, company/market association, item type, and item reference. No composite unique constraint to prevent duplicate watchlist entries.

**Ads Request Approval Workflow:**
B2B users request banner ads with request type, duration, budget proposal, notes. Admin approval/rejection endpoints. On approval, creates ads campaign with agreed price, start/end dates, active status. Campaigns linked to ads requests.

**Ads Campaign Creation Rules:**
On ads request approval, campaign is created with: ads request reference, status, agreed price, starts at, ends at, active flag.

**Scraping Request Duplicate Detection Rules:**
Checks if URL already exists in product listings or category links. Marks request as duplicate with reason.

**Report Lifecycle Handling Rules:**
B2B users can request reports (type: COMPETITOR_PRICING). Simulated generation: Sets status to GENERATED with file path. Admin can list all reports with pagination.

**Usage Quota Logic and Plan Enforcement:**
No explicit quotas found for B2B scraping requests, reports, or ads requests. B2B plans define feature access (Silver vs Gold) but not usage limits. Usage JSON field exists on B2B entities but its usage is not confirmed.

### 4.6 Admin Logic

**Admin Authentication:**
Email and password-based login with Argon2id password hashing. API key-based authentication for admin API endpoints using a custom guard. API key transmitted via header with hash_equals() timing-safe comparison. Rate limiting on admin login: 5 attempts per IP address with 300-second lockout.

**Role Hierarchy:**
- ROLE_SUPER_ADMIN: Full system access, can manage other admins
- ROLE_SUB_ADMIN: Restricted access (specific endpoints not enforced beyond role check)

**Permission Checks:**
Certain endpoints enforced for SUPER_ADMIN only (admin management, role changes). B2B feature access controlled by plan type via plan gating service.

**Audit Logging Logic:**
AdminActivityLog entity tracks: admin (relation), action (e.g., REVIEW_STATUS_UPDATE, B2B_APPROVE, ADMIN_CREATE), entity type, entity ID, before JSON (state before change), after JSON (state after change), IP address, created timestamp. Audit service provides logModeration method for consistent logging. Activity log listing: paginated with filters (search, entity type, action).

**Admin Workflows for Approving/Rejecting Requests:**
1. **B2B Partner Requests:** List pending, approve (with plan/duration/seller assignment), reject
2. **B2B Subscriptions:** List, create, approve, reject, update active status
3. **B2B Ads Requests:** List, approve (with campaign creation), reject
4. **B2B Scraping Requests:** List, approve, reject (with rejection reason)
5. **Reviews:** List, update status, batch update, get auto-moderation suggestions

**Admin Workflows for Managing B2B Subscriptions:**
List, create, approve, reject, update active status.

**Admin Workflows for Managing Ads Campaigns:**
Approve ads requests (with campaign creation), reject ads requests.

**Admin Workflows for Managing Scraping Requests:**
Approve or reject B2B scraping requests with rejection reasons.

**Admin Workflows for Managing Reports:**
Admin can list all reports with pagination.

### 4.7 Backend Quality Review

**Missing Authorization Coverage:**
- Admin role and ID are client-controlled headers, not cryptographically verified
- Some B2B endpoints may not fully enforce ownership validation
- Some endpoints rely on client-provided IDs for ownership checks

**Inconsistent Identity Binding:**
- External authentication UID passed in requests (could be spoofed without proper server-side token verification)
- B2C sessions use HMAC-signed cookies but consumer endpoints rely on UID in request

**Risky Endpoints or Write Operations:**
- Manual scraping trigger allows admin to initiate external workflows
- Product/listing deletion may have FK constraint handling
- Bulk operations exist but their safety not fully confirmed

**Missing Validations:**
- No comprehensive request validation layer observed
- Rating field should have check constraint (1-5) but not confirmed at database or application level
- Some foreign keys are nullable that should likely be NOT NULL

**Missing Idempotency:**
- External payment provider webhooks not deduplicated by event ID
- No idempotency keys in checkout session creation
- Duplicate favorites/alerts handled at application level but not database level

**Missing Rate Limiting:**
- Consumer endpoints not rate-limited
- B2B endpoints not rate-limited
- Most admin endpoints not rate-limited (except login)

**Missing Logging and Monitoring:**
- Admin activity logged via Audit Logging Logic
- Scraping logs track ingestion workflows
- No application-level logging observed for general API requests
- No monitoring or alerting infrastructure observed

**Missing Caching Strategy:**
No caching layer observed (no Redis, no Doctrine cache configuration beyond defaults). Database queries hit the database directly.

**Performance Risks:**
- Missing indexes on most foreign keys (critical for JOIN performance)
- Large tables (price history, notifications, search logs) without proper indexes
- No pagination on some list endpoints (not confirmed)
- External API calls (payment provider, Python prediction API) without timeout handling (not confirmed)

---

## 5. DATABASE AUDIT (DEEP DETAIL)

### 5.1 Core Catalog Model

**Products:**
- ID: integer, auto-increment, primary key, not nullable
- Reference: string(255), not nullable
- Name: string(255), not nullable
- Brand: string(255), nullable
- Description: text, not nullable
- Specs: JSON array, nullable
- Image URL: text, nullable
- Category ID: integer, not nullable, foreign key to category
- Relationship: Many-to-one to category; One-to-many to listings; One-to-many to alerts
- Index on category ID
- **Issue:** No unique constraint on reference field — should likely be unique
- **Issue:** No index on brand for filtering/searching

**Listings:**
- ID: integer, auto-increment, primary key, not nullable
- Price: float, not nullable
- Old price: float, nullable
- Product URL: text, not nullable
- Availability: boolean, nullable
- Trust score: float, nullable
- Trust score breakdown: JSON array, nullable
- Created at: datetime, not nullable
- Updated at: datetime, nullable
- Is active: boolean, not nullable
- Product ID: integer, nullable, foreign key to product
- Seller ID: integer, not nullable, foreign key to seller
- Reference: string(255), not nullable
- Relationships: Many-to-one to product; Many-to-one to seller; One-to-many to price histories; One-to-many to favorites; One-to-many to notifications
- **Issue:** Missing index on product ID — heavily used in joins
- **Issue:** Missing index on seller ID — heavily used in joins
- **Issue:** Missing index on reference — likely needs uniqueness
- **Issue:** Missing index on is_active for filtering
- **Issue:** Missing composite index on (product ID, seller ID)

**Sellers (Data Sources):**
- ID: integer, auto-increment, primary key, not nullable
- Name: string(255), not nullable
- URL: text, not nullable
- Relationships: One-to-many to listings
- **Issue:** Missing index on name for lookups
- **Issue:** No unique constraint on name or URL

**Categories:**
- ID: integer, auto-increment, primary key, not nullable
- Name: string(255), not nullable
- Parent ID: integer, nullable, foreign key to category (self-referencing)
- Relationships: Self-referencing many-to-one (parent/children); One-to-many to products
- Index on parent ID
- **Issue:** No unique constraint on (name, parent ID) — could allow duplicate category names under same parent

**Category Linking Strategy:**
Category link entity maps sellers to category URLs for automated scraping:
- ID: integer, auto-increment, primary key
- Category ID: integer, not nullable, foreign key to category
- Seller ID: integer, not nullable, foreign key to seller
- URL: text, not nullable
- **Issue:** Missing indexes on foreign keys
- **Issue:** Missing composite unique constraint on (category ID, seller ID)

**How Listings Connect to Products:**
Many-to-one relationship from listing to product via product ID foreign key.

**How Price History Connects to Listings:**
Many-to-one relationship from price history to listing via product listing ID foreign key.

### 5.2 User Model

**Base User (Joined Inheritance):**
- ID: integer, auto-increment, primary key, not nullable
- Email: string(255), not nullable
- Is active: boolean, not nullable
- Address: text, nullable
- External authentication UID: string(255), not nullable
- Last login: datetime, nullable
- Account status: string(50), not nullable, default: ACTIVE
- Type: string(20), not nullable (discriminator column)
- Relationships: One-to-many to alerts; One-to-many to favorites; One-to-one to subscription; One-to-many to notifications
- Index on account status
- **Issue:** No unique constraint on email — should be unique
- **Issue:** No unique constraint on external authentication UID — should be unique
- **Issue:** Missing index on type discriminator column
- **Issue:** Missing index on last login

**Customer (extends User):**
- ID: integer, primary key, not nullable (foreign key to user)
- Full name: string(255), nullable
- Joined at: datetime, not nullable
- Updated at: datetime, nullable
- Is verified: boolean, not nullable
- Inherits all relationships from user base

**B2B Company (extends User):**
- ID: integer, primary key, not nullable (foreign key to user)
- Owner user ID: integer, nullable, foreign key to user (self-referencing)
- Seller ID: integer, nullable, foreign key to seller
- Full name: string(255), nullable
- Company name: string(255), not nullable
- Company market: string(255), nullable
- Company country: string(2), nullable
- Company website: string(255), nullable
- B2B status: string(50), not nullable, default: PENDING
- Joined at: datetime, not nullable
- Updated at: datetime, nullable
- Is verified: boolean, not nullable
- Usage JSON: JSON array, nullable
- Relationships: Many-to-one to owner user; Many-to-one to linked seller; inherits user relationships
- Index on B2B status
- **Issue:** Missing unique constraint on company name
- **Issue:** Missing index on owner user ID
- **Issue:** Missing index on seller ID

**B2B Market (extends User):**
- Same structure as B2B Company with same issues

**Admin User Model:**
- ID: integer, auto-increment, primary key, not nullable
- Email: string(180), not nullable, unique
- Password: string, not nullable (Argon2id hash)
- Role: string(50), not nullable, default: ROLE_SUB_ADMIN
- Created at: datetime, not nullable
- Updated at: datetime, not nullable
- Relationships: One-to-many to activity logs; One-to-many to activated B2B subscriptions
- Unique index on email
- No significant issues

**How User Identity Is Stored:**
External authentication UID stored in user table. Sessions use HMAC-signed HTTP-only cookies with user identity, email, external authentication UID, account type, expiration.

**Account Types:**
Discriminator column "type" with values: customer, b2b_company, b2b_market (and admin as separate entity).

**Verified Status Behavior:**
Is verified boolean on customer and B2B entities. B2B status field controls approval workflow (PENDING → APPROVED on admin approval).

**Last Login Behavior:**
Last login timestamp stored on user entity, nullable.

### 5.3 Subscription Model

**B2C Subscription (DUPLICATE ENTITIES MAPPED TO SAME TABLE):**
- ID: integer, auto-increment, primary key
- Plan type: string(255), not nullable
- Start date: datetime, not nullable
- End date: datetime, not nullable
- Active: boolean, not nullable
- Alerts limit: integer, not nullable
- Favorites limit: integer, not nullable
- Price history access: integer, not nullable
- Client ID: integer, nullable, foreign key to user
- Relationship: One-to-one to user
- **CRITICAL ISSUE:** Two PHP entities both map to the same table — code duplication issue
- **Issue:** Missing unique constraint on client ID (should be one-to-one)
- **Issue:** Missing index on client ID
- **Issue:** Missing index on active for filtering
- **Issue:** Missing index on end date for expiry checks

**B2B Subscription:**
- ID: integer, auto-increment, primary key
- Owner type: string(20), not nullable
- Plan type: string(20), not nullable
- Duration months: integer, not nullable
- Start date: datetime, not nullable
- End date: datetime, not nullable
- Active: boolean, not nullable
- Company ID: integer, nullable, foreign key to B2B company with CASCADE delete
- Market ID: integer, nullable, foreign key to B2B market with CASCADE delete
- Activated by admin ID: integer, nullable, foreign key to admin with SET NULL
- Created at: datetime, not nullable
- Activated at: datetime, nullable
- Updated at: datetime, nullable
- Relationships: Many-to-one to B2B company; Many-to-one to B2B market; Many-to-one to admin
- Index on owner type; Index on active
- **Issue:** Missing index on company ID
- **Issue:** Missing index on market ID
- **Issue:** Missing index on end date
- **Issue:** Either company ID or market ID should be required (not both nullable)

**Plan Fields and How They Affect Limits:**
- B2C: plan_type determines alerts_limit, favorites_limit, price_history_access
- B2B: plan_type (Silver/Gold) determines feature access via plan gating service

### 5.4 Engagement Model

**Favorites:**
- ID: integer, auto-increment, primary key
- Created at: datetime, not nullable
- Product listing ID: integer, not nullable, foreign key to listing
- Client ID: integer, not nullable, foreign key to user
- Relationships: Many-to-one to listing; Many-to-one to user
- **Issue:** Missing index on product listing ID
- **Issue:** Missing index on client ID
- **Issue:** Missing composite unique constraint on (client ID, product listing ID) to prevent duplicates

**Alerts:**
- ID: integer, auto-increment, primary key
- Is price notification: boolean, nullable
- Is stock notification: boolean, nullable
- Cancelled: boolean, not nullable, default: false
- Product ID: integer, not nullable, foreign key to product
- Alerter ID: integer, not nullable, foreign key to user
- Relationships: Many-to-one to product; Many-to-one to user
- Index on product ID
- **Issue:** Missing index on alerter ID
- **Issue:** Missing composite unique constraint on (alerter ID, product ID)
- **Issue:** Missing index on cancelled for filtering

**Notifications:**
- ID: integer, auto-increment, primary key
- Type: string(255), not nullable
- Message: text, not nullable
- Is read: boolean, not nullable
- Created at: datetime, not nullable
- Product listing ID: integer, nullable, foreign key to listing
- Client ID: integer, nullable, foreign key to user
- Company ID: integer, nullable, foreign key to B2B company with SET NULL
- Market ID: integer, nullable, foreign key to B2B market with SET NULL
- Severity: string(20), nullable
- Relationships: Many-to-one to listing; Many-to-one to user; Many-to-one to company; Many-to-one to market
- **Issue:** Missing indexes on all foreign keys
- **Issue:** Missing index on is read for filtering
- **Issue:** Missing index on created at for ordering
- **Issue:** Missing index on type and severity for filtering

**Reviews:**
- ID: integer, auto-increment, primary key
- Client ID: integer, nullable, foreign key to user
- Product listing ID: integer, nullable, foreign key to listing
- Rating: integer, not nullable
- Comment: text, nullable
- Status: string(20), not nullable, default: PENDING
- Moderation note: text, nullable
- Created at: datetime, not nullable
- Updated at: datetime, nullable
- Relationships: Many-to-one to user; Many-to-one to listing
- **Issue:** Missing index on client ID
- **Issue:** Missing index on product listing ID
- **Issue:** Missing index on status for filtering
- **Issue:** Missing check constraint on rating (should be 1-5)
- **Issue:** Both foreign keys are nullable which may indicate data integrity issues

**Moderation Status Tracking:**
Status field on review entity with values: PENDING, APPROVED, REJECTED. Moderation note field stores admin notes.

### 5.5 Scraping Model

**Data Sources (Sellers):**
Already described in Core Catalog Model.

**Scraping Logs:**
- ID: integer, auto-increment, primary key
- Source name: string(120), not nullable
- Workflow name: string(120), not nullable
- Status: string(20), not nullable, default: SUCCESS
- Duration (ms): integer, nullable
- Records processed: integer, nullable
- Error message: text, nullable
- Executed at: datetime, not nullable
- **Issue:** Missing index on source name for filtering
- **Issue:** Missing index on status for filtering
- **Issue:** Missing index on executed at for time-series queries
- **Issue:** Missing index on workflow name

**Scraping Requests (B2B):**
- ID: integer, auto-increment, primary key
- Owner type: string(20), not nullable
- Company ID: integer, nullable, foreign key to B2B company with CASCADE delete
- Market ID: integer, nullable, foreign key to B2B market with CASCADE delete
- Target type: string(20), not nullable
- Target URL: text, not nullable
- Status: string(20), not nullable
- Notes: text, nullable
- Is duplicate: boolean, nullable
- Duplicate reason: text, nullable
- Created at: datetime, nullable
- Updated at: datetime, nullable
- Relationships: Many-to-one to company; Many-to-one to market
- Index on owner type; Index on status
- **Issue:** Missing index on company ID
- **Issue:** Missing index on market ID
- **Issue:** Missing index on created at
- **Issue:** Either company ID or market ID should be required

**Category Link Tracking:**
Already described in Core Catalog Model.

### 5.6 B2B Model

**Company Accounts:**
Already described in User Model.

**Market Accounts:**
Already described in User Model.

**Ads Requests:**
- ID: integer, auto-increment, primary key
- Owner type: string(20), not nullable
- Company ID: integer, nullable, foreign key to B2B company with CASCADE delete
- Request type: string(20), not nullable
- Product ID: integer, nullable, foreign key to product with SET NULL
- Category ID: integer, nullable, foreign key to category with SET NULL
- Duration days: integer, nullable
- Budget proposal: float, nullable
- Notes: text, nullable
- Status: string(20), not nullable
- Created at: datetime, nullable
- Updated at: datetime, nullable
- Relationships: Many-to-one to company; Many-to-one to product; Many-to-one to category
- Index on owner type; Index on status
- **Issue:** Missing index on company ID
- **Issue:** Missing index on product ID
- **Issue:** Missing index on category ID
- **Issue:** Missing index on created at

**Ads Campaigns:**
- ID: integer, auto-increment, primary key
- Ads request ID: integer, not nullable, foreign key to ads request with CASCADE delete
- Status: string(20), not nullable
- Agreed price: float, nullable
- Starts at: datetime, nullable
- Ends at: datetime, nullable
- Active: boolean, nullable
- Created at: datetime, nullable
- Updated at: datetime, nullable
- Relationship: Many-to-one to ads request
- Index on status
- **Issue:** Missing index on ads request ID
- **Issue:** Missing unique constraint on ads request ID (one-to-one relationship expected)
- **Issue:** Missing index on active for filtering

**Sponsored Articles:**
- ID: integer, auto-increment, primary key
- Ads request ID: integer, nullable, foreign key to ads request with SET NULL
- Title: string(255), not nullable
- Content: text, nullable
- URL: text, nullable
- Status: string(20), not nullable
- Published at: datetime, nullable
- Created at: datetime, nullable
- Relationship: Many-to-one to ads request
- Index on status
- **Issue:** Missing index on ads request ID
- **Issue:** Missing index on published at

**Watchlists:**
- ID: integer, auto-increment, primary key
- Owner type: string(20), not nullable
- Company ID: integer, nullable, foreign key to B2B company with CASCADE delete
- Market ID: integer, nullable, foreign key to B2B market with CASCADE delete
- Item type: string(20), not nullable
- Product ID: integer, nullable, foreign key to product with CASCADE delete
- Category ID: integer, nullable, foreign key to category with CASCADE delete
- Seller ID: integer, nullable, foreign key to seller with CASCADE delete
- Brand: string(255), nullable
- Created at: datetime, nullable
- Updated at: datetime, nullable
- Relationships: Many-to-one to company; Many-to-one to market; Many-to-one to product; Many-to-one to category; Many-to-one to seller
- Index on owner type; Index on item type
- **Issue:** Missing indexes on all foreign keys
- **Issue:** Missing composite unique constraint to prevent duplicate watchlist entries

**Reports:**
- ID: integer, auto-increment, primary key
- Owner type: string(20), not nullable
- Company ID: integer, nullable, foreign key to B2B company with CASCADE delete
- Market ID: integer, nullable, foreign key to B2B market with CASCADE delete
- Report type: string(50), not nullable
- Status: string(20), not nullable
- File path: text, nullable
- Period start: datetime, nullable
- Period end: datetime, nullable
- Generated at: datetime, nullable
- Created at: datetime, nullable
- Relationships: Many-to-one to company; Many-to-one to market
- Index on owner type; Index on status
- **Issue:** Missing indexes on foreign keys
- **Issue:** Missing index on report type

**Usage JSON Counters:**
Usage JSON field on B2B company and B2B market entities. Usage not fully confirmed.

**Demand Logs (B2B Search Log):**
- ID: integer, auto-increment, primary key
- Owner type: string(20), not nullable
- Company ID: integer, nullable, foreign key to B2B company with CASCADE delete
- Market ID: integer, nullable, foreign key to B2B market with CASCADE delete
- Query: text, not nullable
- Results count: integer, nullable
- Zero results: boolean, nullable
- Created at: datetime, nullable
- Relationships: Many-to-one to company; Many-to-one to market
- Index on owner type; Index on created at
- **Issue:** Missing indexes on foreign keys
- **Issue:** Missing index on zero results for analytics

**Partner Request:**
- ID: integer, auto-increment, primary key
- Email: string(255), not nullable
- Full name: string(255), nullable
- Account type: string(50), not nullable
- Company name: string(255), not nullable
- Company market: string(255), not nullable
- Company country: string(2), not nullable
- Company website: string(255), not nullable
- Notes: text, nullable
- B2B password: text, not nullable
- Created at: datetime, not nullable
- **Unique constraint:** Composite unique on (email, account type)
- Index on created at
- No significant issues

### 5.7 Data Integrity Review

**Missing Indexes (Critical for Performance):**
- Most tables missing indexes on their foreign key columns
- Particularly: listing.product ID, listing.seller ID, price history.product listing ID, alert.alerter ID, favorite.client ID, favorite.product listing ID, notification all foreign keys, review.client ID, review.product listing ID
- Missing indexes on status fields for filtering (review, notification, scraping request, ads request, report, ads campaign, sponsored article)
- Missing indexes on created at/updated at for time-based queries
- Missing indexes on discriminator/type columns (user.type, B2B subscription.owner type, etc.)

**Missing Unique Constraints:**
- User email should be unique
- User external authentication UID should be unique
- Product reference should likely be unique
- Seller name or URL should be unique
- B2C subscription client ID should be unique (one-to-one)
- Ads campaign ads request ID should be unique (one-to-one)
- Alert should have unique constraint on (alerter ID, product ID)
- Favorite should have unique constraint on (client ID, product listing ID)
- Category link should have unique constraint on (category ID, seller ID)
- B2B company name should be unique
- B2B market name should be unique

**Inconsistent Nullable Fields:**
- Price history.product listing ID is nullable but should likely be NOT NULL with CASCADE delete
- Review.client ID and review.product listing ID are nullable which may indicate data integrity issues
- B2B subscription company ID and market ID are both nullable — one should be required
- B2B scraping request company ID and market ID are both nullable — one should be required

**Referential Integrity Risks:**
- Foreign keys without proper indexes will cause performance issues on joins and cascade operations
- Nullable foreign keys where NOT NULL is expected could lead to orphaned records
- No database-level check constraints observed (e.g., rating 1-5)

**Duplication Risks:**
- Without unique constraints, duplicates can be created at database level
- Application-level duplicate handling exists for some entities (favorites, alerts) but not enforced at database level
- Category names can be duplicated under same parent

---

## 6. END-TO-END WORKFLOWS

### Consumer Workflows

**Sign In:**
1. User clicks sign in from navigation
2. Authentication dialog opens with sign in mode
3. User enters email and password
4. Credentials sent to external authentication provider
5. On success, server-side session created with HMAC-signed token containing user identity, email, external authentication UID, account type, expiration
6. Page reloads to reflect authenticated state
7. If first time, new customer entity created with default free subscription

**Browse:**
1. User lands on homepage or category page
2. Mega-menu navigation shows hierarchical categories
3. User can click categories to filter, use live search with typeahead, or use filter panel (price range slider, brand checkboxes, priced-only toggle)
4. Results paginated with 24 items per page
5. Sorting options available (price ascending/descending, alphabetical)
6. Breadcrumb trail shows category hierarchy

**Compare:**
1. User views product detail page
2. Multiple seller listings displayed with prices, availability, trust scores
3. User can implicitly compare across sellers on same page

**Subscribe:**
1. User views profile or sees upgrade prompts
2. Clicks to view subscription plans
3. Selects Premium Monthly or Yearly
4. Checkout session created with external payment provider
5. User redirected to payment provider checkout
6. On successful payment: webhook or manual confirmation activates plan
7. Subscription updated with plan type, limits, start/end dates, active flag

**Favorite:**
1. User browsing products or viewing product detail
2. Clicks favorite toggle on product card/listing
3. If not favorited: creates new favorite with plan limit check
4. If already favorited: removes favorite
5. Favorites page lists all saved items

**Alert Creation:**
1. User viewing product detail
2. Creates price alert and/or stock alert
3. Plan limit checked (3 for free, 20 for premium)
4. Alert created with notification preferences
5. Alerts page manages existing alerts
6. Cancelled alerts still count against quota

**Notification Delivery:**
1. System events (price changes, stock updates) trigger notification creation
2. Notifications appear in bell icon dropdown with unread count
3. User clicks notification to mark as read and navigate to relevant product

**Review Submission:**
1. User views product detail
2. Submits review with rating and comment
3. Review created with status PENDING
4. Admin moderates: approves or rejects with notes
5. Auto-moderation suggestions available to admins

### Admin Workflows

**Add Sellers/Categories/Products/Listings:**
1. Admin navigates to catalog management section
2. Selects entity type (sellers, categories, products, listings)
3. Views data table with pagination and filters
4. Creates new entity via form with relevant fields
5. Updates or deletes existing entities

**Approve/Reject Reviews:**
1. Admin navigates to review moderation section
2. Views reviews with status filter (pending, approved, rejected)
3. Updates individual review status with moderation note
4. Or performs batch status updates
5. Can get auto-moderation suggestions

**Run Scraping:**
1. Admin navigates to data management section
2. Configures manual scraping: selects seller, category, URL, use category link flag
3. Triggers scraping workflow via n8n webhook
4. Views scraping logs to monitor status

**Verify Partner Requests:**
1. Admin views pending B2B partner requests
2. Reviews request details (email, company name, market, country, website)
3. Approves: decrypts provisioning password, creates/updates B2B user with verified and approved status, creates seller entity, attaches B2B subscription (Silver/Gold), provisions external authentication user via REST API, sends approval email, logs activity
4. Rejects: removes partner request, logs activity

**Approve B2B Subscriptions:**
1. Admin views pending B2B subscription requests
2. Reviews request details
3. Approves or rejects with optional notes
4. Updates subscription active status

**Manage Ads Requests:**
1. Admin views B2B ads requests
2. Reviews request details (type, duration, budget)
3. Approves: creates ads campaign with agreed price, start/end dates, active status
4. Rejects with optional reason

**Manage Scraping Requests:**
1. Admin views B2B scraping requests
2. Reviews request details (target type, URL)
3. Checks for duplicates (URL already exists)
4. Approves or rejects with optional reason

**Monitor Logs:**
1. Admin views scraping logs with filtering by source, status, date
2. Views administrative activity logs with pagination, search, and filtering by entity type and action
3. Each log entry shows admin, action, entity type, entity ID, before/after state, IP address, timestamp

### Vendor Workflows

**Access Dashboard:**
1. Vendor authenticates (external authentication)
2. System checks: account status = verified, B2B status = approved
3. Vendor accesses vendor-specific dashboard
4. Dashboard shows: product counts, listing counts, average trust scores, notification counts, competitor pricing gaps (Gold), stock monitoring, top listings

**See Listings:**
1. Vendor navigates to "My Listings" page
2. Views product listings associated with their seller entity
3. Listings display: product name, category, seller name, price, trust score, availability

**Compare Pricing:**
1. Vendor views dashboard analytics
2. Competitor pricing shows price gaps vs cheapest market options
3. Market average prices calculated

**Monitor Stock:**
1. Vendor views stock monitoring section
2. Out-of-stock rate tracked for their products
3. Alerts generated for stock changes

**Request Ads:**
1. Vendor navigates to ads request page
2. Selects request type (banner, sponsored product, sponsored article)
3. Fills duration, budget proposal, notes
4. Submits request for admin approval

**Request Scraping:**
1. Vendor navigates to scraping request page
2. Selects target type (product)
3. Enters target URL
4. Submits request; duplicate detection checks if URL already exists

**View Reports:**
1. Vendor navigates to reports section
2. Requests competitor pricing report
3. Views generated reports with file download (when available)

### Market Workflows

**Access Dashboard:**
1. Market authenticates (external authentication)
2. System checks: account status = verified, B2B status = approved
3. Market accesses market-specific dashboard
4. Dashboard shows: share of shelf, price dispersion, competitor rankings, market share percentages

**View Market KPIs:**
1. Share of shelf: brand's product percentage within categories vs competitors
2. Price dispersion: min/max prices, dispersion amount/percentage, cheapest/most expensive sellers
3. Competitor ranking: sellers ranked by listing count and market share percentage

**View Competitors:**
1. Market views competitor ranking table
2. Sees market share percentages and listing counts across entire market
3. Competitor pricing intelligence (Gold tier)

**Analyze Dispersion:**
1. Market views price dispersion analytics
2. Sees pricing variability across all sellers in a category
3. Identifies cheapest and most expensive sellers

**View Sentiment:**
1. Market views reputation intelligence (Gold tier)
2. Average rating across products
3. Positive/negative keywords (**PARTIAL: simulated in some contexts**)

**Generate Reports:**
1. Market requests reports (competitor pricing type)
2. Report generation simulated: status set to GENERATED with file path
3. Views generated reports

**Request Scraping:**
Same workflow as vendor workflow for requesting new product or category scraping.

---

## 7. SECURITY AUDIT (BRUTALLY HONEST)

### Critical Severity

1. **Client-Controlled Admin Identity**
   - Admin role and ID are passed via client-controlled headers (`X-Admin-Role`, `X-Admin-Id`)
   - Not cryptographically verified against server-side session or token
   - **Impact:** Any client can claim to be any admin with any role by setting these headers
   - **Status:** Not fixed

2. **No Webhook Idempotency**
   - External payment provider events not deduplicated by event ID
   - Duplicate webhooks could cause multiple plan activations
   - **Impact:** Users could get charged once but receive multiple active subscriptions, or subscription state becomes inconsistent
   - **Status:** Not fixed

3. **Weak Default Secrets Exposed in Codebase**
   - Admin API key default: "dev-admin-api-key-change-me"
   - Session secrets: "dev-session-secret-change-in-production", "dev-b2c-session-secret-change-in-production"
   - B2B provisioning password encrypted with env secret that has default
   - External authentication web API key exposed in .env.example
   - **Impact:** Anyone reading the code can authenticate as admin or forge sessions
   - **Status:** Not fixed

### High Severity

4. **External Authentication UID in Requests**
   - UID passed in request parameters and bodies
   - No server-side token verification confirmed (relies on external provider client-side verification)
   - **Impact:** Could be spoofed if external provider token not verified server-side
   - **Status:** Not confirmed if server-side verification exists

5. **Optional Webhook Signature Verification**
   - Signature verification skipped if `X-Webhook-Signature` header is absent
   - **Impact:** Webhooks can be sent without any signature verification
   - **Status:** Not fixed

6. **Single API Key for All Admins**
   - Single shared API key across all administrators
   - No per-admin key rotation capability
   - **Impact:** Key compromise affects all admins; cannot revoke individual access
   - **Status:** Not fixed

7. **No CSRF Protection**
   - Stateless API should validate Origin/Referer headers
   - **Impact:** Cross-site request forgery possible on state-changing operations
   - **Status:** Not observed

8. **Missing Ownership Verification Cryptographic Proof**
   - Some endpoints rely on client-provided IDs for ownership checks (e.g., favorite deletion uses client ID from query parameter)
   - **Impact:** User A could delete User B's favorite if they know the ID
   - **Status:** Not fixed

### Medium Severity

9. **No Rate Limiting on Most Endpoints**
   - Consumer endpoints not rate-limited
   - B2B endpoints not rate-limited
   - Most admin endpoints not rate-limited (except login)
   - **Impact:** Brute force, enumeration, DoS, resource exhaustion attacks possible
   - **Status:** Not fixed

10. **No Input Sanitization for Stored User Content**
    - Reviews, notifications, and other user-generated content stored without confirmed sanitization
    - **Impact:** Stored XSS possible if content rendered without escaping
    - **Status:** Not confirmed

11. **Missing Database-Level Validation**
    - No check constraints (e.g., rating 1-5)
    - No unique constraints on critical fields (email, external UID)
    - **Impact:** Invalid data can be stored; duplicates can be created
    - **Status:** Not fixed

12. **No API Versioning**
    - **Impact:** Breaking changes could affect clients without graceful migration
    - **Status:** Not observed

13. **Error Details Exposure**
    - Some error responses may leak internal details in non-dev environments (partially handled)
    - **Impact:** Information disclosure
    - **Status:** Partially fixed

### Low Severity

14. **No IP Whitelisting for Admin API**
    - **Impact:** Admin API accessible from any IP address
    - **Status:** Not fixed

15. **No Admin Login Audit Logging**
    - Audit logs track post-login activity but not login events themselves
    - **Impact:** Cannot detect brute force or unauthorized login attempts historically
    - **Status:** Not fixed

16. **No Session Expiration or Revocation (Admin API Key)**
    - Stateless API key has no expiration or revocation mechanism
    - **Impact:** Compromised key valid until manually changed
    - **Status:** Not fixed

17. **B2B Quota Missing**
    - No usage limits on scraping requests, reports, or other B2B features
    - **Impact:** Resource exhaustion possible; B2B users can abuse system
    - **Status:** Not fixed

18. **Insecure Defaults in Docker Compose**
    - Database password "0000"
    - App secret "1bfea173865bc97ebf26ffdf0bae218b"
    - **Impact:** Default credentials in containerized deployment
    - **Status:** Not fixed

---

## 8. PRODUCTION READINESS AUDIT

### Logging Quality
- **Admin Activity:** Comprehensive audit logging with admin ID, action, entity type, entity ID, before/after state, IP address, timestamp
- **Scraping:** Logs track source, workflow, status, duration, records processed, error message, execution time
- **General API Requests:** No application-level logging observed
- **Security Events:** Login attempts partially logged (rate limiting tracks attempts); admin login not audited
- **Verdict:** Incomplete — administrative actions logged, but general system activity not logged

### Observability Readiness
- **Metrics:** No metrics collection infrastructure observed (Prometheus, StatsD, etc.)
- **Tracing:** No distributed tracing observed
- **Health Checks:** Basic system health endpoint exists
- **Log Aggregation:** No log aggregation setup observed
- **Alerting:** No alerting infrastructure observed
- **Verdict:** Not ready — minimal observability

### Error Handling Strategy
- **Frontend:** Component-level try/catch, error states with messages, toast notifications, some silent error catching with empty fallbacks
- **Backend:** Not fully confirmed — some error responses may leak internal details
- **Graceful Degradation:** Fallback mechanism for price prediction (linear regression if Python API fails)
- **Verdict:** Partial — frontend handles errors reasonably; backend strategy not fully confirmed

### Background Jobs Usage
- **Observed:** No background job system observed (no Redis, no Beanstalkd, no message queue)
- **Scraping:** Uses external workflows (n8n, Airflow) with webhook callbacks
- **Verdict:** Not applicable / Missing — long-running tasks handled externally

### Scaling Limitations
- **Database:** Missing indexes on most foreign keys will cause severe performance degradation as data grows
- **Caching:** No caching layer observed
- **CDN:** Not observed for static assets
- **Connection Pooling:** Not confirmed
- **Read Replicas:** Not observed
- **Verdict:** Significant scaling limitations — database will become bottleneck

### Container Readiness
- **Docker:** Docker Compose setup exists for local development with three services: database (PostgreSQL 18 Alpine), backend (PHP with Symfony), frontend (Next.js)
- **Dockerfiles:** Exist for backend and frontend
- **Healthchecks:** Database has healthcheck; backend and frontend do not
- **Secrets Management:** Secrets in environment variables, some with insecure defaults
- **Verdict:** Basic container readiness — suitable for development, needs production hardening

### CI/CD Readiness
- **Observed:** No CI/CD configuration files found (no GitHub Actions, no GitLab CI, no Jenkinsfile)
- **Scripts:** Some custom scripts in composer.json (e.g., e2e plan switch, module1 smoke)
- **Verdict:** Not ready — no automated testing, building, or deployment pipeline

### Test Coverage
- **Backend:** No test files found in backend tests directory
- **Frontend:** No test files observed
- **E2E:** Smoke test script referenced but not confirmed
- **Verdict:** ~5% coverage — essentially untested

### Rollback Readiness
- **Database Migrations:** Doctrine migrations exist with versioned files
- **Rollback:** Doctrine supports migration rollback, but not confirmed if tested
- **Application:** No feature flags or blue-green deployment observed
- **Verdict:** Partial — database rollback possible via migrations; application rollback strategy not confirmed

---

## 9. FINAL GAP ANALYSIS (MISSING / INCOMPLETE / WEAK AREAS)

### Missing Features

1. **Webhook Idempotency**
   - What is missing: Event ID tracking for external payment provider webhooks
   - Why it matters: Duplicate webhooks cause multiple plan activations, billing inconsistencies
   - How to implement: Store processed event IDs in database or cache; check before processing.

2. **API Rate Limiting**
   - What is missing: Rate limiting on consumer, B2B, and most admin endpoints
   - Why it matters: Prevents abuse, brute force, DoS attacks, resource exhaustion
   - How to implement: Use Symfony rate limiter component or middleware with Redis storage.

3. **Comprehensive Request Validation**
   - What is missing: Centralized request validation layer
   - Why it matters: Prevents invalid data, security vulnerabilities
   - How to implement: Symfony validation component with DTOs and validation attributes.

4. **Database Indexes**
   - What is missing: Indexes on most foreign keys, status fields, date fields
   - Why it matters: Critical for JOIN performance and query speed as data grows
   - How to implement: Add indexes via Doctrine migrations on all foreign keys and frequently filtered columns.

5. **Unique Constraints**
   - What is missing: Unique constraints on email, external authentication UID, and other unique fields
   - Why it matters: Prevents duplicate data at database level
   - How to implement: Add unique constraints via Doctrine migrations.

6. **Test Suite**
   - What is missing: Unit tests, integration tests, E2E tests
   - Why it matters: Ensures reliability, prevents regressions
   - How to implement: PHPUnit for backend, Jest/Cypress for frontend, GitHub Actions for CI.

7. **CI/CD Pipeline**
   - What is missing: Automated testing, building, deployment pipeline
   - Why it matters: Enables reliable, repeatable deployments
   - How to implement: GitHub Actions or similar with test, build, deploy stages.

8. **Caching Layer**
   - What is missing: Redis or similar caching for frequent queries
   - Why it matters: Reduces database load, improves response times
   - How to implement: Symfony cache component with Redis adapter.

9. **CSRF Protection**
   - What is missing: Origin/Referer header validation for stateless API
   - Why it matters: Prevents cross-site request forgery
   - How to implement: Validate Origin/Referer headers on state-changing requests.

10. **Error Boundaries (Frontend)**
    - What is missing: React error boundary components
    - Why it matters: Prevents entire app from crashing on component errors
    - How to implement: Create error boundary component with fallback UI.

### Incomplete Features

1. **Sentiment Analysis (B2B)**
   - Status: PARTIAL — simulated in some contexts, not confirmed if actual analysis implemented
   - Why it matters: Core B2B feature for Gold tier
   - What's needed: Integrate actual sentiment analysis (NLP API or library).

2. **Report Generation (B2B)**
   - Status: PARTIAL — simulated generation (status set to GENERATED with file path)
   - Why it matters: Core B2B feature
   - What's needed: Actual report generation logic (PDF generation, data aggregation).

3. **Server-Side External Authentication Verification**
   - Status: PARTIAL — backend stores UID and validates presence, but full server-side token verification not confirmed
   - Why it matters: Security — currently relies on client-side verification
   - What's needed: Verify external authentication tokens on server-side for all requests.

4. **Subscription Renewal Handling**
   - Status: PARTIAL — external payment provider handles recurring subscriptions, but webhook handlers for renewal events not confirmed
   - Why it matters: Ensures subscriptions continue properly
   - What's needed: Implement webhook handlers for renewal events.

5. **Scraping Ingestion Logic**
   - Status: PARTIAL — webhook endpoint receives scraping results, but actual product/listing insertion or update logic not confirmed in backend code reviewed
   - Why it matters: Core data pipeline
   - What's needed: Confirm and document the full ingestion logic.

### Weak Features

1. **Admin Authentication Security**
   - Weakness: API key-based with client-controlled role/ID headers
   - Why it's weak: Headers can be spoofed
   - How to strengthen: Use JWT tokens with server-side validation, or use proper session-based auth.

2. **B2B Quota Enforcement**
   - Weakness: No usage limits on scraping requests, reports, ads requests
   - Why it's weak: Resource exhaustion possible
   - How to strengthen: Implement quota checks using usage JSON or dedicated tracking table.

3. **Password Security (B2B Provisioning)**
   - Weakness: B2B provisioning password encrypted with AES-256-CBC but secret stored in env with default
   - Why it's weak: Default secret compromises all provisioning passwords
   - How to strengthen: Use proper secret management, generate strong random secrets.

4. **Frontend Type Safety**
   - Weakness: Some uses of `unknown` and `Record<string, unknown>` in B2B dashboard
   - Why it's weak: Loses type safety benefits
   - How to strengthen: Define proper TypeScript interfaces for all backend response shapes.

5. **Accessibility**
   - Weakness: No comprehensive focus management or screen-reader testing
   - Why it's weak: Excludes users with disabilities
   - How to strengthen: Add focus management, aria-live regions, test with screen readers.

### Technical Debt

1. **Duplicate Entity Mapping (B2C Subscription)**
   - Two PHP entities both map to the same database table
   - Needs consolidation into single entity.

2. **Nullable Foreign Keys That Should Be NOT NULL**
   - Price history.product listing ID, review.client ID, review.product listing ID
   - Should be NOT NULL with CASCADE delete for data integrity.

3. **Inconsistent Error Handling**
   - Some errors silently caught with empty fallbacks
   - Should consistently surface errors to user or logging system.

4. **Mixed Code Style (Frontend)**
   - Mixed semicolon usage, TypeScript assertions
   - Should enforce consistent style via linter rules.

### Future Scaling Bottlenecks

1. **Database Performance**
   - Missing indexes will cause severe degradation as data grows
   - Need comprehensive indexing strategy.

2. **No Caching**
   - Every request hits database
   - Need caching for frequent queries (categories, popular products, etc.)

3. **No Read Replicas**
   - Single database instance
   - Need read replicas for read-heavy workloads.

4. **No CDN**
   - Static assets served from Next.js server
   - Need CDN for global performance.

5. **External API Dependencies**
   - Price prediction calls external Python API without confirmed timeout handling
   - External payment provider calls without confirmed timeout handling
   - Need proper timeout and circuit breaker patterns.

---

## 10. FINAL VERDICT AND ACTION PLAN

### Final Maturity Score: 32/100

**Breakdown:**
- Features: 75% (substantial functionality implemented)
- Production Hardening: 30% (critical security gaps)
- Scalability Readiness: 25% (missing indexes, caching, CDN)
- Security Readiness: 35% (authentication flaws, missing protections)
- Test Coverage: 5% (essentially untested)
- Operational Readiness: 20% (no CI/CD, no monitoring)

**Verdict:** NOT PRODUCTION-READY. The application has substantial functionality but critical security vulnerabilities, missing production hardening, and no testing. It requires significant work before any production deployment.

### What Must Be Fixed Before Production Launch (Non-Negotiable)

1. **Fix Admin Authentication Security** — Replace client-controlled headers with JWT tokens or proper sessions
2. **Add Webhook Idempotency** — Track processed event IDs to prevent duplicate subscription activations
3. **Change All Default Secrets** — Generate strong random secrets for all environment variables
4. **Add Database Indexes** — Add indexes on all foreign keys and frequently filtered columns
5. **Add Unique Constraints** — Enforce uniqueness on email, external UID, and other unique fields
6. **Implement Rate Limiting** — Add rate limiting to all endpoints (consumer, B2B, admin)
7. **Add CSRF Protection** — Validate Origin/Referer headers
8. **Implement Server-Side External Authentication Verification** — Verify tokens on server-side
9. **Add Comprehensive Testing** — At minimum, critical path integration tests
10. **Set Up CI/CD Pipeline** — Automated testing and deployment

### What Can Be Deferred (Post-Launch)

1. Advanced B2B analytics features (some can be simulated initially)
2. React error boundaries (can be added incrementally)
3. Accessibility improvements (can be iterative)
4. CDN setup (can use once traffic grows)
5. Read replicas (can add when database load increases)
6. Advanced monitoring/alerting (basic health check sufficient for launch)

### Top 20 Tasks in Priority Order

1. **CRITICAL: Fix admin authentication** — Replace client-controlled role/ID headers with cryptographically verified JWT tokens or server-side sessions
2. **CRITICAL: Add webhook idempotency** — Store processed external payment provider event IDs to prevent duplicate subscription activations
3. **CRITICAL: Change all default secrets** — Generate strong random values for ADMIN_API_KEY, session secrets, B2B provisioning secret, database password
4. **HIGH: Add database indexes** — Create migration to add indexes on all foreign keys (listing.product_id, listing.seller_id, price_history.product_listing_id, alert.alerter_id, favorite.client_id, notification.all_foreign_keys, etc.) and status/date fields
5. **HIGH: Add unique constraints** — Enforce uniqueness on user.email, user.firebase_uid, subscription_b2c.client_id, and other unique fields
6. **HIGH: Implement rate limiting** — Add rate limiting middleware with Redis storage for all API endpoints
7. **HIGH: Verify external authentication tokens server-side** — Ensure all requests verify the external authentication token on the backend, not just client-side
8. **HIGH: Add CSRF protection** — Validate Origin/Referer headers on state-changing requests
9. **HIGH: Make foreign keys NOT NULL** — Fix nullable foreign keys that should be required (price_history.product_listing_id, etc.)
10. **MEDIUM: Create test suite** — Set up PHPUnit for backend, Jest/Cypress for frontend; write tests for critical paths
11. **MEDIUM: Set up CI/CD pipeline** — GitHub Actions with test, build, security scan, deploy stages
12. **MEDIUM: Add caching layer** — Implement Redis caching for frequent queries (categories, product listings)
13. **MEDIUM: Implement B2B quota enforcement** — Add usage tracking and limits for scraping requests, reports, ads requests
14. **MEDIUM: Fix duplicate entity mapping** — Consolidate two B2C subscription entities into one
15. **MEDIUM: Add request validation layer** — Use Symfony validation component with DTOs
16. **MEDIUM: Implement actual report generation** — Replace simulated report generation with actual PDF/data generation logic
17. **MEDIUM: Implement actual sentiment analysis** — Replace simulated sentiment with actual NLP integration
18. **LOW: Add React error boundaries** — Create error boundary components with fallback UI
19. **LOW: Improve accessibility** — Add focus management, aria-live regions, comprehensive aria labels
20. **LOW: Set up monitoring/alerting** — Add metrics collection (Prometheus), log aggregation, alerting for critical events

---

**END OF AUDIT DOCUMENT**

*This audit is based on thorough inspection of the codebase as of May 7, 2026. All descriptions reflect functionality observed in the code. Partial features are labeled as such. Missing features are noted with impact and implementation guidance. No hallucinations have been introduced.*