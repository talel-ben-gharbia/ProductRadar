"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible"
import {
  ChevronsUpDown,
  LogOut,
  Radar,
  Shield,
  User,
  ChevronRight,
  Zap,
  Mail,
  CreditCard,
} from "lucide-react"

import { useAdmin } from "@/components/admin/admin-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SIDEBAR_CONSTANTS, SUPER_ADMIN_SIDEBAR_CONSTANTS, N8N_URL, STRIPE_URL } from "@/utils/admin/constants"
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarSeparator,
} from "@/components/ui/sidebar"

function AdminSidebar() {
  const pathname = usePathname()
  const { admin, loading, logout, displayRole } = useAdmin()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const overviewItems = SIDEBAR_CONSTANTS.filter((item) => item.id === "/admin/")
  const catalogItems = SIDEBAR_CONSTANTS.filter((item) => [
    "/admin/categories",
    "/admin/products",
    "/admin/product-listings",
    "/admin/sellers",
  ].includes(item.id))
  const moderationDataItems = SIDEBAR_CONSTANTS.filter((item) => [
    "/admin/reviews",
    "/admin/data-management",
  ].includes(item.id))
  const b2bWorkflowsItems = SIDEBAR_CONSTANTS.filter((item) => item.id === "/admin/b2b-workflows")
  const userAccountItems = SIDEBAR_CONSTANTS.filter((item) => item.id === "/admin/users")

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current) {
        return
      }

      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false)
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [])

  function isItemActive(id: string): boolean {
    if (id === "/admin/") return pathname === "/admin"
    return pathname.startsWith(id)
  }

  function getItemPathCandidates(item: { id: string; items?: { url: string }[]; sections?: { items: { url: string }[] }[] }): string[] {
    const nestedUrls = [
      ...(item.items ?? []).map((subItem) => subItem.url),
      ...(item.sections ?? []).flatMap((section) => section.items.map((subItem) => subItem.url)),
    ]

    return [item.id, ...nestedUrls]
  }

  function isItemOrChildActive(item: { id: string; items?: { url: string }[]; sections?: { items: { url: string }[] }[] }): boolean {
    return getItemPathCandidates(item).some((url) => isSubItemActive(url.split("?")[0] ?? url) || isItemActive(url))
  }

  function isSubItemActive(url: string): boolean {
    return pathname === url
  }

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="gap-3 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              variant="outline"
              tooltip="Product Radar Workspace"
              className="h-auto gap-3 rounded-xl px-3 py-3"
            >
              <Link href="/admin" className="items-start gap-3">
                <Avatar size="lg" className="rounded-xl bg-sidebar-primary text-sidebar-primary-foreground after:border-sidebar-primary/20">
                  <AvatarFallback className="rounded-xl bg-transparent text-sidebar-primary-foreground">
                    <Radar className="size-5" />
                  </AvatarFallback>
                </Avatar>
                <span className="grid flex-1 text-left group-data-[collapsible=icon]:hidden">
                  <span className="text-sm font-semibold leading-none">
                    Product Radar
                  </span>
                  <span className="mt-1 text-xs text-sidebar-foreground/70">
                    Admin workspace
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="rounded-xl border border-sidebar-border/70 bg-sidebar-accent/40 px-3 py-3 group-data-[collapsible=icon]:hidden">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-sidebar-foreground/55">
            Platform
          </p>
          <p className="mt-2 text-sm font-medium text-sidebar-foreground">
            Back office controls
          </p>
          <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/70">
            Manage products, categories, listings, and admin activity.
          </p>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup className="px-2 py-1">
          <SidebarGroupLabel className="px-2">Overview</SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            {overviewItems.map((item) => {
              const active = isItemActive(item.id)

              return (
                <Collapsible
                  key={item.id}
                  asChild
                  defaultOpen={item.isActive || active || isItemOrChildActive(item)}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    {item.sections && item.sections.length > 0 ? (
                      <>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.name}
                            isActive={active}
                            data-active={active || undefined}
                          >
                            <item.icon className="size-4" />
                            <span>{item.name}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>

                        <CollapsibleContent className="grid transition-[grid-template-rows] duration-300 ease-in-out data-[state=open]:grid-rows-[1fr] data-[state=closed]:grid-rows-[0fr]">
                          <div className="overflow-hidden">
                            <div className="space-y-2 py-1">
                              {item.sections.map((section) => (
                                <div key={section.title} className="space-y-1">
                                  <p className="px-5 pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                    {section.title}
                                  </p>
                                  <SidebarMenuSub>
                                    {section.items.map((subItem) => (
                                      <SidebarMenuSubItem key={subItem.title}>
                                        <SidebarMenuSubButton
                                          asChild
                                          isActive={isSubItemActive(subItem.url.split("?")[0] ?? subItem.url)}
                                          data-active={isSubItemActive(subItem.url.split("?")[0] ?? subItem.url) || undefined}
                                          className="font-normal"
                                        >
                                          <Link href={subItem.url}>
                                            <span>{subItem.title}</span>
                                          </Link>
                                        </SidebarMenuSubButton>
                                      </SidebarMenuSubItem>
                                    ))}
                                  </SidebarMenuSub>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </>
                    ) : item.items && item.items.length > 0 ? (
                      <>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.name}
                            isActive={active}
                            data-active={active || undefined}
                          >
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
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isSubItemActive(subItem.url.split("?")[0] ?? subItem.url)}
                                  data-active={isSubItemActive(subItem.url.split("?")[0] ?? subItem.url) || undefined}
                                  className="font-normal"
                                >
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
                    )}
                  </SidebarMenuItem>
                </Collapsible>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator className="mx-2 my-2" />

        <SidebarGroup className="px-2 py-1">
          <SidebarGroupLabel className="px-2">Catalog</SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            {catalogItems.map((item) => {
              const active = isItemActive(item.id)

              return (
                <Collapsible
                  key={item.id}
                  asChild
                  defaultOpen={item.isActive || active || isItemOrChildActive(item)}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    {item.sections && item.sections.length > 0 ? (
                      <>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.name}
                            isActive={active}
                            data-active={active || undefined}
                          >
                            <item.icon className="size-4" />
                            <span>{item.name}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>

                        <CollapsibleContent className="grid transition-[grid-template-rows] duration-300 ease-in-out data-[state=open]:grid-rows-[1fr] data-[state=closed]:grid-rows-[0fr]">
                          <div className="overflow-hidden">
                            <div className="space-y-2 py-1">
                              {item.sections.map((section) => (
                                <div key={section.title} className="space-y-1">
                                  <p className="px-5 pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                    {section.title}
                                  </p>
                                  <SidebarMenuSub>
                                    {section.items.map((subItem) => (
                                      <SidebarMenuSubItem key={subItem.title}>
                                        <SidebarMenuSubButton
                                          asChild
                                          isActive={isSubItemActive(subItem.url.split("?")[0] ?? subItem.url)}
                                          data-active={isSubItemActive(subItem.url.split("?")[0] ?? subItem.url) || undefined}
                                          className="font-normal"
                                        >
                                          <Link href={subItem.url}>
                                            <span>{subItem.title}</span>
                                          </Link>
                                        </SidebarMenuSubButton>
                                      </SidebarMenuSubItem>
                                    ))}
                                  </SidebarMenuSub>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </>
                    ) : item.items && item.items.length > 0 ? (
                      <>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.name}
                            isActive={active}
                            data-active={active || undefined}
                          >
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
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isSubItemActive(subItem.url.split("?")[0] ?? subItem.url)}
                                  data-active={isSubItemActive(subItem.url.split("?")[0] ?? subItem.url) || undefined}
                                  className="font-normal"
                                >
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
                    )}
                  </SidebarMenuItem>
                </Collapsible>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator className="mx-2 my-2" />

        <SidebarGroup className="px-2 py-1">
          <SidebarGroupLabel className="px-2">Moderation & Data</SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            {moderationDataItems.map((item) => {
              const active = isItemActive(item.id)

              return (
                <Collapsible
                  key={item.id}
                  asChild
                  defaultOpen={item.isActive || active}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    {item.sections && item.sections.length > 0 ? (
                      <>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.name}
                            isActive={active}
                            data-active={active || undefined}
                          >
                            <item.icon className="size-4" />
                            <span>{item.name}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>

                        <CollapsibleContent className="grid transition-[grid-template-rows] duration-300 ease-in-out data-[state=open]:grid-rows-[1fr] data-[state=closed]:grid-rows-[0fr]">
                          <div className="overflow-hidden">
                            <div className="space-y-2 py-1">
                              {item.sections.map((section) => (
                                <div key={section.title} className="space-y-1">
                                  <p className="px-5 pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                    {section.title}
                                  </p>
                                  <SidebarMenuSub>
                                    {section.items.map((subItem) => (
                                      <SidebarMenuSubItem key={subItem.title}>
                                        <SidebarMenuSubButton
                                          asChild
                                          isActive={isSubItemActive(subItem.url.split("?")[0] ?? subItem.url)}
                                          data-active={isSubItemActive(subItem.url.split("?")[0] ?? subItem.url) || undefined}
                                          className="font-normal"
                                        >
                                          <Link href={subItem.url}>
                                            <span>{subItem.title}</span>
                                          </Link>
                                        </SidebarMenuSubButton>
                                      </SidebarMenuSubItem>
                                    ))}
                                  </SidebarMenuSub>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </>
                    ) : item.items && item.items.length > 0 ? (
                      <>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.name}
                            isActive={active}
                            data-active={active || undefined}
                          >
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
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isSubItemActive(subItem.url.split("?")[0] ?? subItem.url)}
                                  data-active={isSubItemActive(subItem.url.split("?")[0] ?? subItem.url) || undefined}
                                  className="font-normal"
                                >
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
                    )}
                  </SidebarMenuItem>
                </Collapsible>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator className="mx-2 my-2" />

        <SidebarGroup className="px-2 py-1">
          <SidebarGroupLabel className="px-2">B2B Workflows</SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            {b2bWorkflowsItems.map((item) => {
              const active = isItemActive(item.id)

              return (
                <Collapsible
                  key={item.id}
                  asChild
                  defaultOpen={item.isActive || active || isItemOrChildActive(item)}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    {item.items && item.items.length > 0 ? (
                      <>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.name}
                            isActive={active}
                            data-active={active || undefined}
                          >
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
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={isSubItemActive(subItem.url.split("?")[0] ?? subItem.url)}
                                    data-active={isSubItemActive(subItem.url.split("?")[0] ?? subItem.url) || undefined}
                                    className="font-normal"
                                  >
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
                    )}
                  </SidebarMenuItem>
                </Collapsible>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        {userAccountItems.length > 0 && (
          <>
            <SidebarSeparator className="mx-2 my-2" />
            <SidebarGroup className="px-2 py-1">
              <SidebarGroupLabel className="px-2">Users & Accounts</SidebarGroupLabel>
              <SidebarMenu className="gap-1">
                {userAccountItems.map((item) => {
                  const active = isItemActive(item.id)

                  return (
                    <Collapsible
                      key={item.id}
                      asChild
                      defaultOpen={item.isActive || active || isItemOrChildActive(item)}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        {item.sections && item.sections.length > 0 ? (
                          <>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton
                                tooltip={item.name}
                                isActive={active}
                                data-active={active || undefined}
                              >
                                <item.icon className="size-4" />
                                <span>{item.name}</span>
                                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>

                            <CollapsibleContent className="grid transition-[grid-template-rows] duration-300 ease-in-out data-[state=open]:grid-rows-[1fr] data-[state=closed]:grid-rows-[0fr]">
                              <div className="overflow-hidden">
                                <div className="space-y-2 py-1">
                                  {item.sections.map((section) => (
                                    <div key={section.title} className="space-y-1">
                                      <p className="px-5 pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                        {section.title}
                                      </p>
                                      <SidebarMenuSub>
                                        {section.items.map((subItem) => (
                                          <SidebarMenuSubItem key={subItem.title}>
                                            <SidebarMenuSubButton
                                              asChild
                                              isActive={isSubItemActive(subItem.url.split("?")[0] ?? subItem.url)}
                                              data-active={isSubItemActive(subItem.url.split("?")[0] ?? subItem.url) || undefined}
                                              className="font-normal"
                                            >
                                              <Link href={subItem.url}>
                                                <span>{subItem.title}</span>
                                              </Link>
                                            </SidebarMenuSubButton>
                                          </SidebarMenuSubItem>
                                        ))}
                                      </SidebarMenuSub>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </>
                        ) : item.items && item.items.length > 0 ? (
                          <>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton
                                tooltip={item.name}
                                isActive={active}
                                data-active={active || undefined}
                              >
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
                                      <SidebarMenuSubButton
                                        asChild
                                        isActive={isSubItemActive(subItem.url.split("?")[0] ?? subItem.url)}
                                        data-active={isSubItemActive(subItem.url.split("?")[0] ?? subItem.url) || undefined}
                                        className="font-normal"
                                      >
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
                        )}
                      </SidebarMenuItem>
                    </Collapsible>
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>
          </>
        )}

        {admin?.role === "ROLE_SUPER_ADMIN" && (
          <>
            <SidebarSeparator className="mx-2" />
            <SidebarGroup className="px-2 py-1">
              <SidebarGroupLabel className="flex items-center gap-1.5 px-2">
                <Shield className="size-3" />
                Administration
              </SidebarGroupLabel>
              <SidebarMenu className="gap-1">
                {SUPER_ADMIN_SIDEBAR_CONSTANTS.map((item) => {
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
                                isActive={active}
                                data-active={active || undefined}
                              >
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
                                      <SidebarMenuSubButton
                                        asChild
                                        isActive={isSubItemActive(subItem.url)}
                                        data-active={isSubItemActive(subItem.url) || undefined}
                                        className="font-normal"
                                      >
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
                        )}
                      </SidebarMenuItem>
                    </Collapsible>
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>
          </>
        )}

        {admin?.role === "ROLE_SUPER_ADMIN" && (
          <>
            <SidebarSeparator className="mx-2" />
            <SidebarGroup className="px-2 py-1">
              <SidebarGroupLabel className="flex items-center gap-1.5 px-2">
                <Zap className="size-3" />
                External Tools
              </SidebarGroupLabel>
              <SidebarMenu className="gap-1">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="n8n Workflow Automation">
                    <a href={N8N_URL} target="_blank" rel="noopener noreferrer">
                      <Zap className="size-4" />
                      <span>n8n Workflows</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Mailpit Email Inbox">
                    <a href={`/api/mailpit/redirect${admin?.role === "ROLE_SUPER_ADMIN" ? "?admin=true" : `?email=${encodeURIComponent(admin?.email ?? "")}`}`} target="_blank" rel="noopener noreferrer">
                      <Mail className="size-4" />
                      <span>Mailpit (Email Inbox)</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Stripe Dashboard">
                    <a href={STRIPE_URL} target="_blank" rel="noopener noreferrer">
                      <CreditCard className="size-4" />
                      <span>Stripe Dashboard</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarSeparator/>

      <SidebarFooter className="p-2">
        <div className="relative" ref={menuRef}>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="h-auto gap-3 rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/35 px-3 py-3 transition-all duration-200 hover:bg-sidebar-accent/60"
                onClick={() => setMenuOpen((prev) => !prev)}
                data-active={menuOpen || undefined}
              >
                <Avatar size="lg" className="rounded-full bg-sidebar-primary text-sidebar-primary-foreground after:border-sidebar-primary/20">
                  <AvatarFallback className="bg-transparent text-white">
                    {loading ? (
                      <span className="size-4 animate-pulse rounded-full bg-white/50" />
                    ) : (
                      <User className="size-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <span className="grid flex-1 text-left group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-sm font-medium">
                    {admin?.email?.split("@")[0] ?? "Admin account"}
                  </span>
                  <span className="mt-0.5 truncate text-xs text-sidebar-foreground/70">
                    {admin?.email ?? (displayRole || "Authenticated user")}
                  </span>
                </span>
                <ChevronsUpDown
                  className={`size-4 text-sidebar-foreground/60 transition-transform duration-200 group-data-[collapsible=icon]:hidden ${
                    menuOpen ? "rotate-180" : "rotate-0"
                  }`}
                />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <div
            className={`absolute bottom-0 left-full z-50 ml-3 w-72 origin-left rounded-2xl border bg-popover p-1.5 text-popover-foreground shadow-2xl group-data-[collapsible=icon]:hidden ${
              menuOpen
                ? "visible opacity-100"
                : "invisible opacity-0"
            }`}
          >
            <div className="flex items-center gap-3 rounded-xl px-3 py-3">
              <Avatar size="lg" className="bg-sidebar-primary text-sidebar-primary-foreground after:border-sidebar-primary/20">
                <AvatarFallback className="bg-transparent text-white">
                  {loading ? (
                    <span className="size-4 animate-pulse rounded-full bg-white/50" />
                  ) : (
                    <User className="size-5" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {admin?.email?.split("@")[0] ?? "Admin account"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {admin?.email ?? "admin@example.com"}
                </p>
              </div>
            </div>

            <div className="my-1 h-px bg-border" />

            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut className="size-4" />
              Log out
            </button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

export default AdminSidebar
