"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import SmoothDropdown, { type SmoothDropdownOption } from "@/components/ui/smooth-dropdown"
import { Switch } from "@/components/ui/switch"
import { getProducts } from "@/services/admin/products"
import { getSellers, type Seller } from "@/services/admin/sellers"
import type { Product } from "@/utils/types"

export default function NewProductListingPage() {
  const router = useRouter()

  const [products, setProducts] = useState<Product[]>([])
  const [sellers, setSellers] = useState<Seller[]>([])

  const [productId, setProductId] = useState("")
  const [sellerId, setSellerId] = useState("")
  const [refValue, setRefValue] = useState("")
  const [price, setPrice] = useState("")
  const [oldPrice, setOldPrice] = useState("")
  const [productUrl, setProductUrl] = useState("")
  const [availability, setAvailability] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const productOptions: SmoothDropdownOption[] = [
    { label: "Select product", value: "" },
    ...products.map((product) => ({
      value: String(product.id),
      label: `#${product.id} - ${product.name}`,
    })),
  ]

  const sellerOptions: SmoothDropdownOption[] = [
    { label: "Select seller", value: "" },
    ...sellers.map((seller) => ({
      value: String(seller.id),
      label: `#${seller.id} - ${seller.name}`,
    })),
  ]

  const availabilityOptions: SmoothDropdownOption[] = [
    { label: "Unknown", value: "" },
    { label: "Available", value: "true" },
    { label: "Unavailable", value: "false" },
  ]

  useEffect(() => {
    const load = async () => {
      try {
        const [allProducts, allSellers] = await Promise.all([getProducts(), getSellers()])
        setProducts(allProducts)
        setSellers(allSellers)
      } catch {
        toast.error("Unable to load products and sellers.")
      }
    }

    void load()
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!productId || !sellerId || !refValue.trim() || !price.trim() || !productUrl.trim()) {
      toast.error("Product, seller, ref, price and product URL are required.")
      return
    }

    setSubmitting(true)
    try {
      const resolvedAvailability =
        availability === "" ? null : availability === "true"

      const res = await fetch("/api/product-listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: Number(productId),
          sellerId: Number(sellerId),
          ref: refValue.trim(),
          price: Number(price),
          old_price: oldPrice.trim() ? Number(oldPrice) : null,
          product_url: productUrl.trim(),
          availability: resolvedAvailability,
          is_active: isActive,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error((data as { error?: string }).error || "Failed to create listing.")
        return
      }

      toast.success("Product listing created.")
      router.push("/admin/product-listings")
      router.refresh()
    } catch {
      toast.error("Failed to create listing.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="w-full max-w-none space-y-4">
      <h1 className="text-2xl font-bold">Add Product Listing</h1>

      <div className="mx-auto w-full max-w-2xl rounded-lg border bg-card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="listing-product">Product</Label>
            <SmoothDropdown
              value={productId}
              options={productOptions}
              onChange={setProductId}
              searchable
              searchPlaceholder="Search product..."
              maxVisibleItems={20}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="listing-seller">Seller</Label>
            <SmoothDropdown
              value={sellerId}
              options={sellerOptions}
              onChange={setSellerId}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="listing-ref">Ref</Label>
            <Input
              id="listing-ref"
              value={refValue}
              onChange={(event) => setRefValue(event.target.value)}
              placeholder="Enter reference"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="listing-price">Price</Label>
            <Input
              id="listing-price"
              type="number"
              min="0"
              step="0.001"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="listing-old-price">Old Price (optional)</Label>
            <Input
              id="listing-old-price"
              type="number"
              min="0"
              step="0.001"
              value={oldPrice}
              onChange={(event) => setOldPrice(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="listing-url">Product URL</Label>
            <Input
              id="listing-url"
              value={productUrl}
              onChange={(event) => setProductUrl(event.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="listing-availability">Availability</Label>
            <SmoothDropdown
              value={availability}
              options={availabilityOptions}
              onChange={setAvailability}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <Label htmlFor="listing-active">Active</Label>
            <Switch id="listing-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" asChild disabled={submitting}>
              <Link href="/admin/product-listings">Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={
                submitting ||
                !productId ||
                !sellerId ||
                !refValue.trim() ||
                !price.trim() ||
                !productUrl.trim()
              }
            >
              {submitting ? "Creating..." : "Create Product Listing"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  )
}
