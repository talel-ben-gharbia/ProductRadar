"use client"

import Link from "next/link"
import { BellRing, Heart } from "lucide-react"

import { B2CNavAuth } from "@/components/B2C/b2c-nav-auth"
import { Button } from "@/components/ui/button"

type B2CNavbarProps = {
  title: string
  backHref?: string
  backLabel?: string
}

export function B2CNavbar({
  title,
  backHref,
  backLabel = "Back",
}: B2CNavbarProps) {
  return (
    <nav className="border-b bg-background">
      <div className="mx-auto flex max-w-8xl items-center justify-between px-6 py-4 sm:px-10">
        <div className="flex items-center gap-3">
          {backHref ? (
            <Button asChild size="sm" variant="ghost" className="h-9 rounded-full px-4">
              <Link href={backHref}>{backLabel}</Link>
            </Button>
          ) : null}
          <h1 className="text-2xl font-bold tracking-tight">
            <Link href="/" className="hover:text-primary transition-colors">
              {title}
            </Link>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="h-9 rounded-full px-4">
            <Link href="/B2C/profile/favorites" className="inline-flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span>Favorites</span>
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm" className="h-9 rounded-full px-4">
            <Link href="/B2C/profile/alerts" className="inline-flex items-center gap-2">
              <BellRing className="h-4 w-4" />
              <span>My alerts</span>
            </Link>
          </Button>
          <B2CNavAuth />
          <Button asChild className="h-9 rounded-full px-4">
            <Link href="/B2B">Become a Partner</Link>
          </Button>
        </div>
      </div>
    </nav>
  )
}
