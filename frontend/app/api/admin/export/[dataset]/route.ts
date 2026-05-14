import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { BACKEND_URL } from "@/utils/admin/constants"

type Dataset = "products" | "product-listings" | "categories" | "sellers"

type ProductListingApiItem = {
  id: number
  sellerId: number | null
  sellerName: string | null
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) {
    return ""
  }

  const headers = Object.keys(rows[0])

  const escapeCsv = (value: unknown): string => {
    const text = value === null || value === undefined ? "" : String(value)
    const escaped = text.replace(/"/g, '""')
    return `"${escaped}"`
  }

  const lines = [headers.join(",")]

  for (const row of rows) {
    const line = headers.map((header) => escapeCsv(row[header])).join(",")
    lines.push(line)
  }

  return lines.join("\n")
}

async function fetchJson(path: string): Promise<unknown[]> {
  const response = await fetch(`${BACKEND_URL}${path}`, { cache: "no-store" })

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`)
  }

  return (await response.json()) as unknown[]
}

async function getDatasetRows(dataset: Dataset): Promise<Array<Record<string, unknown>>> {
  if (dataset === "products") {
    return (await fetchJson("/products")) as Array<Record<string, unknown>>
  }

  if (dataset === "product-listings") {
    return (await fetchJson("/product-listings")) as Array<Record<string, unknown>>
  }

  if (dataset === "categories") {
    return (await fetchJson("/categories")) as Array<Record<string, unknown>>
  }

  const listings = (await fetchJson("/product-listings")) as ProductListingApiItem[]
  const sellers = new Map<number, { sellerId: number; sellerName: string; listingsCount: number }>()

  for (const listing of listings) {
    if (listing.sellerId === null) {
      continue
    }

    const existing = sellers.get(listing.sellerId)
    if (existing) {
      existing.listingsCount += 1
      continue
    }

    sellers.set(listing.sellerId, {
      sellerId: listing.sellerId,
      sellerName: listing.sellerName ?? `Seller #${listing.sellerId}`,
      listingsCount: 1,
    })
  }

  return Array.from(sellers.values()).sort((a, b) => a.sellerName.localeCompare(b.sellerName))
}

async function checkAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_session")?.value
  return token !== null && token !== undefined
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dataset: string }> },
) {
  if (!await checkAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { dataset: rawDataset } = await params
  const dataset = rawDataset as Dataset

  if (!["products", "product-listings", "categories", "sellers"].includes(dataset)) {
    return NextResponse.json({ error: "Unknown dataset." }, { status: 400 })
  }

  const format = request.nextUrl.searchParams.get("format") ?? "json"

  if (format !== "json" && format !== "csv") {
    return NextResponse.json({ error: "Unsupported format." }, { status: 400 })
  }

  try {
    const rows = await getDatasetRows(dataset)

    if (format === "json") {
      return NextResponse.json(rows)
    }

    const csv = toCsv(rows)
    const fileName = `${dataset}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: "Unable to export dataset." }, { status: 502 })
  }
}
