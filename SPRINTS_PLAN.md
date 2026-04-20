# 📋 SPRINTS PLAN - RadarWebTN

**Project:** RadarWebTN - Economic Intelligence Platform in Tunisia  
**Target:** MVP Phase 1-3 (3-9 months)  
**Stack:** Symfony (Backend) + Next.js (Frontend) + PostgreSQL

---

## 🎯 VISION OVERVIEW

### 4 Pillars "Radar"
1. **Radar Price** - Real-time comparison + History
2. **Radar Quality** - Verified reviews + Anti-Fake
3. **Radar Alerts** - Smart notifications (price/market)
4. **Trust Score** - Rating /10 per offer + seller

---

## 📅 SPRINTS ARCHITECTURE

### **PHASE 1 - MVP (Months 1-3) : Foundation**
Launch on 1 sector, **4 sites max** (expandable), prices + basic score + email alerts

---

## SPRINT 1.1 - BACKEND DATA & API (Week 1-2)

### Objective
Structure database, core API endpoints, scraping foundation

### Backend Tasks
- ✅ **Database Schema Finalization**
  - Current Entities: Product, ProductListing, Category, PriceHistory, Seller
  - Add: `TrustScore`, `Review`, `Alert`, `Sector`
  - Migrations for relationships

- ✅ **API REST Endpoints (Symfony)**
  ```
  GET  /api/products                    (list + filter by category)
  GET  /api/products/{id}               (detail + listings)
  GET  /api/products/{id}/price-history (chart data)
  GET  /api/sellers/{id}                (seller profile + score)
  POST /api/alerts/subscribe            (email alerts)
  ```

- ✅ **Repository Methods**
  - ProductRepository: search by category, price range
  - PriceHistoryRepository: get history by date range
  - SellerRepository: calculate trust score

### Frontend Tasks (Infrastructure)
- ✅ Setup API client (axios/fetch utilities)
- ✅ Define TypeScript interfaces (Product, Listing, PriceHistory, TrustScore)
- ✅ Setup Redux/Context for global state

### Database
- ✅ Add tables: `trust_scores`, `reviews`, `alerts`, `sectors`
- ✅ Relationships & cascade rules
- ✅ Indices on searched columns (name, price, seller_id)

---

## SPRINT 1.2 - PRICE COMPARISON UI (Week 3-4)

### Objective
Display real-time price comparison for 1 sector

### Frontend Tasks
- ✅ **Search Page (B2C)**
  - Search input (product name, brand, ID) ← ALREADY DONE
  - Filters: Category, Price range, Seller
  - Results display: Table with [Product | Price | Seller | Stock?]

- ✅ **Product Details Page**
  - Product info (name, brand, image, specs)
  - Multi-site listings table (price, seller, availability)
  - Price history chart (recharts) ← ALREADY DONE with out_of_stock
  - CTA: "Visit [Seller]"

- ✅ **Responsive & Mobile**
  - Mobile-first design (Shadcn/Tailwind)

### Backend Support
- ✅ GET /api/products?category=tech&minPrice=100&maxPrice=5000
- ✅ GET /api/products/{id}/listings?sorted=price
- ✅ Optimize queries (eager loading)

---

## SPRINT 1.3 - TRUST SCORE v1 (Week 5-6)

### Objective
Calculate & display basic trust score /10 per offer + seller

### Backend Tasks
- ✅ **TrustScore Calculation Algorithm**
  ```
  TrustScore = (40% Price Stability 
              + 30% Seller Reputation 
              + 20% Review Quality 
              + 10% Stock Availability) / 10
  ```
  - Price Stability: Price variance vs market average
  - Seller Reputation: Seller score (1-5)
  - Review Quality: Number of verified reviews
  - Stock: % time in stock

- ✅ **TrustScoreRepository + Service**
  - Method: `calculateForListing($listing)`
  - Cache result (Redis) - expires 24h
  - Batch calculation for all listings

- ✅ **API Endpoint**
  ```
  GET /api/products/{id}/trust-scores
  Response: Array of {listing_id, score, breakdown}
  ```

### Frontend Tasks
- ✅ **Trust Score Widget**
  - Display: Large rating /10 (green/orange/red)
  - "RadarDeal Choice" badge (score > 8.0)
  - Breakdown: Pie chart detail (Stability | Reputation | Reviews | Stock)

- ✅ **Listing Card Update**
  - Add trust score badge to each offer
  - Sorting: By Trust Score (default)

---

## SPRINT 1.4 - EMAIL ALERTS (Week 7-8)

### Objective
Allow users to subscribe to price alerts by email

### Backend Tasks
- ✅ **Alert Entity & Repository**
  - Fields: user_id, product_id, alert_type (price_drop, restock), threshold, email
  - Status: active/inactive

- ✅ **Alert Service**
  - Daily cron: Check if alert condition met
  - Send email (Symfony Mailer)
  - Log history

- ✅ **API Endpoints**
  ```
  POST   /api/alerts
  GET    /api/alerts/user (authenticated)
  DELETE /api/alerts/{id}
  PATCH  /api/alerts/{id}/toggle
  ```

### Frontend Tasks
- ✅ **Alert Modal/Form**
  - Product page: "Subscribe to alerts"
  - Inputs: Alert type, threshold, email
  - List of active alerts (user dashboard)

### DevOps
- ✅ Setup Symfony Messenger (job queue for emails)
- ✅ Configure Mailer (SMTP/SendGrid)

---

## SPRINT 1.5 - ADMIN PANEL FOUNDATION (Week 9-10)

### Objective
Admin interface to manage products, sellers, sectors

### Frontend (Admin)
- ✅ **Admin Dashboard**
  - Stats: Total products, listings, alerts, sectors

- ✅ **Products Management**
  - Table: List products (ALREADY DONE)
  - CRUD: Create, Edit, Delete, Bulk actions
  - Search/Filter/Sort

- ✅ **Sellers Management**
  - Table: Vendors + scores
  - Edit: Reputation, notes

- ✅ **Categories/Sectors Management**
  - CRUD categories
  - Sector → categories mapping

### Backend API
- ✅ **Protected Routes (Super Admin)**
  ```
  POST   /api/admin/products
  PUT    /api/admin/products/{id}
  DELETE /api/admin/products/{id}
  POST   /api/admin/sellers
  PUT    /api/admin/sellers/{id}
  ```

### Authentication
- ✅ JWT tokens (already in place)
- ✅ Role-based access (Admin, SuperAdmin)

---

## ✅ PHASE 1 SUMMARY (Week 1-10)
- Multi-site price comparator functional ✓
- Trust Score v1 (price stability + reputation) ✓
- Email alerts ✓
- Admin panel CRUD ✓
- **MVP Testable:** 1 sector, ~10-15 products, alerts

---

## 🔄 SPRINT BACKLOG - ACTIVE (Sprint 1.1 + 1.2)

### **Sprint 1.1 - BACKEND DATA & API (Week 1-2)**
**Velocity:** 21 Story Points | **Status:** In Progress

| #  | Task | SP | Priority | Dependencies | Status |
|----|------|----|----------|--------------|--------|
| 1.1.1 | Migrate existing Entities w/ cascade delete | 5 | 🔴 Critical | None | ✅ Done |
| 1.1.2 | Add TrustScore, Review, Alert, Sector entities | 8 | 🔴 Critical | 1.1.1 | 🔄 In Progress |
| 1.1.3 | Create Doctrine migrations (foreign keys, indices) | 5 | 🔴 Critical | 1.1.2 | 🔄 In Progress |
| 1.1.4 | Build API endpoints: `/api/products/*` | 8 | 🔴 Critical | 1.1.3 | 📋 Todo |
| 1.1.5 | Build API: `/api/sellers/{id}` + trust score calc | 8 | 🔴 Critical | 1.1.4 | 📋 Todo |
| 1.1.6 | Optimize queries (eager loading, N+1) | 5 | 🟡 High | 1.1.5 | 📋 Todo |
| 1.1.7 | Setup Axios API client (TypeScript interfaces) | 5 | 🟡 High | None | 📋 Todo |
| 1.1.8 | Configure Redux/Context state management | 3 | 🟡 High | 1.1.7 | 📋 Todo |
| 1.1.9 | Database backups + deployment setup (PostgreSQL) | 2 | 🟢 Medium | All Backend | 📋 Todo |

**Acceptance Criteria:**
- All Product endpoints tested (Postman ✓)
- DB schema validated (doctrine:schema:validate)
- API response times < 500ms
- All foreign key cascades working

---

### **Sprint 1.2 - PRICE COMPARISON UI (Week 3-4)**
**Velocity:** 18 Story Points | **Status:** In Progress

| #  | Task | SP | Priority | Dependencies | Status |
|----|------|----|----------|--------------|--------|
| 1.2.1 | Search page UI + filters (category, price range) | 5 | 🔴 Critical | 1.1.7 | ✅ Done |
| 1.2.2 | Product search by name, brand, ID | 3 | 🔴 Critical | 1.2.1 | ✅ Done |
| 1.2.3 | Results table: Product + Listings display | 5 | 🔴 Critical | 1.2.1 | 🔄 In Progress |
| 1.2.4 | Product detail page layout | 5 | 🔴 Critical | 1.1.4 | 🔄 In Progress |
| 1.2.5 | Multi-site price comparison table | 5 | 🔴 Critical | 1.2.4 | 📋 Todo |
| 1.2.6 | Price history chart (recharts + out_of_stock markers) | 5 | 🔴 Critical | 1.2.4 | ✅ Done |
| 1.2.7 | CTA buttons: "Visit Seller" (external link) | 3 | 🟡 High | 1.2.5 | 📋 Todo |
| 1.2.8 | Mobile responsive design (Tailwind + Shadcn) | 5 | 🟡 High | All Frontend | 📋 Todo |
| 1.2.9 | Search & filter performance optimization | 3 | 🟢 Medium | 1.2.3 | 📋 Todo |

**Acceptance Criteria:**
- Search returns results in <1s
- Listings table shows 3-4 sites per product (from initial 4)
- Responsive on mobile (375px to 1920px)
- No console errors

---

### **Definition of Done (DoD)**
✅ Code reviewed (peer review)  
✅ Unit tests pass (>80% coverage)  
✅ No TypeScript errors (`tsc --noEmit`)  
✅ No PHP errors (Symfony linter)  
✅ Postman tests pass (API)  
✅ E2E tests (Playwright) pass  
✅ Lighthouse score > 80  
✅ Documented (code comments + API docs)  
✅ Deployed to staging  
✅ QA approved

---

### **Sprint 1.1 + 1.2 Combined Risks & Mitigation**

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| Foreign Key constraint errors on delete | HIGH | MEDIUM | ✅ Added cascade delete (DONE) |
| API slow with many listings | HIGH | MEDIUM | Pagination + Redis cache |
| Mobile design issues | MEDIUM | HIGH | Mobile-first testing early |
| Doctrine schema validation fails | HIGH | LOW | Run `schema:validate` in CI |

---

## 📅 PHASE 2 - CONSOLIDATION (Months 4-6)

---

## SPRINT 2.1 - ADVANCED REVIEWS & ANTI-FAKE (Week 11-12)

### Objective
Centralize reviews, detect fake reviews, sentiment analysis

### Backend Tasks
- ✅ **Review Entity**
  - Fields: product_id, seller_id, rating (1-5), content, verified, source (web scrape vs user input)
  - Timestamps: created, updated

- ✅ **Anti-Fake Detection Service**
  ```
  Check:
  - Duplicate text (cosine similarity)
  - Timing suspicion (20 reviews same day = flag)
  - Sentiment mismatch (text positive but rating 1-star)
  - User credibility (first time reviewer = less weight)
  ```
  - Return: `confidence_score` (0-1) → confidence
  - Flag reviews < 0.3 as "Verify"

- ✅ **Sentiment Analysis**
  - Use NLP library (Python subprocess or external API)
  - Extract keywords: Shipping, Quality, Support, Packaging
  - Aggregated summary: "Fast shipping (95% positive) but no support (40% negative)"

- ✅ **API**
  ```
  GET  /api/products/{id}/reviews (filtered, sorted)
  POST /api/products/{id}/reviews (user review)
  GET  /api/sellers/{id}/reviews-summary
  ```

### Frontend Tasks
- ✅ **Reviews Section (Product Page)**
  - Average rating + distribution (1-5 stars histogram)
  - Verified badge filter
  - Sentiment tags (Shipping | Quality | Support)
  - Pros/Cons summary

- ✅ **User Review Form**
  - Rate + comment
  - Submit (with email verification)

---

## SPRINT 2.2 - PRICE HISTORY DEEP ANALYTICS (Week 13-14)

### Objective
Detect price anomalies, false promos, analyze trends

### Backend Tasks
- ✅ **Anomaly Detection Service**
  ```
  Rules:
  - Price drop > 30% in 1 day → Flag (false promo)
  - Price > 2x median price by category → Flag (abusive)
  - Stock 0 but price published → Inconsistency
  - Promotion claims without real discount → Detection
  ```
  - Add field `price_anomaly_level` (0-1)

- ✅ **Trend Analysis**
  - Average price evolution (daily/weekly)
  - Seasonal patterns
  - Predictive: "Price likely ↓ next week (70% confidence)"

- ✅ **API**
  ```
  GET /api/products/{id}/price-analytics
  Response: {anomalies, trends, forecast}
  ```

### Frontend Tasks
- ✅ **Analytics Chart**
  - Recharts with:
    - Market average (line)
    - Min/Max range (shaded)
    - Seller prices (scatter)
    - Anomaly points (red markers) ← ALREADY DONE
  - Toggle: Daily/Weekly/Monthly

- ✅ **Alerts Section**
  - "🚨 Unusually low price (scam risk)"
  - "📈 Suspicious increase (All sellers +20%)"

---

## SPRINT 2.3 - B2B DASHBOARD BETA (Week 15-16)

### Objective
Dashboard for brands & distributors (Market Intelligence)

### Frontend (B2B)
- ✅ **Competitive Intelligence**
  - Table: Competitors, their prices, Stock volumes, trends
  - Filters: By product, by seller, date range
  - Export: PDF/CSV

- ✅ **Sector Overview**
  - Stats: Avg price, price variation, top sellers
  - Category heatmap: Which products sell well

- ✅ **My Products Repository**
  - Our products vs competitors
  - Price positioning
  - Stock vs demand

### Backend API
- ✅ **Protected Routes (Enterprise)**
  ```
  GET  /api/b2b/competitive-intelligence
  GET  /api/b2b/sector-overview
  GET  /api/b2b/my-products-analysis
  GET  /api/b2b/export/{format}
  ```

- ✅ **Data Aggregation**
  - Daily snapshot (cache)
  - Historical comparison

---

## SPRINT 2.4 - 2 NEW SECTORS LAUNCH (Week 17-18)

### Objective
Expand to 2 new sectors (Paramedical, Home Appliances, etc.)

### Tasks
- ✅ **Data Onboarding**
  - Identify 15-20 new products x sector
  - Configure scraping (Web Scraper Bot or partner APIs)
  - Initial data load

- ✅ **Category Management**
  - Add categories for sectors
  - Sector-specific specs

- ✅ **Testing & Validation**
  - QA: Prices, listings, images correct
  - Launch announcement
  - Monitor price stability

---

## SPRINT 2.5 - REFINED TRUST SCORE v2 (Week 19-20)

### Objective
Improve trust score with reviews & historical data

### Backend Tasks
- ✅ **Updated Algorithm**
  ```
  TrustScore v2 = (35% Price Stability
                 + 25% Seller Reputation  
                 + 25% Review Sentiment
                 + 10% Stock Consistency
                 + 5% Return Rate) / 10
  ```
  - Return Rate: Sourced from sellers
  - Review Sentiment: Integration with Sprint 2.1

- ✅ **Recalculate All Listings**
  - Batch job for historical data

---

## ✅ PHASE 2 SUMMARY (Week 11-20)
- Anti-fake reviews in place ✓
- Sentiment analysis keywords ✓
- Price anomaly detection ✓
- B2B Dashboard launched (beta) ✓
- 3 sectors operational ✓
- Trust Score v2 ✓

---

---

## 📅 PHASE 3 - INTELLIGENCE & SCALE (Month 6+)

---

## SPRINT 3.1 - PREDICTIVE ANALYTICS & AI (Week 21-24)

### Objective
"Predictive Radar" module - ML models for forecasting

### Backend Tasks
- ✅ **ML Models Integration**
  - Time series forecasting: Future prices (ARIMA/Prophet)
  - Demand prediction: Which products will sell
  - Anomaly detection: Advanced (Isolation Forest)

- ✅ **Data Pipeline**
  - Collect historical data (3-6 months min)
  - Train models weekly
  - Serve predictions via API

- ✅ **API**
  ```
  GET /api/predictions/price/{product_id}
  GET /api/predictions/demand/{category_id}
  GET /api/insights/best-time-to-buy/{product_id}
  ```

### Frontend Tasks
- ✅ **Predictive UI**
  - Price forecast graph (confidence interval)
  - "Best time to buy" recommendation
  - "Stock running out soon" alerts

---

## SPRINT 3.2 - MOBILE APP (Week 25-28)

### Objective
Native mobile app (React Native or Flutter)

### Features
- ✅ Search & compare
- ✅ Saved favorites
- ✅ Push notifications (price alerts)
- ✅ Dark mode
- ✅ Offline mode (cache)

---

## SPRINT 3.3 - MONETIZATION & PARTNERSHIPS (Week 29+)

### Features
- ✅ B2B Subscriptions (tiered: Starter/Pro/Enterprise)
- ✅ API access for partners
- ✅ Premium reports (PDF/Excel)
- ✅ Contextual ads (non-intrusive)

---

## ✅ PHASE 3 SUMMARY
- Predictive models in production ✓
- Mobile app (iOS + Android) ✓
- Full monetization ✓
- Market leadership position ✓

---

---

## 🛠️ TECHNICAL DEPENDENCIES & CONSTRAINTS

### Backend (Symfony)
- Doctrine ORM (Entity mapping already done)
- API Platform (optional: auto API generation)
- Messenger (queue jobs: emails, ML training)
- Redis (caching trust scores)
- Mailer (email alerts)

### Frontend (Next.js)
- Recharts (charts/analytics)
- Shadcn/UI (components)
- Tailwind CSS (styling)
- TanStack Query (data fetching)
- Zustand/Context (state management)

### Database (PostgreSQL)
- Indices: (product_id), (seller_id), (category_id), (created_at)
- Partitioning: price_history (by month)
- Backups: Daily

### DevOps
- Docker (Symfony + Next.js containers)
- GitHub Actions (CI/CD)
- Staging environment (test before prod)
- Monitoring (Sentry, LogRocket)

---

## 📊 SUCCESS METRICS (KPIs)

| Phase | Metric | Target |
|-------|--------|--------|
| 1 | Unique visitors | 5,000/month |
| 1 | Alerts created | 500 active subscriptions |
| 2 | B2B subscriptions | 10 paying customers |
| 2 | Products indexed | 5,000+ |
| 3 | MAU (Monthly Active Users) | 50,000+ |
| 3 | Revenue (B2B + Ads) | $5,000+/month |

---

## 🚀 TEAM & TIMELINE

### Development Team
- Backend Dev (Symfony): 1 person
- Frontend Dev (Next.js): 1 person
- DevOps/Database: 0.5 person
- QA/Testing: 0.5 person

### Estimated Duration
- Phase 1 (MVP): 10 weeks (2.5 months)
- Phase 2 (Consolidation): 10 weeks (2.5 months)
- Phase 3 (Intelligence): 8+ weeks (2 months+)

**Total: 6-9 months to full product**

---

## 📝 NOTES & RISKS

### Going Forward
- [ ] Confirm sector prioritization (High-Tech vs Paramedical vs other)
- [ ] Identify partner sources (e-commerce sites, APIs)
- [ ] Setup scraping infrastructure ethically
- [ ] Legal review (GDPR, scraping terms)

### Risk Mitigation
- **Scraping blocks**: Use API partnerships instead
- **Data quality**: Implement validation + manual QA layer
- **Competition**: Focus on trust score differentiation
- **Seller adoption**: Freemium marketing + partnerships

---

## 📞 Sprint Kickoff Checklist

Before Each Sprint:
- [ ] Requirements finalized
- [ ] Figma mockups ready (UI/UX)
- [ ] Database schema approved
- [ ] API specs documented (Swagger/OpenAPI)
- [ ] Test cases written
- [ ] Dependencies resolved (npm/composer updates)
- [ ] Staging environment up

After Each Sprint:
- [ ] Code reviewed
- [ ] Tests passing (unit + integration)
- [ ] Staging deployed & tested
- [ ] Demo to stakeholders
- [ ] Retrospective: What worked, what didn't

---

**Plan created:** 2026-04-01  
**Last Updated:** 2026-04-01  
**Status:** 🟢 Ready for Phase 1 Sprint 1.1
