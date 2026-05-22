# B2B Market — Remaining Gaps Implementation

## Item 1: Global Brand Filter (~3h)

### Context Changes — `frontend/components/B2B/b2b-context.tsx`
1. Add `brandFilter: string | null` state (`useState<string | null>(null)`)
2. Add `setBrandFilter` callback via `useCallback`
3. Modify `refresh()` to include `&brand=${brandFilter}` in the fetch URL when set
4. Export both in `B2BContext.Provider` value object
5. Add both to `B2BContextValue` type and default context value

### Navbar Changes — `frontend/components/B2B/b2b-navbar.tsx`
1. Read `mode`, `brandFilter`, `setBrandFilter`, `summary`, `refresh` from `useB2B()`
2. For market mode: add a `Select` component (shadcn) after the company name
3. Options: "All Brands" (null) + individual brands from `summary.metrics.competitor_brands[i].brand`
4. On change: `setBrandFilter(value)` → `refresh()`

---

## Item 2: Sector Scope for Market Listings (~2h)

### Backend — `backend/src/Controller/B2BWorkspaceController.php`
In `fetchWorkspaceListings()`:
- For `B2BMarket` accounts: query ALL active listings (not filtered by seller or brand)
- Add `?scope=sector` param that queries listings by category matching `company_market`
- Keep existing `?brand=` param working for brand-scoped view

---

## Item 3: Brand Filter Dropdowns (~1.5h)

### Share-of-shelf page — `frontend/app/B2B/dashboard/share-of-shelf/page.tsx`
1. Add brand selector dropdown near page title (market mode only)
2. Options from `summary.metrics.competitor_brands`
3. On change: re-fetch `?endpoint=share-of-shelf&brand=X`

### Price-dispersion page — `frontend/app/B2B/dashboard/price-dispersion/page.tsx`
1. Same pattern as share-of-shelf

---

## Item 4: Server-Side Brand Filter on Stock Intelligence (~0.5h)

### `frontend/app/B2B/dashboard/stock-intelligence/page.tsx`
1. Change client-side brand filter to pass `?endpoint=stock-intelligence&brand=X`
2. Or consume from `useB2B().brandFilter`

---

## Item 5: Bar Delta Annotations (~0.5h)

### `frontend/app/B2B/dashboard/share-of-shelf/page.tsx`
1. In the bar chart `Cell` render, add a `LabelList` or text element showing `▲{delta}%` / `▼{delta}%`
2. Position at end of bar via `<LabelList dataKey="delta" ... />`

---

## Item 6: Rating Gap Column (~0.5h)

### `frontend/app/B2B/dashboard/competitors/page.tsx`
1. Add "Rating Gap" column header after "Avg Trust"
2. Render `item.rating_gap` with color: green if negative (leading), red if positive (lagging)
