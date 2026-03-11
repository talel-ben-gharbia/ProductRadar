"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ProductListing } from "@/services/admin/product-listings"

type ProductListingsDataTableProps = {
  productListings: ProductListing[]
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
        className={`absolute z-20 mt-2 w-full origin-top rounded-md border bg-background p-1 shadow transition-all duration-200 ease-out ${
          isOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-95 opacity-0"
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

  return value.toLocaleString("fr-TN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }) + " DT"
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

export default function ProductListingsDataTable({
  productListings,
  fetchError,
  currentProductId,
  currentSellerId,
}: ProductListingsDataTableProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState("")
  const [isColumnsOpen, setIsColumnsOpen] = useState(false)
  const [pageSize, setPageSize] = useState(100)
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedSeller, setSelectedSeller] = useState(currentSellerId ? String(currentSellerId) : "all")
  const [selectedAvailability, setSelectedAvailability] = useState("all")
  const [selectedActive, setSelectedActive] = useState("all")
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
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
        (listing.productName ?? "").toLowerCase().includes(normalizedSearch) ||
        (listing.sellerName ?? "").toLowerCase().includes(normalizedSearch)
      )
    })
  }, [productListings, search, selectedSeller, selectedAvailability, selectedActive])

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
          placeholder="Search by listing id, product, or seller"
          className="max-w-md"
        />

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
            className={`absolute right-0 z-20 mt-2 w-52 origin-top-right rounded-md border bg-background p-2 shadow transition-all duration-200 ease-out ${
              isColumnsOpen
                ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                : "pointer-events-none -translate-y-1 scale-95 opacity-0"
            }`}
          >
            {(
              [
                ["id", "ID"],
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
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.id ? <TableHead>ID</TableHead> : null}
              {visibleColumns.product ? <TableHead className="w-56">Product</TableHead> : null}
              {visibleColumns.image ? <TableHead>Image</TableHead> : null}
              {visibleColumns.seller ? <TableHead>Seller</TableHead> : null}
              {visibleColumns.price ? <TableHead>Price</TableHead> : null}
              {visibleColumns.oldPrice ? <TableHead>Old Price</TableHead> : null}
              {visibleColumns.available ? <TableHead>Available</TableHead> : null}
              {visibleColumns.trustScore ? <TableHead>Trust Score</TableHead> : null}
              {visibleColumns.active ? <TableHead>Active</TableHead> : null}
              {visibleColumns.createdAt ? <TableHead>Created At</TableHead> : null}
              {visibleColumns.updatedAt ? <TableHead>Updated At</TableHead> : null}
              {visibleColumns.productLink ? <TableHead>Product Link</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {fetchError ? (
              <TableRow>
                <TableCell colSpan={visibleColumnCount || 1} className="py-6 text-center text-destructive">
                  {fetchError}
                </TableCell>
              </TableRow>
            ) : paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumnCount || 1} className="py-6 text-center text-muted-foreground">
                  No product listings found
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((listing) => (
                <TableRow key={listing.id}>
                  {visibleColumns.id ? <TableCell>{listing.id}</TableCell> : null}
                  {visibleColumns.product ? (
                    <TableCell className="max-w-56 truncate">
                      {listing.productId ? (
                        <Link
                          href={`/admin/product-listings?productId=${listing.productId}`}
                          className="block truncate font-medium underline-offset-4 hover:underline"
                          title={listing.productName ?? `Product #${listing.productId}`}
                        >
                          {listing.productName ?? `Product #${listing.productId}`}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  ) : null}
                  {visibleColumns.image ? (
                    <TableCell>
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
                  {visibleColumns.seller ? <TableCell>{listing.sellerName ?? "-"}</TableCell> : null}
                  {visibleColumns.price ? <TableCell>{toMoney(listing.price)}</TableCell> : null}
                  {visibleColumns.oldPrice ? <TableCell>{toMoney(listing.old_price)}</TableCell> : null}
                  {visibleColumns.available ? (
                    <TableCell>{listing.availability === null ? "-" : listing.availability ? "Yes" : "No"}</TableCell>
                  ) : null}
                  {visibleColumns.trustScore ? <TableCell>{listing.trust_score ?? "-"}</TableCell> : null}
                  {visibleColumns.active ? (
                    <TableCell>{listing.is_active === null ? "-" : listing.is_active ? "Yes" : "No"}</TableCell>
                  ) : null}
                  {visibleColumns.createdAt ? <TableCell>{toDate(listing.created_at)}</TableCell> : null}
                  {visibleColumns.updatedAt ? <TableCell>{toDate(listing.updatet_at)}</TableCell> : null}
                  {visibleColumns.productLink ? (
                    <TableCell>
                      <a
                        href={listing.product_url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline-offset-4 hover:underline"
                      >
                        Open listing
                      </a>
                    </TableCell>
                  ) : null}
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
    </div>
  )
}
