"use client"
/* eslint-disable @next/next/no-img-element */

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

import { Pencil, Trash2, ChevronDown } from "lucide-react"

import { toast } from "sonner"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAdmin } from "@/components/admin/admin-context"
import { splitListingToNewProduct } from "@/services/quality"
import type { CategoryRaw } from "@/services/categories"
import type { Product, ProductListing } from "@/utils/types"
import type { Seller } from "@/services/sellers"

type ProductListingsDataTableProps = {
  productListings: ProductListing[]
  products: Product[]
  sellers: Seller[]
  categories: CategoryRaw[]
  fetchError: string | null
  currentProductId?: number
  currentSellerId?: number
}

type DropdownOption = {
  label: string
  value: string
}

type SmoothDropdownProps = {
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
  className?: string
}

function SmoothDropdown({ value, options, onChange, className }: SmoothDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? options[0]?.label ?? ""

  return (
    <div className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-9 w-full items-center justify-between rounded-lg border border-input bg-background px-3 text-sm transition-colors duration-200 outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      <div
        className={`absolute z-20 mt-2 w-full origin-top rounded-md border bg-background p-1 shadow ${
          isOpen
            ? "visible opacity-100"
            : "invisible opacity-0"
        }`}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              onChange(option.value)
              setIsOpen(false)
            }}
            className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted ${
              option.value === value ? "bg-muted" : ""
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function toMoney(value: number | null): string {
  if (value === null) {
    return "-"
  }

  return (
    value.toLocaleString("fr-TN", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }) + " DT"
  )
}

function toDate(value: string | null): string {
  if (!value) {
    return "-"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return date.toLocaleString()
}

function limitWords(value: string | null | undefined, maxWords: number): string {
  if (!value) {
    return "-"
  }

  const words = value.trim().split(/\s+/)
  if (words.length <= maxWords) {
    return value
  }

  return `${words.slice(0, maxWords).join(" ")}...`
}

export default function ProductListingsDataTable({
  productListings,
  products,
  sellers,
  categories,
  fetchError,
  currentProductId,
  currentSellerId,
}: ProductListingsDataTableProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { admin } = useAdmin()
  const canManageListings = admin?.role === "ROLE_SUPER_ADMIN"

  const [search, setSearch] = useState("")
  const [isColumnsOpen, setIsColumnsOpen] = useState(false)
  const [pageSize, setPageSize] = useState(25)
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedSeller, setSelectedSeller] = useState(
    currentSellerId ? String(currentSellerId) : "all"
  )
  const [selectedAvailability, setSelectedAvailability] = useState("all")
  const [selectedActive, setSelectedActive] = useState("all")
  const [activeOverrides, setActiveOverrides] = useState<Record<number, boolean>>({})
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set())
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    ref: true,
    product: true,
    image: true,
    seller: true,
    price: true,
    oldPrice: true,
    available: true,
    trustScore: true,
    active: true,
    createdAt: true,
    updatedAt: true,
    productLink: true,
  })
  const columnsMenuRef = useRef<HTMLDivElement | null>(null)

  const [editingListing, setEditingListing] = useState<ProductListing | null>(null)
  const [deletingListingId, setDeletingListingId] = useState<number | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newProductId, setNewProductId] = useState<number | null>(currentProductId ?? null)
  const [newSellerId, setNewSellerId] = useState<number | null>(currentSellerId ?? null)
  const [newRef, setNewRef] = useState("")
  const [newPrice, setNewPrice] = useState("")
  const [newOldPrice, setNewOldPrice] = useState("")
  const [newProductUrl, setNewProductUrl] = useState("")
  const [newAvailability, setNewAvailability] = useState("")
  const [newActive, setNewActive] = useState(true)
  const [editRef, setEditRef] = useState("")
  const [editPrice, setEditPrice] = useState("")
  const [editOldPrice, setEditOldPrice] = useState("")
  const [editProductUrl, setEditProductUrl] = useState("")
  const [splitTarget, setSplitTarget] = useState<ProductListing | null>(null)
  const [splitName, setSplitName] = useState("")
  const [splitBrand, setSplitBrand] = useState("")
  const [splitDescription, setSplitDescription] = useState("")
  const [splitImageUrl, setSplitImageUrl] = useState("")
  const [splitCategoryId, setSplitCategoryId] = useState("")
  const [splitSubmitting, setSplitSubmitting] = useState(false)

  const sellerFilterOptions = useMemo<DropdownOption[]>(() => {
    const sellerMap = new Map<number, string>()
    productListings.forEach((listing) => {
      if (listing.sellerId !== null) {
        sellerMap.set(listing.sellerId, listing.sellerName ?? `Seller #${listing.sellerId}`)
      }
    })
    const sellerOptions = Array.from(sellerMap.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, name]) => ({ value: String(id), label: name }))
    return [{ label: "All sellers", value: "all" }, ...sellerOptions]
  }, [productListings])

  const availabilityFilterOptions: DropdownOption[] = [
    { label: "All availability", value: "all" },
    { label: "Available", value: "true" },
    { label: "Unavailable", value: "false" },
  ]

  const activeFilterOptions: DropdownOption[] = [
    { label: "All status", value: "all" },
    { label: "Active", value: "true" },
    { label: "Inactive", value: "false" },
  ]

  const pageSizeOptions: DropdownOption[] = [
    { label: "25 rows / page", value: "25" },
    { label: "50 rows / page", value: "50" },
    { label: "100 rows / page", value: "100" },
  ]

  const updateSellerUrl = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (currentProductId !== undefined) params.set("productId", String(currentProductId))
    if (value === "all") {
      params.delete("sellerId")
    } else {
      params.set("sellerId", value)
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return productListings.filter((listing) => {
      if (selectedSeller !== "all" && String(listing.sellerId) !== selectedSeller) return false
      if (selectedAvailability !== "all") {
        if (listing.availability === null) return false
        if (selectedAvailability === "true" && !listing.availability) return false
        if (selectedAvailability === "false" && listing.availability) return false
      }
      if (selectedActive !== "all") {
        if (listing.is_active === null) return false
        if (selectedActive === "true" && !listing.is_active) return false
        if (selectedActive === "false" && listing.is_active) return false
      }
      if (!normalizedSearch) return true
      return (
        String(listing.id).includes(normalizedSearch) ||
        (listing.ref ?? "").toLowerCase().includes(normalizedSearch) ||
        (listing.productName ?? "").toLowerCase().includes(normalizedSearch) ||
        (listing.sellerName ?? "").toLowerCase().includes(normalizedSearch)
      )
    })
  }, [productListings, search, selectedSeller, selectedAvailability, selectedActive])

  async function handleToggleActive(id: number, newValue: boolean) {
    if (!canManageListings) {
      return
    }

    setActiveOverrides((prev) => ({ ...prev, [id]: newValue }))
    setPendingIds((prev) => new Set(prev).add(id))
    try {
      const res = await fetch(`/api/product-listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newValue }),
      })
      if (!res.ok) {
        setActiveOverrides((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
        toast.error("Failed to update active status.")
      }
    } catch {
      setActiveOverrides((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      toast.error("Failed to update active status.")
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function handleListingCreate() {
    if (!newProductId || !newSellerId || !newRef.trim() || !newPrice.trim() || !newProductUrl.trim()) {
      toast.error("Product, seller, ref, price and product URL are required.")
      return
    }

    setSubmitting(true)
    try {
      const availability =
        newAvailability === ""
          ? null
          : newAvailability === "true"

      const res = await fetch("/api/product-listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: newProductId,
          sellerId: newSellerId,
          ref: newRef.trim(),
          price: Number(newPrice),
          old_price: newOldPrice.trim() ? Number(newOldPrice) : null,
          product_url: newProductUrl.trim(),
          availability,
          is_active: newActive,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error((data as { error?: string }).error || "Failed to create listing.")
        return
      }

      toast.success("Listing created.")
      setCreateOpen(false)
      setNewProductId(currentProductId ?? null)
      setNewSellerId(currentSellerId ?? null)
      setNewRef("")
      setNewPrice("")
      setNewOldPrice("")
      setNewProductUrl("")
      setNewAvailability("")
      setNewActive(true)
      router.refresh()
    } catch {
      toast.error("Failed to create listing.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleListingUpdate() {
    if (!editingListing) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/product-listings/${editingListing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ref: editRef || null,
          price: editPrice ? Number(editPrice) : null,
          old_price: editOldPrice ? Number(editOldPrice) : null,
          product_url: editProductUrl || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error((data as { error?: string }).error || "Failed to update listing.")
        return
      }
      toast.success("Listing updated.")
      setEditingListing(null)
      router.refresh()
    } catch {
      toast.error("Failed to update listing.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleListingDelete() {
    if (deletingListingId === null) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/product-listings/${deletingListingId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error((data as { error?: string }).error || "Failed to delete listing.")
        return
      }
      toast.success("Listing deleted.")
      setDeletingListingId(null)
      router.refresh()
    } catch {
      toast.error("Failed to delete listing.")
    } finally {
      setSubmitting(false)
    }
  }

  function openSplitDialog(listing: ProductListing) {
    if (!canManageListings) {
      return
    }

    const suggestedName = (listing.productName ?? "")
      ? `${listing.productName} (Split)`
      : `Product from listing #${listing.id}`

    setSplitTarget(listing)
    setSplitName(suggestedName)
    setSplitBrand("")
    setSplitDescription("")
    setSplitImageUrl("")
    setSplitCategoryId("")
  }

  async function handleSplitListingSubmit() {
    if (!splitTarget) return
    if (!splitName.trim()) {
      toast.error("New product name is required.")
      return
    }

    setSplitSubmitting(true)

    try {
      const result = await splitListingToNewProduct(splitTarget.id, {
        name: splitName.trim(),
        brand: splitBrand.trim() || null,
        description: splitDescription.trim() || null,
        image_url: splitImageUrl.trim() || null,
        categoryId: splitCategoryId ? Number(splitCategoryId) : null,
      })
      toast.success(`Listing split successfully to product #${result.new_product.id}.`)
      setSplitTarget(null)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to split listing.")
    } finally {
      setSplitSubmitting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const currentPage = Math.min(pageIndex, totalPages - 1)

  const visibleColumnCount = useMemo(
    () => Object.values(visibleColumns).filter(Boolean).length,
    [visibleColumns]
  )

  const paginatedRows = useMemo(() => {
    const start = currentPage * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, currentPage, pageSize])

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!columnsMenuRef.current) {
        return
      }

      if (!columnsMenuRef.current.contains(event.target as Node)) {
        setIsColumnsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPageIndex(0)
          }}
          placeholder="Search by listing id, ref, product, or seller"
          className="max-w-md"
        />

        <div className="flex items-center gap-2">
          {canManageListings ? (
            <Button asChild>
              <Link href="/admin/product-listings/new">Add Product Listing</Link>
            </Button>
          ) : null}

          <div className="relative" ref={columnsMenuRef}>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setIsColumnsOpen((prev) => !prev)}
            >
              Columns
              <ChevronDown
                className={`size-4 transition-transform duration-200 ${
                  isColumnsOpen ? "rotate-180" : "rotate-0"
                }`}
              />
            </Button>

            <div
              className={`absolute right-0 z-20 mt-2 w-52 origin-top-right rounded-md border bg-background p-2 shadow ${
                isColumnsOpen
                  ? "visible opacity-100"
                  : "invisible opacity-0"
              }`}
            >
              {(
                [
                  ["id", "ID"],
                  ["ref", "Ref"],
                  ["product", "Product"],
                  ["image", "Image"],
                  ["seller", "Seller"],
                  ["price", "Price"],
                  ["oldPrice", "Old Price"],
                  ["available", "Available"],
                  ["trustScore", "Trust Score"],
                  ["active", "Active"],
                  ["createdAt", "Created At"],
                  ["updatedAt", "Updated At"],
                  ["productLink", "Product Link"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns[key]}
                    onChange={() => toggleColumn(key)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <SmoothDropdown
          value={selectedSeller}
          options={sellerFilterOptions}
          onChange={(value) => {
            setSelectedSeller(value)
            setPageIndex(0)
            updateSellerUrl(value)
          }}
        />

        <SmoothDropdown
          value={selectedAvailability}
          options={availabilityFilterOptions}
          onChange={(value) => {
            setSelectedAvailability(value)
            setPageIndex(0)
          }}
        />

        <SmoothDropdown
          value={selectedActive}
          options={activeFilterOptions}
          onChange={(value) => {
            setSelectedActive(value)
            setPageIndex(0)
          }}
        />

        <SmoothDropdown
          value={String(pageSize)}
          options={pageSizeOptions}
          onChange={(value) => {
            setPageSize(Number(value))
            setPageIndex(0)
          }}
        />
      </div>

      <div className="w-full rounded-lg border bg-card">
        <Table className="min-w-330 table-fixed">
          <TableHeader>
            <TableRow>
              {visibleColumns.id ? <TableHead className="w-22">ID</TableHead> : null}
              {visibleColumns.ref ? <TableHead className="w-28">Ref</TableHead> : null}
              {visibleColumns.product ? <TableHead className="w-72">Product</TableHead> : null}
              {visibleColumns.image ? <TableHead className="w-20">Image</TableHead> : null}
              {visibleColumns.seller ? <TableHead className="w-44">Seller</TableHead> : null}
              {visibleColumns.price ? <TableHead className="w-26">Price</TableHead> : null}
              {visibleColumns.oldPrice ? <TableHead className="w-28">Old Price</TableHead> : null}
              {visibleColumns.available ? <TableHead className="w-24">Available</TableHead> : null}
              {visibleColumns.trustScore ? <TableHead className="w-28">Trust Score</TableHead> : null}
              {visibleColumns.active ? <TableHead className="w-20">Active</TableHead> : null}
              {visibleColumns.createdAt ? <TableHead className="w-44">Created At</TableHead> : null}
              {visibleColumns.updatedAt ? <TableHead className="w-44">Updated At</TableHead> : null}
              {visibleColumns.productLink ? <TableHead className="w-28">Product Link</TableHead> : null}
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fetchError ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumnCount + 1 || 1}
                  className="py-6 text-center text-destructive"
                >
                  {fetchError}
                </TableCell>
              </TableRow>
            ) : paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumnCount + 1 || 1}
                  className="py-6 text-center text-muted-foreground"
                >
                  No product listings found
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((listing) => (
                <TableRow key={listing.id}>
                  {visibleColumns.id ? <TableCell className="w-22">{listing.id}</TableCell> : null}
                  {visibleColumns.ref ? (
                    <TableCell className="w-28">
                      <span className="block overflow-hidden text-ellipsis" title={listing.ref ?? "-"}>
                        {listing.ref ?? "-"}
                      </span>
                    </TableCell>
                  ) : null}
                  {visibleColumns.product ? (
                    <TableCell className="w-72">
                      {listing.productId ? (
                        <Link
                          href={`/admin/product-listings?productId=${listing.productId}`}
                          className="block overflow-hidden text-ellipsis font-medium underline-offset-4 hover:underline"
                          title={listing.productName ?? `Product #${listing.productId}`}
                        >
                          {limitWords(
                            listing.productName ?? `Product #${listing.productId}`,
                            5
                          )}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  ) : null}
                  {visibleColumns.image ? (
                    <TableCell className="w-20">
                      {listing.productImageUrl ? (
                        <img
                          src={listing.productImageUrl}
                          alt={listing.productName ?? "Product image"}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="h-12 w-12 rounded-md border object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-md border text-xs text-muted-foreground">
                          No image
                        </div>
                      )}
                    </TableCell>
                  ) : null}
                  {visibleColumns.seller ? (
                    <TableCell className="w-44">
                      <span className="block overflow-hidden text-ellipsis" title={listing.sellerName ?? "-"}>
                        {limitWords(listing.sellerName, 4)}
                      </span>
                    </TableCell>
                  ) : null}
                  {visibleColumns.price ? (
                    <TableCell className="w-26">{toMoney(listing.price)}</TableCell>
                  ) : null}
                  {visibleColumns.oldPrice ? (
                    <TableCell className="w-28">{toMoney(listing.old_price)}</TableCell>
                  ) : null}
                  {visibleColumns.available ? (
                    <TableCell className="w-24">
                      {listing.availability === null ? (
                        "-"
                      ) : listing.availability ? (
                        <Badge variant="secondary">Yes</Badge>
                      ) : (
                        <Badge variant="destructive">No</Badge>
                      )}
                    </TableCell>
                  ) : null}
                  {visibleColumns.trustScore ? (
                    <TableCell className="w-28">{listing.trust_score ?? "-"}</TableCell>
                  ) : null}
                  {visibleColumns.active ? (
                    <TableCell className="w-20">
                      {listing.is_active === null ? (
                        "-"
                      ) : (
                        <Switch
                          checked={activeOverrides[listing.id] ?? listing.is_active}
                          onCheckedChange={(checked) => handleToggleActive(listing.id, checked)}
                          disabled={!canManageListings || pendingIds.has(listing.id)}
                        />
                      )}
                    </TableCell>
                  ) : null}
                  {visibleColumns.createdAt ? (
                    <TableCell className="w-44">{toDate(listing.created_at)}</TableCell>
                  ) : null}
                  {visibleColumns.updatedAt ? (
                    <TableCell className="w-44">{toDate(listing.updated_at)}</TableCell>
                  ) : null}
                  {visibleColumns.productLink ? (
                    <TableCell className="w-28">
                      <a
                        href={listing.product_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden text-ellipsis underline-offset-4 hover:underline"
                        title={listing.product_url ?? ""}
                      >
                        Open listing
                      </a>
                    </TableCell>
                  ) : null}
                  <TableCell className="w-20">
                    {canManageListings ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => openSplitDialog(listing)}
                        >
                          Split
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingListing(listing)
                            setEditRef(listing.ref ?? "")
                            setEditPrice(listing.price !== null ? String(listing.price) : "")
                            setEditOldPrice(
                              listing.old_price !== null ? String(listing.old_price) : ""
                            )
                            setEditProductUrl(listing.product_url ?? "")
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeletingListingId(listing.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {paginatedRows.length} of {filteredRows.length} row(s)
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPageIndex((prev) => Math.max(prev - 1, 0))}
            disabled={currentPage === 0}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() =>
              setPageIndex((prev) => Math.min(prev + 1, Math.max(totalPages - 1, 0)))
            }
            disabled={currentPage >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Edit Listing Dialog */}
      <Dialog
        open={splitTarget !== null}
        onOpenChange={(open) => {
          if (!open && !splitSubmitting) setSplitTarget(null)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Split Listing Into New Product</DialogTitle>
            <DialogDescription>
              Move this listing to a newly created product. Linked history and reviews stay with the listing.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="split-name">New Product Name</Label>
              <Input
                id="split-name"
                value={splitName}
                onChange={(e) => setSplitName(e.target.value)}
                placeholder="Product name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="split-brand">Brand (optional)</Label>
              <Input
                id="split-brand"
                value={splitBrand}
                onChange={(e) => setSplitBrand(e.target.value)}
                placeholder="Brand"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="split-description">Description (optional)</Label>
              <Input
                id="split-description"
                value={splitDescription}
                onChange={(e) => setSplitDescription(e.target.value)}
                placeholder="Description"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="split-image-url">Image URL (optional)</Label>
              <Input
                id="split-image-url"
                value={splitImageUrl}
                onChange={(e) => setSplitImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="split-category">Category (optional)</Label>
              <select
                id="split-category"
                value={splitCategoryId}
                onChange={(e) => setSplitCategoryId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Use current product category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    #{category.id} - {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={splitSubmitting}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleSplitListingSubmit} disabled={splitSubmitting || !splitName.trim()}>
              {splitSubmitting ? "Splitting..." : "Split Listing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Listing Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!submitting) {
            setCreateOpen(open)
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Product Listing</DialogTitle>
            <DialogDescription>Create a listing using the same admin design.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-listing-product">Product</Label>
              <select
                id="new-listing-product"
                value={newProductId ?? ""}
                onChange={(e) => setNewProductId(e.target.value ? Number(e.target.value) : null)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    #{product.id} - {product.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-listing-seller">Seller</Label>
              <select
                id="new-listing-seller"
                value={newSellerId ?? ""}
                onChange={(e) => setNewSellerId(e.target.value ? Number(e.target.value) : null)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select seller</option>
                {sellers.map((seller) => (
                  <option key={seller.id} value={seller.id}>
                    #{seller.id} - {seller.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-listing-ref">Ref</Label>
              <Input id="new-listing-ref" value={newRef} onChange={(e) => setNewRef(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-listing-price">Price (DT)</Label>
              <Input
                id="new-listing-price"
                type="number"
                step="0.001"
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-listing-old-price">Old Price (optional)</Label>
              <Input
                id="new-listing-old-price"
                type="number"
                step="0.001"
                min="0"
                value={newOldPrice}
                onChange={(e) => setNewOldPrice(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-listing-url">Product URL</Label>
              <Input
                id="new-listing-url"
                value={newProductUrl}
                onChange={(e) => setNewProductUrl(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-listing-availability">Availability</Label>
              <select
                id="new-listing-availability"
                value={newAvailability}
                onChange={(e) => setNewAvailability(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Unknown</option>
                <option value="true">Available</option>
                <option value="false">Unavailable</option>
              </select>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label htmlFor="new-listing-active">Active</Label>
              <Switch
                id="new-listing-active"
                checked={newActive}
                onCheckedChange={setNewActive}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={submitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleListingCreate}
              disabled={
                submitting ||
                !newProductId ||
                !newSellerId ||
                !newRef.trim() ||
                !newPrice.trim() ||
                !newProductUrl.trim()
              }
            >
              {submitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Listing Dialog */}
      <Dialog
        open={editingListing !== null}
        onOpenChange={(open) => {
          if (!open) setEditingListing(null)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Listing</DialogTitle>
            <DialogDescription>Update the listing details below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-ref">Ref</Label>
              <Input
                id="edit-ref"
                value={editRef}
                onChange={(e) => setEditRef(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-price">Price (DT)</Label>
              <Input
                id="edit-price"
                type="number"
                step="0.001"
                min="0"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-old-price">Old Price (DT, optional)</Label>
              <Input
                id="edit-old-price"
                type="number"
                step="0.001"
                min="0"
                value={editOldPrice}
                onChange={(e) => setEditOldPrice(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-product-url">Product URL</Label>
              <Input
                id="edit-product-url"
                value={editProductUrl}
                onChange={(e) => setEditProductUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={submitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={handleListingUpdate} disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Listing Dialog */}
      <Dialog
        open={deletingListingId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingListingId(null)
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Listing</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this listing? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={submitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleListingDelete}
              disabled={submitting}
            >
              {submitting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
