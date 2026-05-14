"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

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
  getProductListings,
  setProductListingActive,
} from "@/services/admin/product-listings"
import { getProducts, updateProduct } from "@/services/admin/products"
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

type ProductIssuesPanelProps = {
  noBrandProducts: NoBrandItem[]
  zeroPriceListings: ZeroPriceItem[]
  inactiveListings: InactiveItem[]
}

type ProductDetails = Product & {
  listings: ProductListing[]
}

type ActiveTab = "set-brand" | "listing-detail"

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

async function fetchProductDetails(id: number): Promise<ProductDetails> {
  const response = await fetch(`/api/products/${id}`, { cache: "no-store" })
  const data = await response.json()
  return {
    id: Number(data.id ?? id),
    name: String(data.name ?? ""),
    brand: (data.brand ?? null) as string | null,
    description: String(data.description ?? ""),
    specs_json: (data.specs_json ?? null) as Record<string, unknown> | null,
    image_url: (data.image_url ?? null) as string | null,
    categoryId: (data.categoryId ?? null) as number | null,
    listings: Array.isArray(data.listings) ? data.listings : [],
  }
}

export default function ProductIssuesPanel({ noBrandProducts, zeroPriceListings, inactiveListings }: ProductIssuesPanelProps) {
  const router = useRouter()

  const [dialogTab, setDialogTab] = useState<ActiveTab | null>(null)
  const [dialogProductId, setDialogProductId] = useState<number | null>(null)
  const [dialogListingId, setDialogListingId] = useState<number | null>(null)
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [brandInput, setBrandInput] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [selectedListingIds, setSelectedListingIds] = useState<Record<number, boolean>>({})
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  const [showAllNoBrand, setShowAllNoBrand] = useState(false)
  const [showAllZeroPrice, setShowAllZeroPrice] = useState(false)
  const [showAllInactive, setShowAllInactive] = useState(false)
  const [selectMode, setSelectMode] = useState<"zero-price" | "inactive">("zero-price")

  const [query, setQuery] = useState("")

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

  const visibleNoBrand = showAllNoBrand ? filteredNoBrand : filteredNoBrand.slice(0, 10)
  const visibleZeroPrice = showAllZeroPrice ? filteredZeroPrice : filteredZeroPrice.slice(0, 10)
  const visibleInactive = showAllInactive ? filteredInactive : filteredInactive.slice(0, 10)

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

  async function applyActivateListing(listingId: number) {
    try {
      await setProductListingActive(listingId, true)
      toast.success(`Listing #${listingId} activated.`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to activate listing.")
    }
  }

  async function applyDeactivateListing(listingId: number) {
    try {
      await setProductListingActive(listingId, false)
      toast.success(`Listing #${listingId} deactivated.`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to deactivate listing.")
    }
  }

  async function applyDeleteListing(listingId: number) {
    try {
      await deleteProductListing(listingId)
      toast.success(`Listing #${listingId} deleted.`)
      router.refresh()
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
      await Promise.all(listingIds.map((id) => setProductListingActive(id, false)))
      toast.success(`Deactivated ${listingIds.length} listing(s).`)
      setSelectedListingIds({})
      router.refresh()
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
      await Promise.all(listingIds.map((id) => setProductListingActive(id, true)))
      toast.success(`Activated ${listingIds.length} listing(s).`)
      setSelectedListingIds({})
      router.refresh()
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
      await Promise.all(listingIds.map((id) => deleteProductListing(id)))
      toast.success(`Deleted ${listingIds.length} listing(s).`)
      setSelectedListingIds({})
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to bulk delete listings.")
    } finally {
      setBulkActionLoading(false)
    }
  }

  const selectedCount = Object.values(selectedListingIds).filter(Boolean).length

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
          {filteredNoBrand.length} missing brand | {filteredZeroPrice.length} zero-price | {filteredInactive.length} inactive
          {query ? ` (filtered)` : ""}
        </div>
      </div>

      {selectedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <span className="text-sm font-medium text-amber-800">
            {selectedCount} listing(s) selected
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
          ) : (
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
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={bulkDelete}
            disabled={bulkActionLoading}
          >
            Delete Selected
          </Button>
        </div>
      ) : null}

      <details className="rounded-lg border bg-card p-4" open>
        <summary className="cursor-pointer list-none">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Section 1</p>
          <p className="mt-1 text-xl font-semibold">Products Missing Brand</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">
              {noBrandProducts.length} products
            </span>
          </div>
        </summary>

        <div className="mt-4 space-y-3">
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
      </details>

      <details className="rounded-lg border bg-card p-4" open>
        <summary className="cursor-pointer list-none">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Section 2</p>
          <p className="mt-1 text-xl font-semibold">Zero Price Listings</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
              {zeroPriceListings.length} listings
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs">
              {activeZeroPriceListings} active | {inactiveZeroPriceListings} inactive
            </span>
            <Button type="button" variant="outline" size="sm" onClick={selectAllZeroPrice}>
              Select All
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </summary>

        <div className="mt-4 space-y-3">
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
      </details>

      <details className="rounded-lg border bg-card p-4" open>
        <summary className="cursor-pointer list-none">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Section 3</p>
          <p className="mt-1 text-xl font-semibold">Inactive Listings</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
              {inactiveListings.length} listings
            </span>
            <Button type="button" variant="outline" size="sm" onClick={selectAllInactive}>
              Select All
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </summary>

        <div className="mt-4 space-y-3">
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
      </details>

      <Dialog
        open={dialogTab === "set-brand"}
        onOpenChange={(open) => { if (!open) closeDialog() }}
      >
        <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-4xl">
          {dialogTab === "set-brand" && (
            <>
              <DialogHeader>
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
                <div className="space-y-4">
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
                      Enter the brand name for this product. This will make it appear in brand-based filters on B2C.
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

      <Dialog
        open={dialogTab === "listing-detail"}
        onOpenChange={(open) => { if (!open) closeDialog() }}
      >
        <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-4xl">
          {dialogTab === "listing-detail" && dialogListingData && (
            <>
              <DialogHeader>
                <DialogTitle>Listing #{dialogListingData.listingId} Details</DialogTitle>
                <DialogDescription>
                  Full details for this zero-price listing. Deactivate or delete it to clean up the catalog.
                </DialogDescription>
              </DialogHeader>

              {loadingDetails ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  Loading product details...
                </div>
              ) : productDetails ? (
                <div className="space-y-4">
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
    </div>
  )
}
