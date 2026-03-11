"use client"

import Link from "next/link"
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
            {SIDEBAR_CONSTANTS.map((item) => (
              <Collapsible
                key={item.id}
                asChild
                defaultOpen={item.isActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  {item.items && item.items.length > 0 ? (
                    <>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.name}>
                          <item.icon className="size-4" />
                          <span>{item.name}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="grid transition-[grid-template-rows] duration-300 ease-in-out data-[state=open]:grid-rows-[1fr] data-[state=closed]:grid-rows-[0fr]">
                        <div className="overflow-hidden">
                          <SidebarMenuSub>
                            {item.items.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton asChild>
                                  <Link href={subItem.url}>
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </div>
                      </CollapsibleContent>
                    </>
                  ) : (
                    <SidebarMenuButton asChild tooltip={item.name}>
                      <Link href={item.id}>
                        <item.icon className="size-4" />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

export default AdminSidebar
