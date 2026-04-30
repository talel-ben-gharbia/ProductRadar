"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"
import { Building2 } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

function B2BNavbar() {
  const pathname = usePathname()

  const pageTitle = useMemo(() => {
    if (pathname === "/B2B/dashboard") {
      return "Dashboard"
    }

    const segment = pathname.split("/").filter(Boolean).at(-1) ?? "B2B"
    return segment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  }, [pathname])

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <Separator orientation="vertical" className="hidden h-5! sm:block" />
        <div className="hidden items-center gap-2 sm:flex">
          <Avatar size="default" className="bg-primary/10 text-primary after:border-primary/10">
            <AvatarFallback className="bg-transparent text-primary">
              <Building2 className="size-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold tracking-tight">{pageTitle}</p>
            <p className="text-xs text-muted-foreground">Product Radar B2B panel</p>
          </div>
        </div>
      </div>
    </header>
  )
}

export default B2BNavbar