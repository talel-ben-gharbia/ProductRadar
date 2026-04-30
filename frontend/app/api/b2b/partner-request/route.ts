import { NextRequest, NextResponse } from "next/server"

import { BACKEND_URL } from "@/utils/admin/constants"

function buildBackendCandidates(baseUrl: string): string[] {
  const normalized = baseUrl.replace(/\/+$/, "")

  // Common local setups in this repo use either 8000 (direct) or 8001 (docker-mapped).
  if (normalized.includes("127.0.0.1:8000") || normalized.includes("localhost:8000")) {
    return [normalized, normalized.replace(":8000", ":8001")]
  }

  if (normalized.includes("127.0.0.1:8001") || normalized.includes("localhost:8001")) {
    return [normalized, normalized.replace(":8001", ":8000")]
  }

  return [normalized]
}

async function parseBackendResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    return response.json().catch(() => ({}))
  }

  const text = await response.text().catch(() => "")
  return { error: text.trim() || "Backend returned a non-JSON response." }
}


export async function POST(request: NextRequest) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const candidates = buildBackendCandidates(BACKEND_URL)
  let lastErrorMessage = "Unable to connect to the backend."

  for (const candidate of candidates) {
    try {
      const backendResponse = await fetch(`${candidate}/api/b2b/partner-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      })

      const data = await parseBackendResponse(backendResponse)

      if (!backendResponse.ok) {
        return NextResponse.json(
          { error: (data as { error?: string }).error || "Failed to submit partner request." },
          { status: backendResponse.status },
        )
      }

      return NextResponse.json(data, { status: 201 })
    } catch (error) {
      lastErrorMessage = error instanceof Error ? error.message : "Unable to connect to the backend."
    }
  }

  return NextResponse.json(
    { error: `Unable to connect to the backend. ${lastErrorMessage}` },
    { status: 502 },
  )
}
