# Fix Price History Auth

## Problem
`/api/price-history` proxy was designed only for browser-side B2C auth (cookies), but is called from:
1. **Admin product page (SSR)** → `fetch("/api/price-history")` — relative URL on server OR no cookies → 401
2. **B2C product page (SSR)** → same issue, silently caught  
3. **B2B listings page (browser)** → sends `X-Firebase-Uid` header that the route ignores → silently fails

**Root cause**: `services/admin/price-history.ts` uses `/api/price-history` (relative) for ALL callers regardless of server/client context, and the route only checks B2C cookies.

## Changes

### 1. `frontend/services/admin/price-history.ts`

**What**: Server-side calls `BACKEND_URL/price-history` directly with admin auth headers. Client-side calls `/api/price-history` (Next.js proxy, where cookies work).

**Why**: Follows `services/admin/products.ts` pattern (`typeof window === "undefined"` check). Admin auth headers let the backend accept the request — no user auth needed when called from SSR.

```typescript
import { BACKEND_URL } from "@/utils/admin/constants"
import type { PriceHistoryEntry } from "@/utils/types"

async function fetchPriceHistoryFromApi(
  productId?: number,
  listingId?: number
): Promise<PriceHistoryEntry[]> {
  try {
    const params = new URLSearchParams()
    if (productId !== undefined) params.set("productId", String(productId))
    if (listingId !== undefined) params.set("listingId", String(listingId))

    const query = params.toString()
    const isServer = typeof window === "undefined"
    const endpoint = isServer
      ? `${BACKEND_URL}/price-history${query ? "?" + query : ""}`
      : `/api/price-history${query ? "?" + query : ""}`

    const headers: Record<string, string> = {}
    if (isServer) {
      headers["X-Admin-Api-Key"] =
        process.env.ADMIN_API_KEY ?? "dev-admin-api-key-change-me"
      headers["X-Admin-Role"] = "ROLE_SUPER_ADMIN"
    }

    const res = await fetch(endpoint, { cache: "no-store", headers })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.error ?? `HTTP ${res.status}`)
    }
    return await res.json()
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown price history fetch error"
    throw new Error(`Unable to load price history from backend. ${message}`)
  }
}

// getPriceHistory() stays exactly the same
```

### 2. `frontend/app/api/price-history/route.ts`

**What**: Accept `X-Firebase-Uid` header as fallback when no B2C cookie is present.

**Why**: B2B listings page calls `fetch("/api/price-history?productId=X", { headers: { "X-Firebase-Uid": uid } })` from the browser. This header should be forwarded.

```typescript
export async function GET(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  // Priority 1: B2C cookie auth
  if (token) {
    const session = await verifyB2CSessionToken(token)
    if (session) {
      return proxyWithUid(request, session.firebase_uid)
    }
  }

  // Priority 2: X-Firebase-Uid header (B2B listings page)
  const firebaseUid = request.headers.get("X-Firebase-Uid")
  if (firebaseUid) {
    return proxyWithUid(request, firebaseUid)
  }

  // No auth available
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

async function proxyWithUid(request: Request, firebaseUid: string) {
  const { searchParams } = new URL(request.url)
  const params = new URLSearchParams(searchParams)
  const backendUrl = `${BACKEND_URL}/price-history${params.toString() ? "?" + params.toString() : ""}`

  try {
    const response = await fetch(backendUrl, {
      cache: "no-store",
      headers: { "X-Firebase-Uid": firebaseUid },
    })
    const text = await response.text()
    try {
      const data = JSON.parse(text)
      return NextResponse.json(data, { status: response.status })
    } catch {
      return NextResponse.json(
        { error: `Backend error (${response.status}): ${text.slice(0, 500)}` },
        { status: 502 },
      )
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Backend unavailable: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    )
  }
}
```

## Verification

1. Restart Next.js dev server (`npm run dev`)
2. Check admin product page `/admin/products/[id]` — should load without "Authentication required." error
3. Check B2C product page `/B2C/products/[id]` — price history should load for authenticated users
4. Check B2B listings page `/B2B/dashboard/listings` — expanding a product row should show price history
