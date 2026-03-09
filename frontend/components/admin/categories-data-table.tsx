"use client"

import Link from "next/link"
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

type CategoriesDataTableProps = {
  categories: CategoryWithParent[]
  loading: boolean
  fetchError: string | null
}

type DropdownOption = {
  label: string
  value: string
}

type SmoothDropdownProps = {
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
}

function SmoothDropdown({ value, options, onChange }: SmoothDropdownProps) {
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
    <div ref={menuRef} className="relative">
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

export default function CategoriesDataTable({
  categories,
  loading,
  fetchError,
}: CategoriesDataTableProps) {
  const [search, setSearch] = useState("")
  const [pageSize, setPageSize] = useState(100)
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedSubCategory, setSelectedSubCategory] = useState("all")
  const [selectedChildCategory, setSelectedChildCategory] = useState("all")

  const categoryOptions = useMemo(() => {
    return Array.from(
      new Set(
        categories
          .map((category) => category.category)
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b))
  }, [categories])

  const subCategoryOptions = useMemo(() => {
    const source =
      selectedCategory === "all"
        ? categories
        : categories.filter((item) => item.category === selectedCategory)

    return Array.from(
      new Set(
        source
          .map((category) => category.subCategory)
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b))
  }, [categories, selectedCategory])

  const childCategoryOptions = useMemo(() => {
    const source = categories.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false
      }

      if (selectedSubCategory !== "all" && item.subCategory !== selectedSubCategory) {
        return false
      }

      return true
    })

    return Array.from(
      new Set(
        source
          .map((category) => category.childCategory)
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b))
  }, [categories, selectedCategory, selectedSubCategory])

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

    return categories.filter((category) => {
      if (selectedCategory !== "all" && category.category !== selectedCategory) {
        return false
      }

      if (selectedSubCategory !== "all" && category.subCategory !== selectedSubCategory) {
        return false
      }

      if (
        selectedChildCategory !== "all" &&
        category.childCategory !== selectedChildCategory
      ) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return (
        category.name.toLowerCase().includes(normalizedSearch) ||
        (category.category ?? "").toLowerCase().includes(normalizedSearch) ||
        (category.subCategory ?? "").toLowerCase().includes(normalizedSearch) ||
        (category.childCategory ?? "").toLowerCase().includes(normalizedSearch)
      )
    })
  }, [
    categories,
    search,
    selectedCategory,
    selectedSubCategory,
    selectedChildCategory,
  ])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const currentPage = Math.min(pageIndex, totalPages - 1)

  const paginatedRows = useMemo(() => {
    const start = currentPage * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, currentPage, pageSize])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPageIndex(0)
          }}
          placeholder="Search by name or hierarchy"
          className="md:col-span-2"
        />

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

      <div className="w-full rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Child Category</TableHead>
              <TableHead>Sub Category</TableHead>
              <TableHead>Category</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                  Loading categories...
                </TableCell>
              </TableRow>
            ) : fetchError ? (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-destructive">
                  {fetchError}
                </TableCell>
              </TableRow>
            ) : paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                  No categories found
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>{category.id}</TableCell>
                  <TableCell className="max-w-55 truncate" title={category.name}>
                    <Link
                      href={`/admin/products?categoryId=${category.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {category.name}
                    </Link>
                  </TableCell>
                  <TableCell>{category.childCategory ?? "-"}</TableCell>
                  <TableCell>{category.subCategory ?? "-"}</TableCell>
                  <TableCell>{category.category ?? "-"}</TableCell>
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
