"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible"
import { ChevronRight } from "lucide-react"

import { SIDEBAR_CONSTANTS } from "@/utils/admin/constants"
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"

function AdminSidebar() {
  const pathname = usePathname()

  function isItemActive(id: string): boolean {
    if (id === "/admin/") return pathname === "/admin"
    return pathname.startsWith(id)
  }

  function isSubItemActive(url: string): boolean {
    return pathname === url
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Product Web Radar">
              <Link href="/admin" className="gap-2">
                <span className="inline-flex size-6 items-center justify-center rounded-md bg-sidebar-accent text-xs font-bold text-sidebar-accent-foreground">
                  PR
                </span>
                <span className="font-semibold group-data-[collapsible=icon]:hidden">
                  Product Web Radar
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup className="p-1">
          <SidebarGroupLabel className="px-2">Menu</SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            {SIDEBAR_CONSTANTS.map((item) => {
              const active = isItemActive(item.id)

              return (
                <Collapsible
                  key={item.id}
                  asChild
                  defaultOpen={item.isActive || active}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    {item.items && item.items.length > 0 ? (
                      <>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.name}
                            data-active={active || undefined}
                          >
                            <item.icon className="size-4" />
                            <span>{item.name}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>

                        <CollapsibleContent className="overflow-hidden transition-all duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:slide-in-from-top-1">
                          <SidebarMenuSub>
                            {item.items.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  data-active={isSubItemActive(subItem.url) || undefined}
                                >
                                  <Link href={subItem.url}>
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </>
                    ) : (
                      <SidebarMenuButton
                        asChild
                        tooltip={item.name}
                        data-active={active || undefined}
                      >
                        <Link href={item.id}>
                          <item.icon className="size-4" />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                </Collapsible>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

export default AdminSidebar
