import { NextRequest, NextResponse } from "next/server"

/**
 * Batch image checker — takes up to 30 {id, url} pairs, returns ok/broken for each.
 * Uses server-side HEAD requests (no image body downloaded).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const items: { id: number; url: string }[] = body.items

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items array is required" }, { status: 400 })
    }

    const capped = items.slice(0, 30)

    const results = await Promise.all(
      capped.map(async (item: { id: number; url: string }) => {
        try {
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), 2500)

          const res = await fetch(item.url, {
            method: "HEAD",
            signal: controller.signal,
            redirect: "follow",
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; ProductRadar/1.0)",
            },
          })
          clearTimeout(timer)
          return { id: item.id, ok: res.ok || res.status === 200 }
        } catch {
          return { id: item.id, ok: false }
        }
      })
    )

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
