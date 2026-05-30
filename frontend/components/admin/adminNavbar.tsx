"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"
import { Radar } from "lucide-react"

import { Avatar, AvatarFallback } from "../ui/avatar"
import { SidebarTrigger } from "../ui/sidebar"
import { Separator } from "../ui/separator"
import { LanguageSelector } from "@/components/B2C/language-selector"

function AdminNavbar() {
  const pathname = usePathname()
  const pageTitle = useMemo(() => {
    if (pathname === "/admin") return "Dashboard"

    const segment = pathname.split("/").filter(Boolean).at(-1) ?? "admin"
    return segment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  }, [pathname])

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <Separator orientation="vertical" className="hidden h-5! sm:block" />
        <div className="hidden items-center gap-2 sm:flex">
          <Avatar size="default" className="bg-primary/10 text-primary after:border-primary/10">
            <AvatarFallback className="bg-transparent text-primary">
              <Radar className="size-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold tracking-tight">{pageTitle}</p>
            <p className="text-xs text-muted-foreground">Product Radar admin panel</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <LanguageSelector />
      </div>
    </header>
  )
}

export default AdminNavbar
