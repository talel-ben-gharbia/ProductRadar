"use client"
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Pencil, Trash2, ChevronDown, Info } from "lucide-react"

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
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAdmin } from "@/components/admin/admin-context"
import type { CategoryWithParent, Product } from "@/utils/types"

type ProductWithHierarchy = Product & {
  category: string | null
  subCategory: string | null
  childCategory: string | null
}

type ProductsDataTableProps = {
  products: Product[]
  categories: CategoryWithParent[]
  productsError: string | null
  categoriesError: string | null
  initialCategoryId?: number
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

function SmoothDropdown({
  value,
  options,
  onChange,
  className,
}: SmoothDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? options[0]?.label ?? ""

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current) {
        return
      }

      if (!menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  return (
    <div ref={menuRef} className={`relative ${className ?? ""}`}>
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

export default function ProductsDataTable({
  products,
  categories,
  productsError,
  categoriesError,
  initialCategoryId,
}: ProductsDataTableProps) {
  const router = useRouter()
  const { admin } = useAdmin()
  const canManageProducts = admin?.role === "ROLE_SUPER_ADMIN"

  const [search, setSearch] = useState("")
  const [isColumnsOpen, setIsColumnsOpen] = useState(false)
  const [pageSize, setPageSize] = useState(25)
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    image: true,
    name: true,
    brand: true,
    category: true,
    subCategory: true,
    childCategory: true,
    description: true,
  })
  const columnsMenuRef = useRef<HTMLDivElement | null>(null)

  const [editingProduct, setEditingProduct] = useState<ProductWithHierarchy | null>(null)
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newName, setNewName] = useState("")
  const [newBrand, setNewBrand] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newImageUrl, setNewImageUrl] = useState("")
  const [newCategoryId, setNewCategoryId] = useState<number | null>(null)
  const [editName, setEditName] = useState("")
  const [editBrand, setEditBrand] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editImageUrl, setEditImageUrl] = useState("")
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null)

  const initialHierarchy = useMemo(() => {
    if (!initialCategoryId) {
      return null
    }

    return categories.find((item) => item.id === initialCategoryId) ?? null
  }, [categories, initialCategoryId])

  const [selectedCategory, setSelectedCategory] = useState(
    initialHierarchy?.category ?? "all"
  )
  const [selectedSubCategory, setSelectedSubCategory] = useState(
    initialHierarchy?.subCategory ?? "all"
  )
  const [selectedChildCategory, setSelectedChildCategory] = useState(
    initialHierarchy?.childCategory ?? "all"
  )
  const [sortBy, setSortBy] = useState("most_listings")

  const categoryById = useMemo(() => {
    const map = new Map<number, CategoryWithParent>()
    categories.forEach((item) => {
      map.set(item.id, item)
    })
    return map
  }, [categories])

  const rows = useMemo<ProductWithHierarchy[]>(() => {
    return products.map((product) => {
      const hierarchy =
        product.categoryId !== null ? categoryById.get(product.categoryId) : undefined

      return {
        ...product,
        category: hierarchy?.category ?? null,
        subCategory: hierarchy?.subCategory ?? null,
        childCategory: hierarchy?.childCategory ?? null,
      }
    })
  }, [products, categoryById])

  const categoryOptions = useMemo(() => {
    return Array.from(
      new Set(rows.map((row) => row.category).filter((value): value is string => Boolean(value)))
    ).sort((a, b) => a.localeCompare(b))
  }, [rows])

  const subCategoryOptions = useMemo(() => {
    const source =
      selectedCategory === "all"
        ? rows
        : rows.filter((row) => row.category === selectedCategory)

    return Array.from(
      new Set(
        source
          .map((row) => row.subCategory)
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b))
  }, [rows, selectedCategory])

  const childCategoryOptions = useMemo(() => {
    const source = rows.filter((row) => {
      if (selectedCategory !== "all" && row.category !== selectedCategory) {
        return false
      }

      if (selectedSubCategory !== "all" && row.subCategory !== selectedSubCategory) {
        return false
      }

      return true
    })

    return Array.from(
      new Set(
        source
          .map((row) => row.childCategory)
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b))
  }, [rows, selectedCategory, selectedSubCategory])

  const categoryFilterOptions = useMemo<DropdownOption[]>(() => {
    return [
      { label: "All categories", value: "all" },
      ...categoryOptions.map((option) => ({ label: option, value: option })),
    ]
  }, [categoryOptions])

  const subCategoryFilterOptions = useMemo<DropdownOption[]>(() => {
    return [
      { label: "All sub categories", value: "all" },
      ...subCategoryOptions.map((option) => ({ label: option, value: option })),
    ]
  }, [subCategoryOptions])

  const childCategoryFilterOptions = useMemo<DropdownOption[]>(() => {
    return [
      { label: "All child categories", value: "all" },
      ...childCategoryOptions.map((option) => ({ label: option, value: option })),
    ]
  }, [childCategoryOptions])

  const pageSizeOptions: DropdownOption[] = [
    { label: "25 rows / page", value: "25" },
    { label: "50 rows / page", value: "50" },
    { label: "100 rows / page", value: "100" },
  ]

  const sortOptions: DropdownOption[] = [
    { label: "Most listings first", value: "most_listings" },
    { label: "Least listings first", value: "least_listings" },
    { label: "Default order", value: "default" },
  ]

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    const filtered = rows.filter((row) => {
      if (selectedCategory !== "all" && row.category !== selectedCategory) {
        return false
      }

      if (selectedSubCategory !== "all" && row.subCategory !== selectedSubCategory) {
        return false
      }

      if (selectedChildCategory !== "all" && row.childCategory !== selectedChildCategory) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return (
        String(row.id).includes(normalizedSearch) ||
        row.name.toLowerCase().includes(normalizedSearch) ||
        (row.brand ?? "").toLowerCase().includes(normalizedSearch)
      )
    })

    if (sortBy === "default") {
      return filtered
    }

    const sorted = [...filtered].sort((a, b) => {
      const aCount = a.listingCount ?? 0
      const bCount = b.listingCount ?? 0

      if (sortBy === "least_listings") {
        return aCount - bCount
      }

      return bCount - aCount
    })

    return sorted
  }, [rows, search, selectedCategory, selectedSubCategory, selectedChildCategory, sortBy])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const currentPage = Math.min(pageIndex, totalPages - 1)

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

  const allVisibleSelected =
    paginatedRows.length > 0 && paginatedRows.every((row) => selectedIds.includes(row.id))

  const toggleRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    )
  }

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !paginatedRows.some((row) => row.id === id))
      )
      return
    }

    const visibleIds = paginatedRows.map((row) => row.id)
    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])))
  }

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleProductUpdate() {
    if (!editingProduct) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          brand: editBrand || null,
          description: editDescription || null,
          image_url: editImageUrl || null,
          categoryId: editCategoryId,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error((data as { error?: string }).error || "Failed to update product.")
        return
      }
      toast.success("Product updated.")
      setEditingProduct(null)
      router.refresh()
    } catch {
      toast.error("Failed to update product.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleProductCreate() {
    const name = newName.trim()
    const description = newDescription.trim()

    if (!name || !description || !newCategoryId) {
      toast.error("Name, description and category are required.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          brand: newBrand.trim() || null,
          description,
          image_url: newImageUrl.trim() || null,
          categoryId: newCategoryId,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error((data as { error?: string }).error || "Failed to create product.")
        return
      }

      toast.success("Product created.")
      setCreateOpen(false)
      setNewName("")
      setNewBrand("")
      setNewDescription("")
      setNewImageUrl("")
      setNewCategoryId(null)
      router.refresh()
    } catch {
      toast.error("Failed to create product.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleProductDelete() {
    if (deletingProductId === null) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/products/${deletingProductId}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error((data as { error?: string }).error || "Failed to delete product.")
        return
      }
      toast.success("Product deleted.")
      setDeletingProductId(null)
      router.refresh()
    } catch {
      toast.error("Failed to delete product.")
    } finally {
      setSubmitting(false)
    }
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
          placeholder="Search by name, brand, or ID"
          className="max-w-md"
        />

        <div className="flex items-center gap-2">
          {canManageProducts ? (
            <Button asChild>
              <Link href="/admin/products/new">Add Product</Link>
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
                  ["image", "Image"],
                  ["name", "Name"],
                  ["brand", "Brand"],
                  ["category", "Category"],
                  ["subCategory", "Sub Category"],
                  ["childCategory", "Child Category"],
                  ["description", "Description"],
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
          value={selectedCategory}
          options={categoryFilterOptions}
          onChange={(value) => {
            setSelectedCategory(value)
            setSelectedSubCategory("all")
            setSelectedChildCategory("all")
            setPageIndex(0)
          }}
        />

        <SmoothDropdown
          value={selectedSubCategory}
          options={subCategoryFilterOptions}
          onChange={(value) => {
            setSelectedSubCategory(value)
            setSelectedChildCategory("all")
            setPageIndex(0)
          }}
        />

        <SmoothDropdown
          value={selectedChildCategory}
          options={childCategoryFilterOptions}
          onChange={(value) => {
            setSelectedChildCategory(value)
            setPageIndex(0)
          }}
        />

        <SmoothDropdown
          value={String(pageSize)}
          options={pageSizeOptions}
          onChange={(value) => {
            const nextSize = Number(value)
            setPageSize(nextSize > 100 ? 100 : nextSize)
            setPageIndex(0)
          }}
        />

        <SmoothDropdown
          value={sortBy}
          options={sortOptions}
          onChange={(value) => {
            setSortBy(value)
            setPageIndex(0)
          }}
        />
      </div>

      {categoriesError ? <p className="text-sm text-destructive">{categoriesError}</p> : null}

      <div className="w-full overflow-x-auto rounded-lg border bg-card">
        <Table className="min-w-262.5 table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                  aria-label="Select all visible rows"
                />
              </TableHead>
              {visibleColumns.id ? <TableHead className="w-18">ID</TableHead> : null}
              {visibleColumns.image ? <TableHead className="w-20">Image</TableHead> : null}
              {visibleColumns.name ? <TableHead className="w-56">Name</TableHead> : null}
              {visibleColumns.brand ? <TableHead className="w-32">Brand</TableHead> : null}
              {visibleColumns.category ? <TableHead className="w-30">Category</TableHead> : null}
              {visibleColumns.subCategory ? <TableHead className="w-32">Sub Category</TableHead> : null}
              {visibleColumns.childCategory ? <TableHead className="w-34">Child Category</TableHead> : null}
              {visibleColumns.description ? <TableHead className="w-64">Description</TableHead> : null}
              <TableHead className="w-30">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productsError ? (
              <TableRow>
                <TableCell colSpan={11} className="py-6 text-center text-destructive">
                  {productsError}
                </TableCell>
              </TableRow>
            ) : paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="py-6 text-center text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(product.id)}
                      onChange={() => toggleRow(product.id)}
                      aria-label={`Select product ${product.id}`}
                    />
                  </TableCell>
                  {visibleColumns.id ? <TableCell className="w-18">{product.id}</TableCell> : null}
                  {visibleColumns.image ? (
                    <TableCell className="w-20">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="h-12 w-12 rounded-md border object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                            (e.target as HTMLImageElement).insertAdjacentHTML("afterend", '<div class="flex h-12 w-12 items-center justify-center rounded-md border text-xs text-muted-foreground">Broken</div>');
                          }}
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-md border text-xs text-muted-foreground">
                          No image
                        </div>
                      )}
                    </TableCell>
                  ) : null}
                  {visibleColumns.name ? (
                    <TableCell className="w-56">
                      <Link
                        href={`/admin/product-listings?productId=${product.id}`}
                        className="block overflow-hidden text-ellipsis font-medium underline-offset-4 hover:underline"
                        title={product.name}
                      >
                        {limitWords(product.name, 4)}
                      </Link>
                    </TableCell>
                  ) : null}
                  {visibleColumns.brand ? (
                    <TableCell className="w-32">
                      <span className="block overflow-hidden text-ellipsis" title={product.brand ?? "-"}>
                        {limitWords(product.brand, 3)}
                      </span>
                    </TableCell>
                  ) : null}
                  {visibleColumns.category ? (
                    <TableCell className="w-30">
                      <span className="block overflow-hidden text-ellipsis" title={product.category ?? "-"}>
                        {limitWords(product.category, 3)}
                      </span>
                    </TableCell>
                  ) : null}
                  {visibleColumns.subCategory ? (
                    <TableCell className="w-32">
                      <span className="block overflow-hidden text-ellipsis" title={product.subCategory ?? "-"}>
                        {limitWords(product.subCategory, 3)}
                      </span>
                    </TableCell>
                  ) : null}
                  {visibleColumns.childCategory ? (
                    <TableCell className="w-34">
                      <span className="block overflow-hidden text-ellipsis" title={product.childCategory ?? "-"}>
                        {limitWords(product.childCategory, 3)}
                      </span>
                    </TableCell>
                  ) : null}
                  {visibleColumns.description ? (
                    <TableCell className="w-64 text-xs leading-5 text-muted-foreground sm:text-sm">
                      <span
                        className="block overflow-hidden text-ellipsis whitespace-nowrap"
                        title={product.description ?? "-"}
                      >
                        {limitWords(product.description, 10)}
                      </span>
                    </TableCell>
                  ) : null}
                  <TableCell className="w-30 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        asChild
                      >
                        <Link
                          href={`/admin/products/${product.id}`}
                          aria-label={`View details for product ${product.name}`}
                          title="Product info"
                        >
                          <Info className="h-4 w-4" />
                        </Link>
                      </Button>

                      {canManageProducts ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingProduct(product)
                              setEditName(product.name)
                              setEditBrand(product.brand ?? "")
                              setEditDescription(product.description ?? "")
                              setEditImageUrl(product.image_url ?? "")
                              setEditCategoryId(product.categoryId)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeletingProductId(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {selectedIds.length} of {filteredRows.length} row(s) selected.
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

      {/* Edit Product Dialog */}
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
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>Create a product using the same admin design.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-name">Name</Label>
              <Input id="new-name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-brand">Brand</Label>
              <Input id="new-brand" value={newBrand} onChange={(e) => setNewBrand(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-description">Description</Label>
              <textarea
                id="new-description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-image-url">Image URL</Label>
              <Input id="new-image-url" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-category">Category</Label>
              <select
                id="new-category"
                value={newCategoryId ?? ""}
                onChange={(e) =>
                  setNewCategoryId(e.target.value ? Number(e.target.value) : null)
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {[cat.category, cat.subCategory, cat.name].filter(Boolean).join(" › ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={submitting}>Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleProductCreate}
              disabled={submitting || !newName.trim() || !newDescription.trim() || !newCategoryId}
            >
              {submitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog
        open={editingProduct !== null}
        onOpenChange={(open) => { if (!open) setEditingProduct(null) }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update the product details below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-brand">Brand</Label>
              <Input
                id="edit-brand"
                value={editBrand}
                onChange={(e) => setEditBrand(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-image-url">Image URL</Label>
              <Input
                id="edit-image-url"
                value={editImageUrl}
                onChange={(e) => setEditImageUrl(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-category">Category</Label>
              <select
                id="edit-category"
                value={editCategoryId ?? ""}
                onChange={(e) =>
                  setEditCategoryId(e.target.value ? Number(e.target.value) : null)
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {[cat.category, cat.subCategory, cat.name].filter(Boolean).join(" › ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={submitting}>Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleProductUpdate}
              disabled={submitting || !editName.trim()}
            >
              {submitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Product Dialog */}
      <Dialog
        open={deletingProductId !== null}
        onOpenChange={(open) => { if (!open) setDeletingProductId(null) }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={submitting}>Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleProductDelete}
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
