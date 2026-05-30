# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server with Turbopack
npm run build      # Production build
npm run lint       # ESLint
npm run format     # Prettier (formats all .ts/.tsx files)
npm run typecheck  # TypeScript type checking (no emit)
```

To add shadcn/ui components:
```bash
npx shadcn@latest add <component-name>
```

## Architecture

This is a **Next.js 16 App Router** frontend that acts as a BFF (Backend for Frontend) — all data fetching goes through Next.js API routes (`app/api/`) which proxy to a separate backend service.

### Backend connection

`BACKEND_URL` is resolved in `utils/admin/constants.ts`:
- `BACKEND_INTERNAL_URL` (server-to-server, e.g. Docker)
- `NEXT_PUBLIC_BACKEND_URL` (fallback)
- Default: `http://127.0.0.1:8000`

### Two user-facing areas

**`/admin/*`** — Admin panel
- Layout: `app/admin/layout.tsx` (client component with `AdminSidebar` + `AdminNavbar`)
- Auth: custom HMAC-signed session tokens stored in `admin_session` httpOnly cookie, verified server-side via `lib/admin-session.ts`
- Admin state (current admin, role, logout) available via `useAdmin()` hook from `components/admin/admin-context.tsx`
- Roles: `ROLE_SUPER_ADMIN` (sees extra sidebar sections) and `ROLE_SUB_ADMIN`
- Sidebar items defined in `utils/admin/constants.ts` (`SIDEBAR_CONSTANTS`, `SUPER_ADMIN_SIDEBAR_CONSTANTS`)

**`/B2C/*`** — Consumer product browsing
- Auth: Firebase (Google OAuth via `lib/firebase.js`) + custom B2C session cookie verified via `lib/b2c-session.ts`
- `AuthDialogProvider` (`lib/auth-dialog-context.tsx`) exposes `useAuthDialog()` to trigger the login modal from anywhere
- Profile section (`/B2C/profile/*`) is server-side protected by `app/B2C/profile/layout.tsx` — redirects to `/B2C/products` if unauthenticated
- Premium subscriptions via Stripe (`app/api/b2c/payments/`)

### Key shared files

- `utils/types.ts` — All major domain types (`Product`, `ProductListing`, `PriceHistoryEntry`, `B2CAlert`, `B2CFavorite`, `CategoryWithParent`, `BestTimeToBuyPrediction`)
- `utils/b2b/limits.ts` — B2B plan limits (Bronze/Silver/Gold tiers for ads, scraping, reports, sponsored)
- `lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)
- `components/ui/` — shadcn/ui components (do not edit manually; regenerate with `npx shadcn@latest add`)

### Session architecture

Both admin and B2C use the same pattern: HMAC-SHA256 signed tokens (`base64url(payload).base64url(signature)`) set as httpOnly cookies. Admin tokens live in `lib/admin-session.ts`; B2C tokens live in `lib/b2c-session.ts`. The Next.js API routes (`app/api/`) are the only place sessions are read/written.

### Environment variables

| Variable | Purpose |
|---|---|
| `BACKEND_INTERNAL_URL` | Server-side backend URL (Docker networking) |
| `NEXT_PUBLIC_BACKEND_URL` | Public backend URL fallback |
| `ADMIN_SESSION_SECRET` | HMAC key for admin session tokens |
| `COOKIE_SECURE` | Force `true`/`false` for secure cookies |
| `STRICT_ORIGIN_CHECK` | Enable origin validation on admin login |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase config (has hardcoded dev defaults) |
