"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, Pencil } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { CategoryWithParent } from "@/utils/types"

type CategoriesDataTableProps = {
  categories: CategoryWithParent[]
  loading: boolean
  fetchError: string | null
  onDataChanged: () => Promise<void>
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

export default function CategoriesDataTable({
  categories,
  loading,
  fetchError,
  onDataChanged,
}: CategoriesDataTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [pageSize, setPageSize] = useState(25)
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedSubCategory, setSelectedSubCategory] = useState("all")
  const [selectedChildCategory, setSelectedChildCategory] = useState("all")
  const [createOpen, setCreateOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newParentId, setNewParentId] = useState<string>("")

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

  async function handleCategoryCreate() {
    const name = newCategoryName.trim()
    if (!name) {
      toast.error("Category name is required.")
      return
    }

    setSubmitting(true)
    try {
      const payload: { name: string; parentId?: number } = { name }
      if (newParentId) {
        payload.parentId = Number(newParentId)
      }

      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error((data as { error?: string }).error || "Failed to create category.")
        return
      }

      toast.success("Category created.")
      setCreateOpen(false)
      setNewCategoryName("")
      setNewParentId("")
      await onDataChanged()
      router.refresh()
    } catch {
      toast.error("Failed to create category.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button asChild>
          <Link href="/admin/categories/new">Add Category</Link>
        </Button>
      </div>

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
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Spinner className="size-4" />
                    <span>Loading categories...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : fetchError ? (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-destructive">
                  {fetchError}
                </TableCell>
              </TableRow>
            ) : paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
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
                  <TableCell>
                    <Link
                      href={`/admin/categories/${category.id}`}
                      className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="size-4" />
                      <span className="sr-only">Edit</span>
                    </Link>
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
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>Create a category using the same admin flow.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-category-name">Category Name</Label>
              <Input
                id="new-category-name"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="Enter category name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-category-parent">Parent Category (optional)</Label>
              <select
                id="new-category-parent"
                value={newParentId}
                onChange={(event) => setNewParentId(event.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">No parent</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {[category.category, category.subCategory, category.name]
                      .filter(Boolean)
                      .join(" › ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={submitting}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleCategoryCreate} disabled={submitting || !newCategoryName.trim()}>
              {submitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
