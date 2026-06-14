"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  deleteProductListing,
  setProductListingActive,
} from "@/services/product-listings"
import { deleteProduct, updateProduct } from "@/services/products"
import type { Product, ProductListing } from "@/utils/types"

type NoBrandItem = {
  productId: number
  name: string
  brand: string | null
  description: string
  imageUrl: string | null
}

type ZeroPriceItem = {
  listingId: number
  productId: number
  productName: string
  productBrand: string | null
  productImageUrl: string | null
  price: number | null
  ref: string | null
  sellerName: string | null
  isActive: boolean | null
}

type InactiveItem = {
  listingId: number
  productId: number
  productName: string
  price: number | null
  ref: string | null
  sellerName: string | null
  isActive: boolean | null
}

type ZeroListingItem = {
  productId: number
  name: string
  brand: string | null
  description: string
  imageUrl: string | null
  categoryId: number | null
}

type MissingImageItem = {
  productId: number
  name: string
  brand: string | null
  description: string
  categoryId: number | null
}

type WithImageItem = {
  productId: number
  name: string
  brand: string | null
  description: string
  imageUrl: string
  categoryId: number | null
}

type ProductListingRef = {
  id: number
  ref: string | null
  price: number | null
  product_url: string | null
  sellerName: string | null
}

type ProductIssuesPanelProps = {
  noBrandProducts: NoBrandItem[]
  zeroPriceListings: ZeroPriceItem[]
  inactiveListings: InactiveItem[]
  zeroListingProducts: ZeroListingItem[]
  missingImageProducts: MissingImageItem[]
  productsWithImage: WithImageItem[]
  productListingsMap: Record<number, ProductListingRef[]>
}

type ProductDetails = Product & {
  listings: ProductListing[]
}

type ActiveTab = "set-brand" | "listing-detail" | "edit-image"

function toMoney(value: number | null): string {
  if (value === null) return "-"
  return (
    value.toLocaleString("fr-TN", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }) + " DT"
  )
}

function normalizeText(value: string | number | null | undefined): string {
  return String(value ?? "").trim().toLowerCase()
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function ImagePreview({ url, alt }: { url: string | null; alt: string }) {
  const [status, setStatus] = useState<"loading" | "ok" | "broken">("loading")

  useEffect(() => {
    if (!url) { setStatus("broken"); return }
    let cancelled = false
    setStatus("loading")
    const img = new Image()
    img.onload = () => { if (!cancelled) setStatus("ok") }
    img.onerror = () => { if (!cancelled) setStatus("broken") }
    img.src = url
    return () => { cancelled = true }
  }, [url])

  if (!url) {
    return <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No image</div>
  }

  if (status === "loading") {
    return <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Loading...</div>
  }

  if (status === "broken") {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-1 text-sm text-red-500">
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Broken image</span>
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={alt}
      className="h-48 w-full object-contain"
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
    />
  )
}

async function fetchProductDetails(id: number): Promise<ProductDetails> {
  const response = await fetch(`/api/products/${id}`, { cache: "no-store" })
  const data = await response.json()
  return {
    id: Number(data.id ?? id),
    name: String(data.name ?? ""),
    brand: (data.brand ?? null) as string | null,
    description: String(data.description ?? ""),
    specs_json: (data.specs_json ?? null) as Record<string, string> | null,
    image_url: (data.image_url ?? null) as string | null,
    categoryId: (data.categoryId ?? null) as number | null,
    listings: Array.isArray(data.listings) ? data.listings : [],
  }
}

/** Batch check images via server-side HEAD requests */
async function batchCheckImages(items: { id: number; url: string }[]): Promise<Map<number, boolean>> {
  const results = new Map<number, boolean>()
  try {
    const res = await fetch("/api/admin/check-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    })
    if (res.ok) {
      const data = await res.json() as { results: { id: number; ok: boolean }[] }
      for (const r of data.results) {
        results.set(r.id, r.ok)
      }
    }
  } catch {
    // If batch fails, mark all as broken
    for (const item of items) {
      results.set(item.id, false)
    }
  }
  return results
}

const SCAN_CACHE_KEY = "product-issues-image-scan-v2"
const SCAN_CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

export default function ProductIssuesPanel({ noBrandProducts: initialNoBrandProducts, zeroPriceListings: initialZeroPriceListings, inactiveListings: initialInactiveListings, zeroListingProducts: initialZeroListingProducts, missingImageProducts: initialMissingImageProducts, productsWithImage: initialProductsWithImage, productListingsMap }: ProductIssuesPanelProps) {
  const router = useRouter()

  const [dialogTab, setDialogTab] = useState<ActiveTab | null>(null)
  const [dialogProductId, setDialogProductId] = useState<number | null>(null)
  const [dialogListingId, setDialogListingId] = useState<number | null>(null)
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [brandInput, setBrandInput] = useState("")
  const [newImageUrl, setNewImageUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [selectedListingIds, setSelectedListingIds] = useState<Record<number, boolean>>({})
  const [selectedProductIds, setSelectedProductIds] = useState<Record<number, boolean>>({})
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null)

  const [showAllNoBrand, setShowAllNoBrand] = useState(false)
  const [showAllZeroPrice, setShowAllZeroPrice] = useState(false)
  const [showAllInactive, setShowAllInactive] = useState(false)
  const [showAllZeroListings, setShowAllZeroListings] = useState(false)
  const [showAllMissingImages, setShowAllMissingImages] = useState(false)
  const [showAllBrokenImages, setShowAllBrokenImages] = useState(false)
  const [selectMode, setSelectMode] = useState<"zero-price" | "inactive" | "zero-listings">("zero-price")
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    s1: true, s2: true, s3: true, s4: true, s5: true, s6: true,
  })
  function toggleSection(key: string) {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const [query, setQuery] = useState("")

  const [noBrandProducts, setNoBrandProducts] = useState(initialNoBrandProducts)
  const [zeroPriceListings, setZeroPriceListings] = useState(initialZeroPriceListings)
  const [inactiveListings, setInactiveListings] = useState(initialInactiveListings)
  const [zeroListingProducts, setZeroListingProducts] = useState(initialZeroListingProducts)
  const [missingImageProducts, setMissingImageProducts] = useState(initialMissingImageProducts)
  const [productsWithImage] = useState(initialProductsWithImage)

  // --- Fast image scan state ---
  const [brokenIds, setBrokenIds] = useState<Set<number>>(new Set())
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set())
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const scanCancelledRef = useRef(false)
  // Manual overrides: admin marks an image as good/broken despite HEAD result
  const [manualOverrides, setManualOverrides] = useState<Record<number, boolean>>({})
  // Enlarge image preview
  const [enlargeImageUrl, setEnlargeImageUrl] = useState<string | null>(null)
  const [enlargeImageName, setEnlargeImageName] = useState<string>("")
  const [enlargeImageError, setEnlargeImageError] = useState(false)

  /* Load cached scan results on mount */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SCAN_CACHE_KEY)
      if (raw) {
        const cached: { broken: number[]; checked: number[]; ts: number } = JSON.parse(raw)
        if (Date.now() - cached.ts < SCAN_CACHE_TTL) {
          setBrokenIds(new Set(cached.broken))
          setCheckedIds(new Set(cached.checked))
        } else {
          localStorage.removeItem(SCAN_CACHE_KEY)
        }
      }
    } catch {}
  }, [])

  /* Save to cache on change */
  useEffect(() => {
    if (checkedIds.size === 0) return
    try {
      localStorage.setItem(SCAN_CACHE_KEY, JSON.stringify({
        broken: Array.from(brokenIds),
        checked: Array.from(checkedIds),
        ts: Date.now(),
      }))
    } catch {}
  }, [brokenIds, checkedIds])

  /* Cleanup on unmount */
  useEffect(() => {
    return () => { scanCancelledRef.current = true }
  }, [])

  async function startScan() {
    if (isScanning) return
    setIsScanning(true)
    scanCancelledRef.current = false

    const queue = productsWithImage.filter((item) => !checkedIds.has(item.productId))
    const BATCH_SIZE = 30 // 30 per API call — server does parallel HEAD requests
    let processed = 0

    try {
      for (let i = 0; i < queue.length; i += BATCH_SIZE) {
        if (scanCancelledRef.current) break

        const batch = queue.slice(i, i + BATCH_SIZE)
        const items = batch.map((item) => ({ id: item.productId, url: item.imageUrl }))
        const results = await batchCheckImages(items)

        const newBroken = new Set<number>()
        const newChecked = new Set<number>()
        for (const item of batch) {
          const ok = results.get(item.productId) ?? false
          if (!ok) newBroken.add(item.productId)
          newChecked.add(item.productId)
        }

        setBrokenIds((prev) => {
          const n = new Set(prev)
          for (const id of newBroken) n.add(id)
          return n
        })
        setCheckedIds((prev) => {
          const n = new Set(prev)
          for (const id of newChecked) n.add(id)
          return n
        })
        processed += batch.length
        setScanProgress(processed)
      }
    } finally {
      setIsScanning(false)
    }
  }

  function stopScan() {
    scanCancelledRef.current = true
    setIsScanning(false)
  }

  function clearScanResults() {
    setBrokenIds(new Set())
    setCheckedIds(new Set())
    setManualOverrides({})
    localStorage.removeItem(SCAN_CACHE_KEY)
  }

  const filteredNoBrand = useMemo(() => {
    if (!query) return noBrandProducts
    const q = normalizeText(query)
    return noBrandProducts.filter((p) =>
      normalizeText([p.name, p.productId, p.description].join(" ")).includes(q),
    )
  }, [noBrandProducts, query])

  const filteredZeroPrice = useMemo(() => {
    if (!query) return zeroPriceListings
    const q = normalizeText(query)
    return zeroPriceListings.filter((l) =>
      normalizeText([l.productName, l.ref, l.sellerName, l.listingId, l.productId].join(" ")).includes(q),
    )
  }, [zeroPriceListings, query])

  const filteredInactive = useMemo(() => {
    if (!query) return inactiveListings
    const q = normalizeText(query)
    return inactiveListings.filter((l) =>
      normalizeText([l.productName, l.ref, l.sellerName, l.listingId, l.productId].join(" ")).includes(q),
    )
  }, [inactiveListings, query])

  const filteredZeroListings = useMemo(() => {
    if (!query) return zeroListingProducts
    const q = normalizeText(query)
    return zeroListingProducts.filter((p) =>
      normalizeText([p.name, p.productId, p.brand, p.description].join(" ")).includes(q),
    )
  }, [zeroListingProducts, query])

  const filteredMissingImages = useMemo(() => {
    if (!query) return missingImageProducts
    const q = normalizeText(query)
    return missingImageProducts.filter((p) =>
      normalizeText([p.name, p.productId, p.brand, p.description].join(" ")).includes(q),
    )
  }, [missingImageProducts, query])

  const brokenProducts = useMemo(() => {
    return productsWithImage.filter((item) => {
      if (brokenIds.has(item.productId)) {
        // Check manual override: admin marked it as good
        if (manualOverrides[item.productId] === true) return false
        return true
      }
      return false
    })
  }, [productsWithImage, brokenIds, manualOverrides])

  const filteredBroken = useMemo(() => {
    if (!query) return brokenProducts
    const q = normalizeText(query)
    return brokenProducts.filter((p) =>
      normalizeText([p.name, p.productId, p.brand, p.description].join(" ")).includes(q),
    )
  }, [brokenProducts, query])

  const visibleNoBrand = showAllNoBrand ? filteredNoBrand : filteredNoBrand.slice(0, 10)
  const visibleZeroPrice = showAllZeroPrice ? filteredZeroPrice : filteredZeroPrice.slice(0, 10)
  const visibleInactive = showAllInactive ? filteredInactive : filteredInactive.slice(0, 10)
  const visibleZeroListings = showAllZeroListings ? filteredZeroListings : filteredZeroListings.slice(0, 10)
  const visibleMissingImages = showAllMissingImages ? filteredMissingImages : filteredMissingImages.slice(0, 10)
  const visibleBroken = showAllBrokenImages ? filteredBroken : filteredBroken.slice(0, 10)

  useEffect(() => {
    if (dialogProductId === null) return

    setLoadingDetails(true)
    fetchProductDetails(dialogProductId)
      .then((details) => {
        setProductDetails(details)
        setBrandInput(details.brand ?? "")
      })
      .catch(() => {
        toast.error("Failed to load product details.")
        setDialogProductId(null)
        setDialogTab(null)
      })
      .finally(() => setLoadingDetails(false))
  }, [dialogProductId])

  function openBrandDialog(productId: number) {
    setDialogTab("set-brand")
    setDialogProductId(productId)
    setDialogListingId(null)
    setProductDetails(null)
    setBrandInput("")
  }

  function openEditImageDialog(productId: number) {
    setDialogTab("edit-image")
    setDialogProductId(productId)
    setDialogListingId(null)
    setProductDetails(null)
    setNewImageUrl("")
  }

  function openListingDetailDialog(listingId: number, productId: number) {
    setDialogTab("listing-detail")
    setDialogProductId(productId)
    setDialogListingId(listingId)
    setProductDetails(null)
  }

  function closeDialog() {
    setDialogTab(null)
    setDialogProductId(null)
    setDialogListingId(null)
    setProductDetails(null)
    setBrandInput("")
    setNewImageUrl("")
  }

  async function applySetBrand() {
    if (!dialogProductId || !brandInput.trim()) {
      toast.error("Enter a brand name first.")
      return
    }

    setSubmitting(true)
    try {
      await updateProduct(dialogProductId, { brand: brandInput.trim() })
      toast.success(`Brand set to "${brandInput.trim()}" for product #${dialogProductId}.`)
      closeDialog()
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to set brand.")
    } finally {
      setSubmitting(false)
    }
  }

  async function applyUpdateImage() {
    if (!dialogProductId || !newImageUrl.trim()) {
      toast.error("Enter an image URL first.")
      return
    }
    setSubmitting(true)
    try {
      await updateProduct(dialogProductId, { image_url: newImageUrl.trim() })
      toast.success(`Image updated for product #${dialogProductId}.`)
      closeDialog()
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update image.")
    } finally {
      setSubmitting(false)
    }
  }

  async function applyActivateListing(listingId: number) {
    try {
      await setProductListingActive(listingId, true)
      setInactiveListings((prev) => prev.filter((l) => l.listingId !== listingId))
      setZeroPriceListings((prev) =>
        prev.map((l) => (l.listingId === listingId ? { ...l, isActive: true } : l)),
      )
      toast.success(`Listing #${listingId} activated.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to activate listing.")
    }
  }

  async function applyDeactivateListing(listingId: number) {
    try {
      await setProductListingActive(listingId, false)
      setZeroPriceListings((prev) =>
        prev.map((l) => (l.listingId === listingId ? { ...l, isActive: false } : l)),
      )
      setInactiveListings((prev) =>
        prev.some((l) => l.listingId === listingId)
          ? prev.map((l) => (l.listingId === listingId ? { ...l, isActive: false } : l))
          : prev,
      )
      toast.success(`Listing #${listingId} deactivated.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to deactivate listing.")
    }
  }

  async function applyDeleteProduct(productId: number) {
    if (!window.confirm(`Delete product #${productId} permanently? This cannot be undone.`)) return
    setDeletingProductId(productId)
    try {
      await deleteProduct(productId)
      setZeroListingProducts((prev) => prev.filter((p) => p.productId !== productId))
      setDeletingProductId(null)
      toast.success(`Product #${productId} deleted.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete product.")
      setDeletingProductId(null)
    }
  }

  function toggleSelectProduct(productId: number) {
    setSelectedProductIds((current) => ({
      ...current,
      [productId]: !current[productId],
    }))
  }

  function selectAllZeroListings() {
    const next: Record<number, boolean> = {}
    for (const p of filteredZeroListings) {
      next[p.productId] = true
    }
    setSelectedProductIds(next)
    setSelectMode("zero-listings")
  }

  async function bulkDeleteProducts() {
    const ids = Object.entries(selectedProductIds)
      .filter(([_, selected]) => selected)
      .map(([id]) => Number(id))
    if (ids.length === 0) {
      toast.error("Select at least one product to delete.")
      return
    }
    if (!window.confirm(`Delete ${ids.length} product(s) permanently? This cannot be undone.`)) return
    setBulkActionLoading(true)
    try {
      for (const id of ids) {
        await deleteProduct(id)
        setZeroListingProducts((prev) => prev.filter((p) => p.productId !== id))
      }
      setSelectedProductIds({})
      toast.success(`Deleted ${ids.length} product(s).`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete some products.")
    } finally {
      setBulkActionLoading(false)
    }
  }

  async function applyDeleteListing(listingId: number) {
    try {
      await deleteProductListing(listingId)
      setZeroPriceListings((prev) => prev.filter((l) => l.listingId !== listingId))
      setInactiveListings((prev) => prev.filter((l) => l.listingId !== listingId))
      toast.success(`Listing #${listingId} deleted.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete listing.")
    }
  }

  function toggleSelectListing(listingId: number) {
    setSelectedListingIds((current) => ({
      ...current,
      [listingId]: !current[listingId],
    }))
  }

  function selectAllZeroPrice() {
    const next: Record<number, boolean> = {}
    for (const issue of filteredZeroPrice) {
      next[issue.listingId] = true
    }
    setSelectedListingIds(next)
    setSelectMode("zero-price")
  }

  function selectAllInactive() {
    const next: Record<number, boolean> = {}
    for (const issue of filteredInactive) {
      next[issue.listingId] = true
    }
    setSelectedListingIds(next)
    setSelectMode("inactive")
  }

  function clearSelection() {
    setSelectedListingIds({})
  }

  async function bulkDeactivate() {
    const listingIds = Object.entries(selectedListingIds)
      .filter(([_, selected]) => selected)
      .map(([id]) => Number(id))

    if (listingIds.length === 0) {
      toast.error("Select at least one listing to deactivate.")
      return
    }

    setBulkActionLoading(true)
    try {
      for (const id of listingIds) {
        await setProductListingActive(id, false)
        setZeroPriceListings((prev) =>
          prev.map((l) => (l.listingId === id ? { ...l, isActive: false } : l)),
        )
        setInactiveListings((prev) =>
          prev.some((l) => l.listingId === id)
            ? prev.map((l) => (l.listingId === id ? { ...l, isActive: false } : l))
            : prev,
        )
      }
      setSelectedListingIds({})
      toast.success(`Deactivated ${listingIds.length} listing(s).`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to bulk deactivate listings.")
    } finally {
      setBulkActionLoading(false)
    }
  }

  async function bulkActivate() {
    const listingIds = Object.entries(selectedListingIds)
      .filter(([_, selected]) => selected)
      .map(([id]) => Number(id))

    if (listingIds.length === 0) {
      toast.error("Select at least one listing to activate.")
      return
    }

    setBulkActionLoading(true)
    try {
      for (const id of listingIds) {
        await setProductListingActive(id, true)
        setInactiveListings((prev) => prev.filter((l) => l.listingId !== id))
        setZeroPriceListings((prev) =>
          prev.map((l) => (l.listingId === id ? { ...l, isActive: true } : l)),
        )
      }
      setSelectedListingIds({})
      toast.success(`Activated ${listingIds.length} listing(s).`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to bulk activate listings.")
    } finally {
      setBulkActionLoading(false)
    }
  }

  async function bulkDelete() {
    const listingIds = Object.entries(selectedListingIds)
      .filter(([_, selected]) => selected)
      .map(([id]) => Number(id))

    if (listingIds.length === 0) {
      toast.error("Select at least one listing to delete.")
      return
    }

    setBulkActionLoading(true)
    try {
      for (const id of listingIds) {
        await deleteProductListing(id)
        setZeroPriceListings((prev) => prev.filter((l) => l.listingId !== id))
        setInactiveListings((prev) => prev.filter((l) => l.listingId !== id))
      }
      setSelectedListingIds({})
      toast.success(`Deleted ${listingIds.length} listing(s).`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to bulk delete listings.")
    } finally {
      setBulkActionLoading(false)
    }
  }

  const selectedCount = Object.values(selectedListingIds).filter(Boolean).length + Object.values(selectedProductIds).filter(Boolean).length

  const activeZeroPriceListings = filteredZeroPrice.filter((l) => l.isActive !== false).length
  const inactiveZeroPriceListings = filteredZeroPrice.filter((l) => l.isActive === false).length

  const dialogListingData = useMemo(() => {
    if (dialogListingId === null) return null
    return zeroPriceListings.find((l) => l.listingId === dialogListingId) ?? null
  }, [zeroPriceListings, dialogListingId])

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">
            <input
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              placeholder="Search by product name, id, seller, ref..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          {productsWithImage.length} with image | {filteredMissingImages.length} missing image | {filteredNoBrand.length} missing brand | {filteredZeroPrice.length} zero-price | {filteredInactive.length} inactive | {filteredZeroListings.length} zero-listings
          {query ? ` (filtered)` : ""}
        </div>
      </div>

      {selectedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <span className="text-sm font-medium text-amber-800">
            {selectMode === "zero-listings"
              ? `${Object.values(selectedProductIds).filter(Boolean).length} product(s) selected`
              : `${selectedCount} listing(s) selected`}
          </span>
          {selectMode === "inactive" ? (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={bulkActivate}
              disabled={bulkActionLoading}
            >
              Activate Selected
            </Button>
          ) : selectMode === "zero-listings" ? null : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={bulkDeactivate}
              disabled={bulkActionLoading}
            >
              Deactivate Selected
            </Button>
          )}
          {selectMode === "zero-listings" ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={bulkDeleteProducts}
              disabled={bulkActionLoading}
            >
              {bulkActionLoading ? "Deleting..." : "Delete Selected"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={bulkDelete}
              disabled={bulkActionLoading}
            >
              Delete Selected
            </Button>
          )}
        </div>
      ) : null}

      {/* Section 1: Missing Brand */}
      <div className="rounded-lg border bg-card">
        <button type="button" className="flex w-full items-center justify-between p-4 text-left" onClick={() => toggleSection("s1")}>
          <div className="flex items-center gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Section 1</p>
            <p className="text-xl font-semibold">Products Missing Brand</p>
            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">
              {noBrandProducts.length} products
            </span>
          </div>
          <ChevronIcon open={!collapsedSections.s1} />
        </button>
        {collapsedSections.s1 ? null : (
        <div className="mt-0 border-t px-4 pb-4 pt-3 space-y-3">
          {noBrandProducts.length === 0 ? (
            <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
              All products have a brand set.
            </div>
          ) : (
            visibleNoBrand.map((item) => (
              <div
                key={`no-brand-${item.productId}`}
                className="rounded-lg border bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      #{item.productId} - {item.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {item.description || "No description"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-800">Missing brand</span>
                      {item.imageUrl ? (
                        <span className="rounded-full bg-muted px-2 py-1">Has image</span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-1">No image</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openBrandDialog(item.productId)}
                    >
                      Set Brand
                    </Button>
                    <Button asChild type="button" size="sm" variant="outline">
                      <Link href={`/admin/products/${item.productId}`}>
                        View Product
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}

          {filteredNoBrand.length > 10 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAllNoBrand(!showAllNoBrand)}
            >
              {showAllNoBrand
                ? `Show fewer (${visibleNoBrand.length})`
                : `Show all (${filteredNoBrand.length})`}
            </Button>
          ) : null}
        </div>
        )}
      </div>

      {/* Section 2: Missing Image */}
      <div className="rounded-lg border bg-card">
        <button type="button" className="flex w-full items-center justify-between p-4 text-left" onClick={() => toggleSection("s2")}>
          <div className="flex items-center gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Section 2</p>
            <p className="text-xl font-semibold">Products Missing Image</p>
            <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800">
              {missingImageProducts.length} products
            </span>
          </div>
          <ChevronIcon open={!collapsedSections.s2} />
        </button>
        {collapsedSections.s2 ? null : (
        <div className="mt-0 border-t px-4 pb-4 pt-3 space-y-3">
          {missingImageProducts.length === 0 ? (
            <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
              All products have an image set.
            </div>
          ) : (
            visibleMissingImages.map((item) => (
              <div
                key={`mi-${item.productId}`}
                className="rounded-lg border bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      #{item.productId} - {item.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {item.description || "No description"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-orange-100 px-2 py-1 text-orange-800">Missing image</span>
                      {item.brand ? (
                        <span className="rounded-full bg-muted px-2 py-1">Brand: {item.brand}</span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-1">No brand</span>
                      )}
                      {item.categoryId && (
                        <span className="rounded-full bg-muted px-2 py-1">Category #{item.categoryId}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button asChild type="button" size="sm" variant="outline">
                      <Link href={`/admin/products/${item.productId}`}>
                        Edit Product
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}

          {filteredMissingImages.length > 10 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAllMissingImages(!showAllMissingImages)}
            >
              {showAllMissingImages
                ? `Show fewer (${visibleMissingImages.length})`
                : `Show all (${filteredMissingImages.length})`}
            </Button>
          ) : null}
        </div>
        )}
      </div>

      {/* Section 3: Image Problems (fast fetch HEAD scan) */}
      <div className="rounded-lg border bg-card">
        <button
          type="button"
          className="flex w-full items-center justify-between p-4 text-left"
          onClick={() => toggleSection("s3")}
        >
          <div className="flex items-center gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Section 3</p>
            <p className="text-xl font-semibold">Image Problems</p>
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">
              {productsWithImage.length} total
            </span>
            {checkedIds.size > 0 && (
              <>
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">
                  {brokenIds.size} broken
                </span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                  {checkedIds.size - brokenIds.size} ok
                </span>
              </>
            )}
          </div>
          <ChevronIcon open={!collapsedSections.s3} />
        </button>

        {!collapsedSections.s3 ? (
          <div className="border-t px-4 pb-4">
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {!isScanning ? (
                <Button type="button" size="sm" onClick={startScan}>
                  {checkedIds.size > 0 ? "Re-scan Images" : "Start Scan"}
                </Button>
              ) : (
                <Button type="button" size="sm" variant="destructive" onClick={stopScan}>
                  Stop Scan
                </Button>
              )}
              {checkedIds.size > 0 && !isScanning ? (
                <Button type="button" size="sm" variant="ghost" onClick={clearScanResults}>
                  Clear Results
                </Button>
              ) : null}
              {isScanning ? (
                <span className="text-xs text-muted-foreground">
                  Scanning... {scanProgress}/{productsWithImage.length}
                </span>
              ) : checkedIds.size > 0 ? (
                <span className="text-xs text-muted-foreground">
                  Last scan: {checkedIds.size}/{productsWithImage.length} checked (cached 24h)
                </span>
              ) : null}
            </div>

            <div className="mt-4 space-y-3">
              {productsWithImage.length === 0 ? (
                <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
                  No products have images set.
                </div>
              ) : checkedIds.size === 0 ? (
                <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
                  Click &quot;Start Scan&quot; to check {productsWithImage.length} product images using fast HEAD requests.
                </div>
              ) : brokenIds.size === 0 && checkedIds.size === productsWithImage.length ? (
                <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
                  All {productsWithImage.length} product images are valid.
                </div>
              ) : (
                visibleBroken.map((item) => (
                  <div
                    key={`bi-${item.productId}`}
                    className="rounded-lg border border-red-200 bg-red-50/30 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">
                          #{item.productId} - {item.name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {item.description || "No description"}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-800">Broken image</span>
                          {item.brand ? (
                            <span className="rounded-full bg-muted px-2 py-1">Brand: {item.brand}</span>
                          ) : null}
                          {item.categoryId ? (
                            <span className="rounded-full bg-muted px-2 py-1">Category #{item.categoryId}</span>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="mt-1 max-w-md truncate font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline text-left"
                          onClick={() => {
                            setEnlargeImageUrl(item.imageUrl)
                            setEnlargeImageName(`${item.name} (#${item.productId})`)
                            setEnlargeImageError(false)
                          }}
                        >
                          {item.imageUrl}
                        </button>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="default"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => {
                              setManualOverrides((prev) => ({ ...prev, [item.productId]: true }))
                              toast.success(`Marked #${item.productId} as OK`)
                            }}
                          >
                            ✓ Mark OK
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setManualOverrides((prev) => {
                                const next = { ...prev }
                                delete next[item.productId]
                                return next
                              })
                              setBrokenIds((prev) => new Set(prev).add(item.productId))
                              toast.success(`Marked #${item.productId} as Broken`)
                            }}
                          >
                            ✗ Mark Broken
                          </Button>
                        </div>
                        <Button type="button" size="sm" variant="default" onClick={() => openEditImageDialog(item.productId)}>
                          Edit Image
                        </Button>
                        {(productListingsMap[item.productId]?.length ?? 0) > 0 ? (
                          productListingsMap[item.productId]?.flatMap((listing) => {
                            if (!listing.product_url) return []
                            let urls: string[] = []
                            try {
                              const parsed = JSON.parse(listing.product_url)
                              if (Array.isArray(parsed)) {
                                urls = parsed.filter((u): u is string => typeof u === "string")
                              } else if (typeof parsed === "string") {
                                urls = [parsed]
                              }
                            } catch {
                              urls = [listing.product_url]
                            }
                            return urls.map((url, i) => (
                              <Button key={`${listing.id}-${i}`} asChild type="button" size="sm" variant="outline">
                                <Link href={url} target="_blank" rel="noopener noreferrer">
                                  Open Listing #{listing.id}{urls.length > 1 ? ` (${i + 1})` : ""}
                                </Link>
                              </Button>
                            ))
                          })
                        ) : null}
                        <Button asChild type="button" size="sm" variant="outline">
                          <Link href={`/admin/products/${item.productId}`}>
                            View Product
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {filteredBroken.length > 10 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllBrokenImages(!showAllBrokenImages)}
                >
                  {showAllBrokenImages
                    ? `Show fewer (${visibleBroken.length})`
                    : `Show all (${filteredBroken.length})`}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {/* Section 4: Zero Price */}
      <div className="rounded-lg border bg-card">
        <button type="button" className="flex w-full items-center justify-between p-4 text-left" onClick={() => toggleSection("s4")}>
          <div className="flex items-center gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Section 4</p>
            <p className="text-xl font-semibold">Zero Price Listings</p>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
              {zeroPriceListings.length} listings
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs">
              {activeZeroPriceListings} active | {inactiveZeroPriceListings} inactive
            </span>
          </div>
          <ChevronIcon open={!collapsedSections.s4} />
        </button>
        {collapsedSections.s4 ? null : (
        <div className="mt-0 border-t px-4 pb-4 pt-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={selectAllZeroPrice}>
              Select All
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        <div className="space-y-3">
          {zeroPriceListings.length === 0 ? (
            <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
              No listings with zero price found.
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Fix</TableHead>
                    <TableHead className="w-24">Listing</TableHead>
                    <TableHead className="w-48">Product</TableHead>
                    <TableHead className="w-36">Ref</TableHead>
                    <TableHead className="w-28">Price</TableHead>
                    <TableHead className="w-32">Seller</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleZeroPrice.map((item) => (
                    <TableRow key={`zp-${item.listingId}`}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedListingIds[item.listingId] ?? false}
                          onChange={() => toggleSelectListing(item.listingId)}
                        />
                      </TableCell>
                      <TableCell>#{item.listingId}</TableCell>
                      <TableCell className="max-w-48 truncate font-medium">
                        {item.productName}
                      </TableCell>
                      <TableCell className="max-w-36 truncate font-mono text-xs">
                        {item.ref ?? "-"}
                      </TableCell>
                      <TableCell className="font-medium text-rose-600">
                        {toMoney(item.price)}
                      </TableCell>
                      <TableCell className="max-w-32 truncate">
                        {item.sellerName ?? "-"}
                      </TableCell>
                      <TableCell>
                        {item.isActive === false ? (
                          <span className="text-xs text-muted-foreground">Inactive</span>
                        ) : (
                          <span className="text-xs text-emerald-600">Active</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openListingDetailDialog(item.listingId, item.productId)}
                          >
                            Details
                          </Button>
                          {item.isActive !== false ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => applyDeactivateListing(item.listingId)}
                            >
                              Deactivate
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => applyDeleteListing(item.listingId)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredZeroPrice.length > 10 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAllZeroPrice(!showAllZeroPrice)}
            >
              {showAllZeroPrice
                ? `Show fewer (${visibleZeroPrice.length})`
                : `Show all (${filteredZeroPrice.length})`}
            </Button>
          ) : null}
        </div>
        </div>
        )}
      </div>

      {/* Section 5: Inactive */}
      <div className="rounded-lg border bg-card">
        <button type="button" className="flex w-full items-center justify-between p-4 text-left" onClick={() => toggleSection("s5")}>
          <div className="flex items-center gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Section 5</p>
            <p className="text-xl font-semibold">Inactive Listings</p>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
              {inactiveListings.length} listings
            </span>
          </div>
          <ChevronIcon open={!collapsedSections.s5} />
        </button>
        {collapsedSections.s5 ? null : (
        <div className="mt-0 border-t px-4 pb-4 pt-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={selectAllInactive}>
              Select All
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        <div className="space-y-3">
          {inactiveListings.length === 0 ? (
            <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
              No inactive listings found.
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Fix</TableHead>
                    <TableHead className="w-24">Listing</TableHead>
                    <TableHead className="w-48">Product</TableHead>
                    <TableHead className="w-36">Ref</TableHead>
                    <TableHead className="w-28">Price</TableHead>
                    <TableHead className="w-32">Seller</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleInactive.map((item) => (
                    <TableRow key={`in-${item.listingId}`}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedListingIds[item.listingId] ?? false}
                          onChange={() => {
                            setSelectMode("inactive")
                            toggleSelectListing(item.listingId)
                          }}
                        />
                      </TableCell>
                      <TableCell>#{item.listingId}</TableCell>
                      <TableCell className="max-w-48 truncate font-medium">
                        {item.productName}
                      </TableCell>
                      <TableCell className="max-w-36 truncate font-mono text-xs">
                        {item.ref ?? "-"}
                      </TableCell>
                      <TableCell>{toMoney(item.price)}</TableCell>
                      <TableCell className="max-w-32 truncate">
                        {item.sellerName ?? "-"}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">Inactive</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={() => applyActivateListing(item.listingId)}
                          >
                            Activate
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => applyDeleteListing(item.listingId)}
                          >
                            Delete
                          </Button>
                          <Button asChild type="button" variant="outline" size="sm">
                            <Link
                              href={`/admin/product-listings?productId=${item.productId}`}
                            >
                              View Listings
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredInactive.length > 10 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAllInactive(!showAllInactive)}
            >
              {showAllInactive
                ? `Show fewer (${visibleInactive.length})`
                : `Show all (${filteredInactive.length})`}
            </Button>
          ) : null}
        </div>
        </div>
        )}
      </div>

      {/* Section 6: No Listings */}
      <div className="rounded-lg border bg-card">
        <button type="button" className="flex w-full items-center justify-between p-4 text-left" onClick={() => toggleSection("s6")}>
          <div className="flex items-center gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Section 6</p>
            <p className="text-xl font-semibold">Products With No Listings</p>
            <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-800">
              {zeroListingProducts.length} products
            </span>
          </div>
          <ChevronIcon open={!collapsedSections.s6} />
        </button>
        {collapsedSections.s6 ? null : (
        <div className="mt-0 border-t px-4 pb-4 pt-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={selectAllZeroListings}>
              Select All
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedProductIds({})}>
              Clear
            </Button>
          </div>
        <div className="space-y-3">
          {zeroListingProducts.length === 0 ? (
            <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
              All products have at least one listing.
            </div>
          ) : (
            visibleZeroListings.map((item) => (
              <div
                key={`zl-${item.productId}`}
                className="rounded-lg border bg-card p-4"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-4"
                    checked={selectedProductIds[item.productId] ?? false}
                    onChange={() => {
                      setSelectMode("zero-listings")
                      toggleSelectProduct(item.productId)
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      #{item.productId} - {item.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {item.description || "No description"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-purple-100 px-2 py-1 text-purple-800">No listings</span>
                      {item.brand ? (
                        <span className="rounded-full bg-muted px-2 py-1">Brand: {item.brand}</span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-1">No brand</span>
                      )}
                      {item.imageUrl ? (
                        <span className="rounded-full bg-muted px-2 py-1">Has image</span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-1">No image</span>
                      )}
                      {item.categoryId && (
                        <span className="rounded-full bg-muted px-2 py-1">Category #{item.categoryId}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button asChild type="button" size="sm" variant="outline">
                      <Link href={`/admin/products/${item.productId}`}>
                        View Product
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => applyDeleteProduct(item.productId)}
                      disabled={deletingProductId === item.productId}
                    >
                      {deletingProductId === item.productId ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}

          {filteredZeroListings.length > 10 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAllZeroListings(!showAllZeroListings)}
            >
              {showAllZeroListings
                ? `Show fewer (${visibleZeroListings.length})`
                : `Show all (${filteredZeroListings.length})`}
            </Button>
          ) : null}
        </div>
        </div>
        )}
      </div>

      {/* Dialog: Set Brand */}
      <Dialog
        open={dialogTab === "set-brand"}
        onOpenChange={(open) => { if (!open) closeDialog() }}
      >
        <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {dialogTab === "set-brand" && (
            <>
              <DialogHeader className="shrink-0">
                <DialogTitle>Set Brand for Product #{dialogProductId}</DialogTitle>
                <DialogDescription>
                  View full product details below, then enter the brand name to assign.
                </DialogDescription>
              </DialogHeader>

              {loadingDetails ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  Loading product details...
                </div>
              ) : productDetails ? (
                <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
                  <div className="grid gap-4 md:grid-cols-[200px_1fr]">
                    <div className="flex items-center justify-center overflow-hidden rounded-lg border bg-muted/20">
                      {productDetails.image_url ? (
                        <img
                          src={productDetails.image_url}
                          alt={productDetails.name}
                          className="h-48 w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Product ID
                        </p>
                        <p className="text-sm font-semibold">#{productDetails.id}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Name
                        </p>
                        <p className="text-sm font-semibold">{productDetails.name}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Current Brand
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {productDetails.brand || (
                            <span className="italic text-rose-500">Not set</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Category ID
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {productDetails.categoryId ?? "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Total Listings
                        </p>
                        <p className="text-sm text-muted-foreground">{productDetails.listings.length}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Description
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {productDetails.description || "No description available."}
                    </p>
                  </div>

                  {productDetails.listings.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Associated Listings ({productDetails.listings.length})
                      </p>
                      <div className="mt-1 overflow-hidden rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>ID</TableHead>
                              <TableHead>Ref</TableHead>
                              <TableHead>Price</TableHead>
                              <TableHead>Seller</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {productDetails.listings.map((listing) => (
                              <TableRow key={`dlg-listing-${listing.id}`}>
                                <TableCell>#{listing.id}</TableCell>
                                <TableCell className="font-mono text-xs">
                                  {listing.ref ?? "-"}
                                </TableCell>
                                <TableCell className={
                                  listing.price !== null && listing.price === 0
                                    ? "font-medium text-rose-600"
                                    : ""
                                }>
                                  {toMoney(listing.price)}
                                </TableCell>
                                <TableCell>{listing.sellerName ?? "-"}</TableCell>
                                <TableCell>
                                  {listing.is_active === false ? (
                                    <span className="text-xs text-muted-foreground">Inactive</span>
                                  ) : (
                                    <span className="text-xs text-emerald-600">Active</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-md border border-rose-200 bg-rose-50 p-4">
                    <p className="text-xs font-semibold text-rose-800">Set Brand</p>
                    <p className="mt-1 text-xs text-rose-600">
                      Enter the brand name for this product.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <input
                        className="h-9 w-64 rounded-md border bg-background px-3 text-sm"
                        placeholder="Enter brand name (e.g. Samsung, Nike, ...)"
                        value={brandInput}
                        onChange={(event) => setBrandInput(event.target.value)}
                      />
                      <Button
                        type="button"
                        onClick={applySetBrand}
                        disabled={submitting || !brandInput.trim()}
                      >
                        {submitting ? "Saving..." : "Save Brand"}
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button asChild type="button" variant="outline" size="sm">
                      <Link
                        href={`/admin/products/${productDetails.id}`}
                        target="_blank"
                      >
                        Open Full Product Page
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Listing Detail */}
      <Dialog
        open={dialogTab === "listing-detail"}
        onOpenChange={(open) => { if (!open) closeDialog() }}
      >
        <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {dialogTab === "listing-detail" && dialogListingData && (
            <>
              <DialogHeader className="shrink-0">
                <DialogTitle>Listing #{dialogListingData.listingId} Details</DialogTitle>
                <DialogDescription>
                  Full details for this zero-price listing.
                </DialogDescription>
              </DialogHeader>

              {loadingDetails ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  Loading product details...
                </div>
              ) : productDetails ? (
                <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
                  <div className="grid gap-4 md:grid-cols-[200px_1fr]">
                    <div className="flex items-center justify-center overflow-hidden rounded-lg border bg-muted/20">
                      {productDetails.image_url ? (
                        <img
                          src={productDetails.image_url}
                          alt={productDetails.name}
                          className="h-48 w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Product
                        </p>
                        <p className="text-sm font-semibold">
                          #{productDetails.id} - {productDetails.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Brand
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {productDetails.brand || <span className="italic">Not set</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Description
                        </p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {productDetails.description || "No description available."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-semibold text-amber-800">Listing Information</p>
                    <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
                      <div>
                        <span className="font-medium text-muted-foreground">Listing ID:</span>{" "}
                        #{dialogListingData.listingId}
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Ref:</span>{" "}
                        {dialogListingData.ref ?? "-"}
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Price:</span>{" "}
                        <span className="font-medium text-rose-600">
                          {toMoney(dialogListingData.price)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Seller:</span>{" "}
                        {dialogListingData.sellerName ?? "-"}
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Status:</span>{" "}
                        {dialogListingData.isActive === false ? "Inactive" : "Active"}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {dialogListingData.isActive !== false ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          applyDeactivateListing(dialogListingData.listingId)
                          closeDialog()
                        }}
                      >
                        Deactivate Listing
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        applyDeleteListing(dialogListingData.listingId)
                        closeDialog()
                      }}
                    >
                      Delete Listing
                    </Button>
                    <Button asChild type="button" variant="outline" size="sm">
                      <Link
                        href={`/admin/product-listings?productId=${dialogListingData.productId}`}
                        target="_blank"
                      >
                        View All Product Listings
                      </Link>
                    </Button>
                    <Button asChild type="button" variant="outline" size="sm">
                      <Link
                        href={`/admin/products/${dialogListingData.productId}`}
                        target="_blank"
                      >
                        Open Product Page
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Enlargement Modal */}
      {enlargeImageUrl ? (
        <Dialog open={!!enlargeImageUrl} onOpenChange={(open) => { if (!open) { setEnlargeImageUrl(null); setEnlargeImageName("") } }}>
          <DialogContent className="w-[98vw] max-w-[98vw] p-0 sm:max-w-5xl">
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle className="text-base">{enlargeImageName}</DialogTitle>
              <DialogDescription className="break-all text-xs">{enlargeImageUrl}</DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center overflow-auto bg-black/5" style={{ maxHeight: "75vh" }}>
              {enlargeImageError ? (
                <div className="flex flex-col items-center gap-2 p-8 text-red-500">
                  <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">Failed to load image</span>
                </div>
              ) : (
                <img
                  src={enlargeImageUrl}
                  alt={enlargeImageName}
                  className="max-h-[70vh] w-full object-contain"
                  onError={() => setEnlargeImageError(true)}
                />
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 pb-6 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  window.open(enlargeImageUrl, "_blank")
                }}
              >
                Open in New Tab
              </Button>
              <Button type="button" size="sm" onClick={() => { setEnlargeImageUrl(null); setEnlargeImageName("") }}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {/* Dialog: Edit Image */}
      <Dialog
        open={dialogTab === "edit-image"}
        onOpenChange={(open) => { if (!open) closeDialog() }}
      >
        <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {dialogTab === "edit-image" && (
            <>
              <DialogHeader className="shrink-0">
                <DialogTitle>Edit Image for Product #{dialogProductId}</DialogTitle>
                <DialogDescription>
                  Verify the current image URL, enter a new one, and confirm.
                </DialogDescription>
              </DialogHeader>

              {loadingDetails ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  Loading product details...
                </div>
              ) : productDetails ? (
                <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
                  <div className="grid gap-4 md:grid-cols-[200px_1fr]">
                    <div className="flex items-center justify-center overflow-hidden rounded-lg border bg-muted/20">
                      <ImagePreview url={productDetails.image_url} alt={productDetails.name} />
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Product
                        </p>
                        <p className="text-sm font-semibold">
                          #{productDetails.id} - {productDetails.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Brand
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {productDetails.brand || <span className="italic">Not set</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Category ID
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {productDetails.categoryId ?? "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Description
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {productDetails.description || "No description available."}
                    </p>
                  </div>

                  {productDetails.listings.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Associated Listings ({productDetails.listings.length})
                      </p>
                      <div className="mt-1 overflow-hidden rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>ID</TableHead>
                              <TableHead>Ref</TableHead>
                              <TableHead>Price</TableHead>
                              <TableHead>Seller</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {productDetails.listings.map((listing) => (
                              <TableRow key={`edit-img-listing-${listing.id}`}>
                                <TableCell>#{listing.id}</TableCell>
                                <TableCell className="font-mono text-xs">
                                  {listing.ref ?? "-"}
                                </TableCell>
                                <TableCell>{toMoney(listing.price)}</TableCell>
                                <TableCell>{listing.sellerName ?? "-"}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    {listing.product_url ? (
                                      <Button asChild type="button" size="sm" variant="outline">
                                        <Link href={listing.product_url} target="_blank">
                                          Open Listing
                                        </Link>
                                      </Button>
                                    ) : null}
                                    <Button asChild type="button" size="sm" variant="outline">
                                      <Link
                                        href={`/admin/products/${productDetails.id}`}
                                        target="_blank"
                                      >
                                        Open Product
                                      </Link>
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-semibold text-amber-800">Change Image URL</p>
                    <p className="mt-1 text-xs text-amber-600">
                      Enter a new image URL below.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <input
                        className="h-9 flex-1 min-w-[300px] rounded-md border bg-background px-3 text-sm font-mono"
                        placeholder="https://example.com/image.jpg"
                        value={newImageUrl}
                        onChange={(event) => setNewImageUrl(event.target.value)}
                      />
                    </div>
                    {newImageUrl.trim() ? (
                      <div className="mt-3 rounded-lg border bg-background overflow-hidden">
                        <div className="relative min-h-[200px]">
                          <ImagePreview url={newImageUrl.trim()} alt="New image preview" />
                        </div>
                        <div className="border-t px-3 py-2">
                          <p className="text-xs text-muted-foreground break-all font-mono">{newImageUrl.trim()}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={closeDialog}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={applyUpdateImage}
                      disabled={submitting || !newImageUrl.trim()}
                    >
                      {submitting ? "Saving..." : "Save Image URL"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
