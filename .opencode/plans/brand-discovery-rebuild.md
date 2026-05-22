# Brand Discovery Rebuild

## Problem
- Layer 1 returns ALL seller products (Belkin leaks in)
- Layer 3 keyword match too loose
- Three-layer system overengineered and contradictory

## New Architecture: Brand-Only Matching

### `BrandDiscoveryService.php` — Simplified

**Removed:**
- `extractKeywordsFromExpanded()` — no keyword extraction
- `extractSuffixKeywords()` — no suffix extraction  
- `queryThreeLayer()` — no three-layer expansion
- `isModelNumber()` — no longer needed
- `MAX_ITERATIONS`, `ONE_SHOT_RATIO` — unused constants
- All unused NOISE_WORDS entries (kept only those needed for `extractBrandVariations`)

**Kept:**
- `getBrandMatchedProductIds()` — own seller, `p.brand LIKE 'apple%'`
- `extractBrandVariations()` — finds brand variants (apple, apple inc.)
- `findSellersOfProducts()` — finds shared sellers

**Output:** `one_shot_keywords: []`, `suffix_keywords: []` — empty

### `B2BWorkspaceController.php` — Replace 3-layer with brand-only

**`get3LayerProductIds()` rewritten to:**
1. Own seller: brand-matched products only
2. Shared sellers: brand-matched products only
3. No Layer 1 (all seller products)
4. No Layer 3 (keyword match)

**New query logic:**
```sql
-- Own seller brand-matched
SELECT DISTINCT p.id FROM product p
JOIN product_listing pl ON p.id = pl.product_id
WHERE pl.seller_id = :own_seller_id
  AND LOWER(p.brand) IN (:brands)

-- Shared sellers brand-matched  
SELECT DISTINCT p.id FROM product p
JOIN product_listing pl ON p.id = pl.product_id
WHERE pl.seller_id IN (:other_seller_ids)
  AND LOWER(p.brand) IN (:brands)
```

**`brandProducts()` updated:**
- Stats: `own_count` + `shared_count` instead of `layer1/2/3_count`
- `discovery_layer` → `is_own: true/false`
- Filter: `all` | `mine` (own brand-matched) | `shared`

**`brandScope()` updated:**
- Stats match new structure
- No keyword counts

### What appears

| Product | Own seller | Brand match | Shows? |
|---------|-----------|-------------|--------|
| iPhone 15 Pro (Apple) | iStore | apple ✓ | ✓ |
| MacBook Air (Apple) | iStore | apple ✓ | ✓ |
| Câble Apple USB-C (Apple) | iStore | apple ✓ | ✓ |
| Belkin Powerbank (Belkin) | iStore | ✗ | ✗ |
| MacBook Pro (Apple) | OtherSeller | apple ✓ | ✓ (shared) |
| Samsung TV (Samsung) | OtherSeller | ✗ | ✗ |
