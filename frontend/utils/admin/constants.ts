import type { LucideIcon } from "lucide-react"
import {
  Activity,
  Home,
  Layers,
  ListTree,
  Package,
  Store,
  Tag,
} from "lucide-react"

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
    ],
  },
  {
    id: "/admin/product-listings",
    name: "Product Listings",
    icon: ListTree,
    items: [
      {
        title: "All Product Listings",
        url: "/admin/product-listings",
      },
      {
        title: "Add Product Listing",
        url: "/admin/product-listings/new",
      },
    ],
  },
  {
    id: "/admin/sellers",
    name: "Sellers",
    icon: Store,
  },
]

const SUPER_ADMIN_SIDEBAR_CONSTANTS: SidebarItem[] = [
  {
    id: "/admin/tools",
    name: "Tools",
    icon: Layers,
    items: [
      {
        title: "Duplicates",
        url: "/admin/duplicates",
      },
      {
        title: "Data Quality",
        url: "/admin/quality-control",
      },
      {
        title: "Export Data",
        url: "/admin/export",
      },
    ],
  },
  {
    id: "/admin/system",
    name: "System",
    icon: Activity,
    items: [
      {
        title: "All Admins",
        url: "/admin/admins",
      },
      {
        title: "Manage Roles",
        url: "/admin/admins/roles",
      },
      {
        title: "Activity Log",
        url: "/admin/activity-log",
      },
      {
        title: "System Health",
        url: "/admin/system-health",
      },
    ],
  },
]

export { BACKEND_URL, SIDEBAR_CONSTANTS, SUPER_ADMIN_SIDEBAR_CONSTANTS }
export type { SidebarItem, SidebarSubItem }