# B2B API Quick Reference Guide

## Authentication

All B2B endpoints require a valid B2C session cookie and Firebase UID.

**Session Cookie**: `b2c_session`  
**Firebase UID**: User's unique identifier from Firebase Auth

---

## Workspace API Endpoints

### 1. Dashboard Summary
```
GET /api/b2b/workspace/{firebaseUid}/summary
```

**Response:**
```json
{
  "user": {
    "id": 123,
    "company_name": "TechCorp",
    "market": "USA",
    "status": "VERIFIED",
    "role": "B2B_COMPANY"
  },
  "subscription": {
    "plan_type": "PREMIUM",
    "active": true,
    "duration_months": 12,
    "created_at": "2026-05-01T10:00:00Z",
    "activated_at": "2026-05-02T14:30:00Z"
  },
  "metrics": {
    "products_count": 145,
    "listings_count": 280,
    "avg_trust_score": 87.5,
    "notifications_count": 5
  },
  "vendor_metrics": {
    "competitor_pricing": {...},
    "stock_monitoring": {...},
    "opportunities": {...}
  },
  "market_metrics": {
    "share_of_shelf": {...},
    "price_dispersion": {...},
    "competitor_ranking": {...}
  },
  "reputation": {...},
  "demand_intelligence": {...},
  "notifications": [...]
}
```

### 2. List Listings
```
GET /api/b2b/workspace/{firebaseUid}/listings
  ?limit=25
  &offset=0
  &category=ELECTRONICS
  &stock_status=LOW
  &trust_score_min=80
  &trust_score_max=100
  &price_min=10
  &price_max=1000
  &include_anomalies=false
```

**Response:**
```json
{
  "items": [
    {
      "id": 456,
      "product": "Smart Watch",
      "category": "ELECTRONICS",
      "seller": "TechCorp",
      "price": 199.99,
      "trust_score": 92.3,
      "availability": "IN_STOCK",
      "brand": "SomeBrand",
      "updated_at": "2026-05-02T14:30:00Z"
    }
  ],
  "pagination": {
    "limit": 25,
    "offset": 0,
    "total": 280
  }
}
```

### 3. Notifications (Get & Mark as Read)
```
GET /api/b2b/workspace/{firebaseUid}/notifications?limit=25&offset=0
```

```
POST /api/b2b/workspace/{firebaseUid}/notifications
Content-Type: application/json

{
  "id": 789
}
```

**GET Response:**
```json
{
  "items": [
    {
      "id": 789,
      "title": "Low Stock Alert",
      "message": "SKU-123 stock is below threshold",
      "severity": "warning",
      "created_at": "2026-05-02T12:00:00Z",
      "is_read": false
    }
  ],
  "pagination": {...}
}
```

### 4. Ads Requests (List & Create)
```
GET /api/b2b/workspace/{firebaseUid}/ads-requests?limit=25&offset=0

POST /api/b2b/workspace/{firebaseUid}/ads-requests
Content-Type: application/json

{
  "request_type": "BANNER",
  "duration_days": 30,
  "budget_proposal": 5000,
  "target_category": "ELECTRONICS",
  "notes": "High visibility slots preferred"
}
```

**Response (GET):**
```json
{
  "items": [
    {
      "id": 999,
      "request_type": "SPONSORED_PRODUCT",
      "status": "PENDING",
      "budget_proposal": 3500,
      "duration_days": 14,
      "created_at": "2026-05-01T08:00:00Z"
    }
  ],
  "pagination": {...}
}
```

### 5. Scraping Requests (List & Create)
```
GET /api/b2b/workspace/{firebaseUid}/scraping-requests?limit=25&offset=0

POST /api/b2b/workspace/{firebaseUid}/scraping-requests
Content-Type: application/json

{
  "target_type": "PRODUCT_LISTING",
  "target_url": "https://competitor.com/product/xyz",
  "notes": "Monitor competitor pricing"
}
```

**Response:**
```json
{
  "items": [
    {
      "id": 555,
      "target_type": "PRODUCT_LISTING",
      "target_url": "https://competitor.com/product/xyz",
      "status": "PENDING",
      "is_duplicate": false,
      "created_at": "2026-05-01T15:30:00Z"
    }
  ],
  "pagination": {...}
}
```

### 6. Reports
```
GET /api/b2b/workspace/{firebaseUid}/reports?limit=25&offset=0
```

**Response:**
```json
{
  "items": [
    {
      "id": 111,
      "report_type": "MONTHLY_ANALYTICS",
      "status": "GENERATED",
      "period_start": "2026-04-01",
      "period_end": "2026-04-30",
      "file_path": "/reports/2026-04-monthly.pdf",
      "generated_at": "2026-05-01T23:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

## Admin API Endpoints

All admin endpoints require `ROLE_SUPER_ADMIN` or `ROLE_SUB_ADMIN`.

### 1. Approve Subscription
```
POST /api/b2b/admin/subscriptions/{subscriptionId}/approve
```

### 2. Reject Subscription
```
POST /api/b2b/admin/subscriptions/{subscriptionId}/reject
```

### 3. List Subscriptions
```
GET /api/b2b/admin/subscriptions
  ?limit=25
  &offset=0
  &status=PENDING
  &active_only=false
```

### 4. Approve Ads Request
```
POST /api/b2b/admin/ads-requests/{requestId}/approve
Content-Type: application/json

{
  "agreed_price": 2500,
  "starts_at": "2026-05-10T00:00:00Z"
}
```
**Note:** Campaign is created automatically with duration calculated from request's `duration_days`.

### 5. Reject Ads Request
```
POST /api/b2b/admin/ads-requests/{requestId}/reject
Content-Type: application/json

{
  "reason": "Budget exceeds platform limits"
}
```

### 6. List Ads Requests
```
GET /api/b2b/admin/ads-requests
  ?limit=25
  &offset=0
  &status=PENDING
```

### 7. Approve Scraping Request
```
POST /api/b2b/admin/scraping-requests/{requestId}/approve
```

### 8. Reject Scraping Request
```
POST /api/b2b/admin/scraping-requests/{requestId}/reject
Content-Type: application/json

{
  "reason": "Duplicate URL already tracked"
}
```

### 9. List Scraping Requests
```
GET /api/b2b/admin/scraping-requests
  ?limit=25
  &offset=0
  &status=PENDING
```

### 10. Acknowledge Report
```
POST /api/b2b/admin/reports/{reportId}/acknowledge
```

---

## Error Responses

### 401 - Unauthorized
```json
{
  "error": "User not authenticated"
}
```

### 403 - Forbidden
```json
{
  "error": "User not verified as B2B participant"
}
```

### 404 - Not Found
```json
{
  "error": "Resource not found"
}
```

### 422 - Invalid Request
```json
{
  "error": "Invalid parameter: field_name"
}
```

### 500 - Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Common Workflows

### Vendor Onboarding Flow
1. User signs in with B2C credentials
2. Check `/api/b2b/workspace/{firebaseUid}/summary` 
3. If `subscription.active = false`, show "Pending approval" message
4. Once approved by admin, redirect to dashboard

### Ads Campaign Request Flow
1. Vendor calls `POST /api/b2b/workspace/{firebaseUid}/ads-requests`
2. Request stored with status `PENDING`
3. Admin reviews via `GET /api/b2b/admin/ads-requests?status=PENDING`
4. Admin calls `POST /api/b2b/admin/ads-requests/{id}/approve`
5. Campaign created automatically
6. Vendor sees active campaign in dashboard

### URL Scraping Flow
1. Vendor calls `POST /api/b2b/workspace/{firebaseUid}/scraping-requests`
2. Backend checks for duplicates automatically
3. If duplicate found, response includes `is_duplicate: true`
4. Admin reviews via `GET /api/b2b/admin/scraping-requests`
5. Admin approves or rejects

---

## Pagination

All list endpoints support pagination:
- `limit` (default: 25, max: 100)
- `offset` (default: 0)
- Returns `pagination` object with `total` count

---

## Timestamps

All timestamps are ISO 8601 format: `2026-05-02T14:30:00Z`

---

## Status Values

**Subscription Status**: `PENDING`, `APPROVED`, `REJECTED`  
**Ads Request Status**: `PENDING`, `APPROVED`, `REJECTED`  
**Scraping Request Status**: `PENDING`, `APPROVED`, `REJECTED`  
**Report Status**: `PENDING`, `GENERATING`, `GENERATED`, `ACKNOWLEDGED`, `FAILED`  

**Notification Severity**: `info`, `warning`, `error`, `critical`  

---

## Rate Limiting

Not yet implemented. Recommended limits:
- 100 requests per minute per user
- 10,000 requests per hour per company
