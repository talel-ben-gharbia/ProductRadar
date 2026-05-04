# Schema Changes Analysis - Price History & Seller ID

**Date**: May 2, 2026 (Migration: Version20260502120000.php)

## What Changed

### 1. `price_history.seller` Column - REMOVED

**Migration Line**: 
```php
$this->addSql("ALTER TABLE price_history DROP COLUMN IF EXISTS seller");
```

**Why**: 
- **Redundant relationship**: The `seller` column was duplicating data already accessible through:
  - `price_history.product_listing_id` → `product_listing.seller_id` → `seller` table
- **Data integrity risk**: Having seller in two places means seller could be updated in one place but not the other
- **Query efficiency**: Removing it forces queries to use the proper relationship path (more relational, better for normalization)

**Before**:
```
price_history
├── id (PK)
├── recorded_price
├── product_listing_id (FK) → product_listing
├── seller (denormalized copy) ❌ REDUNDANT
└── ...
```

**After**:
```
price_history
├── id (PK)
├── recorded_price
├── product_listing_id (FK) → product_listing → seller
└── ...
```

**To get seller now**:
```php
// Instead of: $priceHistory->seller
// Use: $priceHistory->getProductListing()->getSeller()
```

---

### 2. `b2b_company.seller_id` Column - ADDED

**Migration Line**:
```php
$this->addSql("ALTER TABLE b2b_company ADD COLUMN IF NOT EXISTS seller_id INTEGER DEFAULT NULL");
```

**Why**:
- **B2B business model**: A B2BCompany represents a seller/vendor in the marketplace
- **Link to Seller entity**: Allows efficient queries to find which B2B company owns which seller account
- **Relationship tracking**: Enables multi-tenant queries like "all B2B companies under this seller"

**Schema**:
```
b2b_company
├── id (PK)
├── owner_user_id (FK → user) - User who owns this B2B company
├── seller_id (FK → seller) - The seller this B2B company represents
├── plan_type
└── ...
```

---

## Migration Direction

| Direction | Action |
|-----------|--------|
| **UP** (apply migration) | Drop `price_history.seller` + Add `b2b_company.seller_id` |
| **DOWN** (rollback) | Add back `price_history.seller` + Drop `b2b_company.seller_id` |

---

## Code Impact

### If you're reading price history seller:

**❌ OLD** (no longer works):
```php
$seller = $priceHistory->getSeller(); // Error - property doesn't exist
```

**✅ NEW**:
```php
$seller = $priceHistory->getProductListing()->getSeller();
```

### If you're accessing B2B company seller:

**✅ NOW AVAILABLE**:
```php
$seller = $b2bCompany->getSellerId(); // Can now query seller directly
```

---

## Database Verification

To see current state, run:

```sql
-- Check price_history columns
\d price_history;

-- Check b2b_company columns  
\d b2b_company;

-- Verify relationships
SELECT 
  ph.id,
  ph.recorded_price,
  pl.product_url,
  s.id as seller_id
FROM price_history ph
JOIN product_listing pl ON ph.product_listing_id = pl.id
JOIN seller s ON pl.seller_id = s.id
LIMIT 5;
```

---

## Summary

✅ **Removed redundancy**: Seller no longer duplicated in price_history  
✅ **Added business structure**: B2B companies now have direct seller relationship  
✅ **Improved normalization**: Single source of truth for seller data  

This is a healthy database refactoring - removing denormalization that could cause data inconsistency.
