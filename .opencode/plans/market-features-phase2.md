# Market Features — Phase 2 Implementation Plan

## Priority Order (by impact/effort)
1. Global Brand Filter (highest impact, lowest effort)
2. Product Comparison (supervisor requested, data exists)
3. Share of Shelf deltas
4. Market Alerts (5 notification types)
5. Reports (CSV exports)

---

## 1. Global Brand Filter on Dashboard

### Backend
- Add `brand` query parameter to all dashboard KPI endpoints:
  - `GET /api/b2b/workspace?endpoint=brand-scope&brand=Samsung`
  - Share of shelf endpoint: add `WHERE p.brand = :brand`
  - Price dispersion endpoint: add brand filter
  - Competitor ranking: add brand filter
- Each endpoint: if `brand` param present, add `AND LOWER(p.brand) = LOWER(:brand)` to WHERE clause

### Frontend
- Add dropdown at top of Dashboard showing all brands (from brand_summary)
- Pass selected brand as query param to all API calls
- Update KPI cards to show "Samsung: 23% avg shelf share" when brand selected

### Files to change
- `backend/src/Controller/B2BWorkspaceController.php` — brand-scope, brand-products, KPI endpoints
- `backend/src/Service/*.php` — any service with share of shelf / dispersion queries
- `frontend/app/B2B/dashboard/page.tsx` — global brand dropdown component

---

## 2. Product Comparison (iPhone vs Samsung)

### Backend — new endpoint
```
GET /api/b2b/market/compare?product_ids=1,2,3&category_id=5
```
Returns per product_id:
- lowest_price, avg_trust, oos_rate_30d, review_count, avg_rating
- active_sellers_count, price_dispersion_pct

**Implementation**: `B2BWorkspaceController.php`
```php
public function compareProducts(Request $request, EntityManagerInterface $entityManager): JsonResponse
{
    $productIds = array_map('intval', explode(',', $request->query->get('product_ids', '')));
    // Per product: query price_history, listings, reviews
    // Return metrics[]
}
```

### Frontend — new page or section
- Category selector → multi-select products → comparison table
- Reuse Recharts LineChart for price history overlay
- Files: `frontend/app/B2B/dashboard/compare/page.tsx`

---

## 3. Share of Shelf Deltas

### Weekly snapshot storage
- New table or JSON column: `B2BMarket.share_of_shelf_history` (JSON array)
  ```json
  [
    {"week": "2026-W19", "brand": "Samsung", "category": "Smartphones", "share": 30.5},
    {"week": "2026-W20", "brand": "Samsung", "category": "Smartphones", "share": 27.2}
  ]
  ```
- Snapshot job: run weekly OR triggered after each scraping run
- Compare current vs previous snapshot → delta

### Display
- Each bar in share of shelf chart: "30% ▲ 3%" or "27% ▼ 1%"
- Tooltip: "Was 27% last week, now 30%"

### Files to change
- `backend/src/Entity/B2BMarket.php` — add share_of_shelf_history column
- `backend/src/Service/B2BShareOfShelfService.php` — add snapshot+delta logic
- `backend/src/Command/ComputeShelfSnapshotCommand.php` — new CLI command
- `frontend/app/B2B/dashboard/page.tsx` — update chart

---

## 4. Market Alerts (5 types)

All write to existing `notifications` table. Types: MARKET_BRAND_OOS, MARKET_PRICE_SPIKE, MARKET_SHELF_DROP, MARKET_SENTIMENT_SHIFT, MARKET_PLAN_EXPIRY.

### 4a. Brand OOS at N sellers
**Trigger**: During scraping, for each followed Brand X product, count OOS listings
- If same product now OOS at >= 3 sellers (and was in stock at >= 2 last scrape)
- Write notification to all market accounts following Brand X

### 4b. Price spike detection
**Trigger**: After scraping run, compare avg category price vs previous run
- If avg price up > 8% in one cycle → notify all market accounts in sector

### 4c. Shelf share drop
**Trigger**: After weekly snapshot stored
- If brand share dropped > 5pp vs previous week → notify followers

### 4d. Sentiment shift
**Trigger**: After admin approves review batch
- If brand NSS dropped > 10 points → notify followers

### 4e. Plan expiry warning
**Trigger**: Every request, check subscription.end_date
- If <= 10 days → once/24h notification + email + orange banner

### Files to change
- `backend/src/Service/MarketAlertService.php` — new service with all alert types
- `backend/src/EventListener/ScrapingAlertSubscriber.php` — event hooks during ingestion
- `backend/src/Controller/B2BWorkspaceController.php` — alert listing endpoint
- `frontend/app/B2B/dashboard/notifications/page.tsx` — alert feed UI

---

## 5. Reports — Real CSV Exports

### Share of Shelf export
```
GET /api/b2b/market/reports/share-of-shelf/export?period=2026-05
```
Columns: brand, category, share_percent, listing_count, avg_trust, period
~20 lines PHP. Stream as CSV response.

### Price Dispersion export
```
GET /api/b2b/market/reports/price-dispersion/export?period=2026-05
```
Columns: product, brand, category, min_price, max_price, range, dispersion_pct

### Stock Out report
```
GET /api/b2b/market/reports/stock-out/export?period=2026-05
```
Query price_history WHERE out_of_stock = true. Columns: product, brand, seller, first_oos_date, duration_days, current_status

### Baromètre Mensuel (flagship)
```
GET /api/b2b/market/reports/barometre/export?period=2026-05
```
Multi-section CSV: cover, shelf share, dispersion, top products, OOS incidents, sentiment, search queries, market gaps

### All in:
- `backend/src/Controller/B2BReportController.php` — new controller with 4 export endpoints
- Stream CSV responses with Symfony's StreamedResponse
- No PDF generation (CSV first, PDF if time permits)

---

## Implementation Order

| Step | Feature | Effort | Dependencies |
|------|---------|--------|-------------|
| 1 | Brand filter drop-down on dashboard | 2h | None |
| 2 | Product comparison (backend) | 1h | None |
| 3 | Product comparison (frontend) | 2h | Step 2 |
| 4 | Share of shelf snapshots + deltas | 3h | Shelf query exists |
| 5 | Market alerts (OOS + price spike) | 4h | Notification table exists |
| 6 | Market alerts (shelf + sentiment + expiry) | 2h | Step 5 infrastructure |
| 7 | Reports — CSV exports | 3h | Data queries exist |

**Total: ~17h of work**
