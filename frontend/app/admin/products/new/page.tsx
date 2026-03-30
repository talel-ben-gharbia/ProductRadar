"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import SmoothDropdown, { type SmoothDropdownOption } from "@/components/ui/smooth-dropdown"
import { getCategoriesWithParents } from "@/services/admin/categories"
import type { CategoryWithParent } from "@/utils/types"

export default function NewProductPage() {
  const router = useRouter()

  const [name, setName] = useState("")
  const [brand, setBrand] = useState("")
  const [description, setDescription] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [categories, setCategories] = useState<CategoryWithParent[]>([])
  const [submitting, setSubmitting] = useState(false)

  const categoryOptions: SmoothDropdownOption[] = [
    { label: "Select category", value: "" },
    ...categories.map((category) => ({
      value: String(category.id),
      label: [category.category, category.subCategory, category.name].filter(Boolean).join(" > "),
    })),
  ]

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCategoriesWithParents()
        setCategories(data)
      } catch {
        toast.error("Unable to load categories.")
      }
    }

    void load()
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!name.trim() || !description.trim() || !categoryId) {
      toast.error("Name, description and category are required.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          brand: brand.trim() || null,
          description: description.trim(),
          image_url: imageUrl.trim() || null,
          categoryId: Number(categoryId),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error((data as { error?: string }).error || "Failed to create product.")
        return
      }

      toast.success("Product created.")
      router.push("/admin/products")
      router.refresh()
    } catch {
      toast.error("Failed to create product.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="w-full max-w-none space-y-4">
      <h1 className="text-2xl font-bold">Add Product</h1>

      <div className="mx-auto w-full max-w-2xl rounded-lg border bg-card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="product-name">Name</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter product name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-brand">Brand (optional)</Label>
            <Input
              id="product-brand"
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              placeholder="Enter product brand"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-description">Description</Label>
            <textarea
              id="product-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-image-url">Image URL (optional)</Label>
            <Input
              id="product-image-url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-category">Category</Label>
            <SmoothDropdown
              value={categoryId}
              options={categoryOptions}
              onChange={setCategoryId}
              searchable
              searchPlaceholder="Search category..."
              maxVisibleItems={20}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" asChild disabled={submitting}>
              <Link href="/admin/products">Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={submitting || !name.trim() || !description.trim() || !categoryId}
            >
              {submitting ? "Creating..." : "Create Product"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  )
}
