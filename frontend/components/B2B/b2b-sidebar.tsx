"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Building2, Home } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type B2BSidebarItem = {
  id: string
  name: string
  icon: typeof Home
}

const B2B_SIDEBAR_ITEMS: B2BSidebarItem[] = [
  {
    id: "/B2B/dashboard",
    name: "Dashboard",
    icon: Home,
  },
]

function B2BSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="gap-3 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              variant="outline"
              tooltip="Product Radar B2B workspace"
              className="h-auto gap-3 rounded-xl px-3 py-3"
            >
              <Link href="/B2B/dashboard" className="items-start gap-3">
                <Avatar
                  size="lg"
                  className="rounded-xl bg-sidebar-primary text-sidebar-primary-foreground after:border-sidebar-primary/20"
                >
                  <AvatarFallback className="rounded-xl bg-transparent text-sidebar-primary-foreground">
                    <Building2 className="size-5" />
                  </AvatarFallback>
                </Avatar>
                <span className="grid flex-1 text-left group-data-[collapsible=icon]:hidden">
                  <span className="text-sm font-semibold leading-none">Product Radar</span>
                  <span className="mt-1 text-xs text-sidebar-foreground/70">B2B workspace</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="rounded-xl border border-sidebar-border/70 bg-sidebar-accent/40 px-3 py-3 group-data-[collapsible=icon]:hidden">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-sidebar-foreground/55">
            Workspace
          </p>
          <p className="mt-2 text-sm font-medium text-sidebar-foreground">Partner dashboard</p>
          <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/70">
            Manage your company profile, listings, and performance.
          </p>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup className="px-2 py-1">
          <SidebarGroupLabel className="px-2">Navigation</SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            {B2B_SIDEBAR_ITEMS.map((item) => {
              const active = pathname === item.id

              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.name}
                    isActive={active}
                    data-active={active || undefined}
                  >
                    <Link href={item.id}>
                      <item.icon className="size-4" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

export default B2BSidebar