"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getRawCategories, type CategoryRaw } from "@/services/categories"
import { getSellers, type Seller } from "@/services/sellers"

type DefaultLinkResponse = {
  exists: boolean
  link: string | null
}

type TriggerResponse = {
  message: string
  status_code: number
  resolved_link: string
  resolved_from_category_link: boolean
  n8n_response: string
}

async function getDefaultCategoryLink(sellerId: number, categoryId: number): Promise<DefaultLinkResponse> {
  const params = new URLSearchParams({
    seller_id: String(sellerId),
    category_id: String(categoryId),
  })

  const response = await fetch(`/api/admin/scraping/manual/default-link?${params.toString()}`, {
    cache: "no-store",
  })
  const data = (await response.json().catch(() => ({}))) as { error?: string } & Partial<DefaultLinkResponse>

  if (!response.ok) {
    throw new Error(data.error || "Failed to resolve category link.")
  }

  return {
    exists: Boolean(data.exists),
    link: data.link ?? null,
  }
}

async function triggerManualScrape(payload: {
  seller_id: number
  category_id: number
  link?: string | null
  use_category_link: boolean
}): Promise<TriggerResponse> {
  const response = await fetch("/api/admin/scraping/manual/trigger", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const data = (await response.json().catch(() => ({}))) as { error?: string } & Partial<TriggerResponse>
  if (!response.ok) {
    throw new Error(data.error || "Failed to trigger scraping workflow.")
  }

  return {
    message: data.message ?? "Manual scraping job triggered successfully.",
    status_code: data.status_code ?? 202,
    resolved_link: data.resolved_link ?? "",
    resolved_from_category_link: Boolean(data.resolved_from_category_link),
    n8n_response: data.n8n_response ?? "",
  }
}

/** Fetch the unique category IDs that a specific seller has active listings for */
async function fetchCategoryIdsForSeller(sellerId: number): Promise<Set<number>> {
  try {
    const res = await fetch(`/api/product-listings?sellerId=${sellerId}&limit=1000`, {
      cache: "no-store",
    })
    if (!res.ok) return new Set()
    const data = await res.json()
    const listings: Array<{ categoryId?: number | null }> = Array.isArray(data)
      ? data
      : (data?.items ?? data?.data ?? [])
    const ids = new Set<number>()
    for (const l of listings) {
      if (typeof l.categoryId === "number") ids.add(l.categoryId)
    }
    return ids
  } catch {
    return new Set()
  }
}

export default function ScrapingWebhookPanel() {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [allCategories, setAllCategories] = useState<CategoryRaw[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [sellerCategoryIds, setSellerCategoryIds] = useState<Set<number> | null>(null)
  const [loadingSellerCategories, setLoadingSellerCategories] = useState(false)

  const [sellerId, setSellerId] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [useCategoryLink, setUseCategoryLink] = useState(true)
  const [manualLink, setManualLink] = useState("")
  const [resolvedCategoryLink, setResolvedCategoryLink] = useState<string | null>(null)
  const [resolvingLink, setResolvingLink] = useState(false)

  const [submitting, setSubmitting] = useState(false)

  /** Categories filtered to those the selected seller actually has products in */
  const filteredCategories = useMemo(() => {
    if (!sellerCategoryIds || sellerCategoryIds.size === 0) return allCategories
    return allCategories.filter((cat) => sellerCategoryIds.has(cat.id))
  }, [allCategories, sellerCategoryIds])

  const selectedSellerName = useMemo(() => {
    const id = Number(sellerId)
    return sellers.find((seller) => seller.id === id)?.name ?? "-"
  }, [sellerId, sellers])

  const selectedCategoryName = useMemo(() => {
    const id = Number(categoryId)
    return filteredCategories.find((category) => category.id === id)?.name ?? "-"
  }, [categoryId, filteredCategories])

  useEffect(() => {
    let cancelled = false

    async function loadOptions() {
      setLoadingOptions(true)
      try {
        const [sellerRows, categoryRows] = await Promise.all([
          getSellers(),
          getRawCategories(),
        ])
        if (cancelled) return
        setSellers(sellerRows)
        setAllCategories(categoryRows)
      } catch (error) {
        if (cancelled) return
        toast.error(error instanceof Error ? error.message : "Failed to load sellers/categories.")
      } finally {
        if (!cancelled) {
          setLoadingOptions(false)
        }
      }
    }

    loadOptions()

    return () => {
      cancelled = true
    }
  }, [])

  /** When seller changes, fetch the categories that seller has products in */
  useEffect(() => {
    const id = Number(sellerId)
    if (!Number.isInteger(id) || id <= 0) {
      setSellerCategoryIds(null)
      setCategoryId("")
      return
    }

    let cancelled = false
    setLoadingSellerCategories(true)
    setCategoryId("") // reset category when seller changes

    fetchCategoryIdsForSeller(id).then((ids) => {
      if (cancelled) return
      setSellerCategoryIds(ids)
      setLoadingSellerCategories(false)
    })

    return () => { cancelled = true }
  }, [sellerId])

  useEffect(() => {
    let cancelled = false

    async function resolveCategoryLink() {
      const seller = Number(sellerId)
      const category = Number(categoryId)

      if (!Number.isInteger(seller) || seller <= 0 || !Number.isInteger(category) || category <= 0) {
        setResolvedCategoryLink(null)
        return
      }

      setResolvingLink(true)
      try {
        const data = await getDefaultCategoryLink(seller, category)
        if (cancelled) return
        setResolvedCategoryLink(data.exists ? data.link : null)

        if (useCategoryLink && data.exists) {
          setManualLink((previous) => {
            if (previous.trim()) {
              return previous
            }
            return data.link ?? ""
          })
        }
      } catch (error) {
        if (cancelled) return
        setResolvedCategoryLink(null)
        toast.error(error instanceof Error ? error.message : "Failed to resolve category link.")
      } finally {
        if (!cancelled) {
          setResolvingLink(false)
        }
      }
    }

    resolveCategoryLink()

    return () => {
      cancelled = true
    }
  }, [sellerId, categoryId, useCategoryLink])

  async function handleTrigger() {
    const seller = Number(sellerId)
    const category = Number(categoryId)

    if (!Number.isInteger(seller) || seller <= 0) {
      toast.error("Select a seller.")
      return
    }

    if (!Number.isInteger(category) || category <= 0) {
      toast.error("Select a category.")
      return
    }

    if (!useCategoryLink && manualLink.trim() === "") {
      toast.error("Provide a manual URL when category-link auto resolution is disabled.")
      return
    }

    setSubmitting(true)
    try {
      const result = await triggerManualScrape({
        seller_id: seller,
        category_id: category,
        link: manualLink.trim() === "" ? null : manualLink.trim(),
        use_category_link: useCategoryLink,
      })

      toast.success(result.message)
      if (result.resolved_link && result.resolved_link !== manualLink) {
        setManualLink(result.resolved_link)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to trigger scraping workflow.")
    } finally {
      setSubmitting(false)
    }
  }

  const hasNoCategoriesForSeller =
    sellerId !== "" &&
    !loadingSellerCategories &&
    sellerCategoryIds !== null &&
    sellerCategoryIds.size === 0

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Manual Scraping Trigger</h2>
        <p className="text-sm text-muted-foreground">
          Launch n8n scraping manually: choose seller + category, use link from category_link table or override with custom URL.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Seller</label>
          <select
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={sellerId}
            onChange={(event) => setSellerId(event.target.value)}
            disabled={loadingOptions}
          >
            <option value="">Select seller</option>
            {sellers.map((seller) => (
              <option key={seller.id} value={seller.id}>{`#${seller.id} - ${seller.name}`}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Category
            {sellerId && !loadingSellerCategories && sellerCategoryIds !== null && (
              <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                ({filteredCategories.length} available for this seller)
              </span>
            )}
          </label>
          {loadingSellerCategories ? (
            <div className="h-9 w-full rounded-md border bg-background px-3 flex items-center">
              <span className="text-xs text-muted-foreground animate-pulse">Loading categories…</span>
            </div>
          ) : (
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              disabled={loadingOptions || loadingSellerCategories}
            >
              <option value="">Select category</option>
              {filteredCategories.map((category) => (
                <option key={category.id} value={category.id}>{`#${category.id} - ${category.name}`}</option>
              ))}
            </select>
          )}
          {hasNoCategoriesForSeller && (
            <p className="text-xs text-amber-600">
              ⚠ No products found for this seller. All categories are shown.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
        <p>
          <span className="font-medium">Selected:</span> {selectedSellerName} / {selectedCategoryName}
        </p>
        <p className="text-muted-foreground">
          {resolvingLink
            ? "Checking category_link table..."
            : resolvedCategoryLink
              ? `Found category_link URL: ${resolvedCategoryLink}`
              : "No category_link URL found for this seller/category."}
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <input
          id="use-category-link"
          type="checkbox"
          checked={useCategoryLink}
          onChange={(event) => setUseCategoryLink(event.target.checked)}
          className="size-4 rounded border-input"
        />
        <label htmlFor="use-category-link">Use URL from category_link table when available</label>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Manual URL (optional override)</label>
        <Input
          placeholder="https://seller.example/category-page"
          value={manualLink}
          onChange={(event) => setManualLink(event.target.value)}
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setSellerId("")
            setCategoryId("")
            setUseCategoryLink(true)
            setManualLink("")
            setResolvedCategoryLink(null)
            setSellerCategoryIds(null)
          }}
          disabled={submitting}
        >
          Reset
        </Button>
        <Button onClick={handleTrigger} disabled={submitting || loadingOptions || loadingSellerCategories}>
          {submitting ? "Triggering..." : "Start Manual Scrape"}
        </Button>
      </div>
    </div>
  )
}
