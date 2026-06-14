"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import SmoothDropdown, { type SmoothDropdownOption } from "@/components/ui/smooth-dropdown"
import { getCategoriesWithParents } from "@/services/categories"
import type { CategoryWithParent } from "@/utils/types"

export default function EditCategoryPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [name, setName] = useState("")
  const [parentId, setParentId] = useState("")
  const [categories, setCategories] = useState<CategoryWithParent[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const parentOptions: SmoothDropdownOption[] = [
    { label: "No parent", value: "" },
    ...categories
      .filter((c) => String(c.id) !== id)
      .map((category) => ({
        value: String(category.id),
        label: [category.category, category.subCategory, category.name].filter(Boolean).join(" > "),
      })),
  ]

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCategoriesWithParents()
        setCategories(data)

        const current = data.find((c) => String(c.id) === id)
        if (!current) {
          toast.error("Category not found.")
          router.push("/admin/categories")
          return
        }

        setName(current.name)
        setParentId(current.category ? String(data.find((c) => c.name === current.category)?.id ?? "") : "")
      } catch {
        toast.error("Unable to load categories.")
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [id, router])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!name.trim()) {
      toast.error("Category name is required.")
      return
    }

    setSubmitting(true)
    try {
      const payload: { name: string; parentId?: number } = { name: name.trim() }
      if (parentId) {
        payload.parentId = Number(parentId)
      }

      const res = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error((data as { error?: string }).error || "Failed to update category.")
        return
      }

      toast.success("Category updated.")
      router.push("/admin/categories")
      router.refresh()
    } catch {
      toast.error("Failed to update category.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <section className="w-full max-w-none space-y-4">
        <h1 className="text-2xl font-bold">Edit Category</h1>
        <p className="text-sm text-muted-foreground">Loading category...</p>
      </section>
    )
  }

  return (
    <section className="w-full max-w-none space-y-4">
      <h1 className="text-2xl font-bold">Edit Category</h1>

      <div className="mx-auto w-full max-w-2xl rounded-lg border bg-card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="category-name">Category Name</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter category name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="parent-category">Parent Category (optional)</Label>
            <SmoothDropdown
              value={parentId}
              options={parentOptions}
              onChange={setParentId}
              searchable
              searchPlaceholder="Search category..."
              maxVisibleItems={20}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" asChild disabled={submitting}>
              <Link href="/admin/categories">Cancel</Link>
            </Button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  )
}
