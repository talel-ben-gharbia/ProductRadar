import type { LucideIcon } from "lucide-react"
import {
  Activity,
  Briefcase,
  Database,
  Home,
  Layers,
  ListTree,
  MessageSquare,
  Package,
  Store,
  Tag,
  Users,
} from "lucide-react"

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  "http://127.0.0.1:8000"

type SidebarSubItem = {
  title: string
  url: string
}

type SidebarSection = {
  title: string
  items: SidebarSubItem[]
}

type SidebarItem = {
  id: string
  name: string
  icon: LucideIcon
  isActive?: boolean
  items?: SidebarSubItem[]
  sections?: SidebarSection[]
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
  {
    id: "/admin/reviews",
    name: "Reviews",
    icon: MessageSquare,
    items: [
      {
        title: "Moderation Queue",
        url: "/admin/reviews",
      },
    ],
  },
  {
    id: "/admin/data-management",
    name: "Data Management",
    icon: Database,
    items: [
      {
        title: "Overview",
        url: "/admin/data-management",
      },
      {
        title: "Data Sources",
        url: "/admin/data-management/sources",
      },
      {
        title: "Scraping Logs",
        url: "/admin/data-management/scraping-logs",
      },
      {
        title: "Manual Scraping",
        url: "/admin/data-management/webhook",
      },
    ],
  },
  {
    id: "/admin/b2b-workflows",
    name: "B2B Workflows",
    icon: Briefcase,
    items: [
      {
        title: "Sponsored Products",
        url: "/admin/b2b/sponsored-products",
      },
      {
        title: "Renewal Requests",
        url: "/admin/b2b-workflows/renewals",
      },
      {
        title: "Ads Requests",
        url: "/admin/b2b-workflows/ads-requests",
      },
      {
        title: "Business Reports",
        url: "/admin/b2b-workflows/reports",
      },
      {
        title: "Brand Scope",
        url: "/admin/b2b-management/brand-scope",
      },
    ],
  },
  {
    id: "/admin/users",
    name: "Users & Accounts",
    icon: Users,
    sections: [
      {
        title: "",
        items: [
          {
            title: "All Users",
            url: "/admin/users",
          },
        ],
      },
      {
        title: "B2C",
        items: [
          {
            title: "Customer Management",
            url: "/admin/customers",
          },
        ],
      },
      {
        title: "B2B",
        items: [
          {
            title: "B2B Management",
            url: "/admin/b2b-management",
          },
          {
            title: "B2B Verification",
            url: "/admin/b2b-verification",
          },
        ],
      },
      {
        title: "Billing",
        items: [
          {
            title: "Subscriptions",
            url: "/admin/subscriptions",
          },
        ],
      },
    ],
  },
]

const SUPER_ADMIN_SIDEBAR_CONSTANTS: SidebarItem[] = [
  {
    id: "/admin/tools",
    name: "Data & Quality",
    icon: Layers,
    items: [
      {
        title: "Bulk Operations",
        url: "/admin/bulk-operations",
      },
      {
        title: "Duplicates",
        url: "/admin/duplicates",
      },
      {
        title: "Data Quality",
        url: "/admin/quality-control",
      },
      {
        title: "Product Issues",
        url: "/admin/quality-control/product-issues",
      },
      {
        title: "Seller Listing Collisions",
        url: "/admin/quality-control/seller-collisions",
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
export type { SidebarItem, SidebarSection, SidebarSubItem }