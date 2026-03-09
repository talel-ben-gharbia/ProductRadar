"use client"
/* eslint-disable @next/next/no-img-element */

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
import type { CategoryWithParent } from "@/services/admin/categories"
import type { Product } from "@/services/admin/products"

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

export default function ProductsDataTable({
  products,
  categories,
  productsError,
  categoriesError,
  initialCategoryId,
}: ProductsDataTableProps) {
  const [search, setSearch] = useState("")
  const [isColumnsOpen, setIsColumnsOpen] = useState(false)
  const [pageSize, setPageSize] = useState(100)
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    ref: true,
    image: true,
    name: true,
    brand: true,
    category: true,
    subCategory: true,
    childCategory: true,
    description: true,
  })
  const columnsMenuRef = useRef<HTMLDivElement | null>(null)

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

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return rows.filter((row) => {
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
        row.name.toLowerCase().includes(normalizedSearch) ||
        row.ref.toLowerCase().includes(normalizedSearch) ||
        (row.brand ?? "").toLowerCase().includes(normalizedSearch)
      )
    })
  }, [rows, search, selectedCategory, selectedSubCategory, selectedChildCategory])

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPageIndex(0)
          }}
          placeholder="Search by name, ref, or brand"
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
                ["ref", "Ref"],
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
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
      </div>

      {categoriesError ? <p className="text-sm text-destructive">{categoriesError}</p> : null}

      <div className="w-full rounded-lg border bg-card">
        <Table>
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
              {visibleColumns.id ? <TableHead>ID</TableHead> : null}
              {visibleColumns.ref ? <TableHead>Ref</TableHead> : null}
              {visibleColumns.image ? <TableHead>Image</TableHead> : null}
              {visibleColumns.name ? <TableHead className="w-45">Name</TableHead> : null}
              {visibleColumns.brand ? <TableHead>Brand</TableHead> : null}
              {visibleColumns.category ? <TableHead>Category</TableHead> : null}
              {visibleColumns.subCategory ? <TableHead>Sub Category</TableHead> : null}
              {visibleColumns.childCategory ? <TableHead>Child Category</TableHead> : null}
              {visibleColumns.description ? <TableHead>Description</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {productsError ? (
              <TableRow>
                <TableCell colSpan={10} className="py-6 text-center text-destructive">
                  {productsError}
                </TableCell>
              </TableRow>
            ) : paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-6 text-center text-muted-foreground">
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
                  {visibleColumns.id ? <TableCell>{product.id}</TableCell> : null}
                  {visibleColumns.ref ? <TableCell>{product.ref}</TableCell> : null}
                  {visibleColumns.image ? (
                    <TableCell>
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-12 w-12 rounded-md border object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-md border text-xs text-muted-foreground">
                          No image
                        </div>
                      )}
                    </TableCell>
                  ) : null}
                  {visibleColumns.name ? (
                    <TableCell className="max-w-45 truncate" title={product.name}>
                      {product.name}
                    </TableCell>
                  ) : null}
                  {visibleColumns.brand ? <TableCell>{product.brand ?? "-"}</TableCell> : null}
                  {visibleColumns.category ? <TableCell>{product.category ?? "-"}</TableCell> : null}
                  {visibleColumns.subCategory ? <TableCell>{product.subCategory ?? "-"}</TableCell> : null}
                  {visibleColumns.childCategory ? <TableCell>{product.childCategory ?? "-"}</TableCell> : null}
                  {visibleColumns.description ? (
                    <TableCell className="max-w-65 truncate" title={product.description}>
                      {product.description}
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
