import type { LucideIcon } from "lucide-react"
import { Home, Package, PlusCircle, Tag } from "lucide-react"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000"

type SidebarSubItem = {
  title: string
  url: string
}

type SidebarItem = {
  id: string
  name: string
  icon: LucideIcon
  isActive?: boolean
  items?: SidebarSubItem[]
}

const SIDEBAR_CONSTANTS: SidebarItem[] = [
  {
    id: "/admin/",
    name: "Dashboard",
    icon: Home,
    isActive: true,
  },
  {
    id: "/admin/categories",
    name: "Categories",
    icon: Tag,
    items: [
      {
        title: "All Categories",
        url: "/admin/categories",
      },
      {
        title: "Add Category",
        url: "/admin/categories/new",
      },
    ],
  },
  {
    id: "/admin/products",
    name: "Products",
    icon: Package,
    items: [
      {
        title: "All Products",
        url: "/admin/products",
      },
      {
        title: "Add Product",
        url: "/admin/products/new",
      },
      {
        title: "Product Listings",
        url: "/admin/product-listings",
      },
    ],
  },
  {
    id: "/admin/products/new",
    name: "New Product",
    icon: PlusCircle,
  },
]

export { BACKEND_URL, SIDEBAR_CONSTANTS }
export type { SidebarItem, SidebarSubItem }