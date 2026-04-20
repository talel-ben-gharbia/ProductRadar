"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { B2CNavbar } from "@/components/B2C/b2c-navbar"
import { cn } from "@/lib/utils"

const navigationItems = [
  {
    href: "/B2C/profile/informations",
    label: "Informations",
    description: "Update your account details",
  },
  {
    href: "/B2C/profile/alerts",
    label: "Alerts",
    description: "Manage active notifications",
  },
  {
    href: "/B2C/profile/favorites",
    label: "Favorites",
    description: "Review saved listings",
  },
  {
    href: "/B2C/profile/plans",
    label: "Plans",
    description: "Upgrade your subscription",
  },
]

export function ProfileShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-svh bg-muted/30">
      <B2CNavbar
        title="My profile"
        backHref="/B2C/products"
        backLabel="Back"
      />

      <main className="mx-auto flex w-full max-w-8xl flex-col gap-6 px-4 py-6 sm:px-10 lg:flex-row">
        <aside className="w-full lg:w-72 lg:shrink-0">
          <div className="sticky top-6 rounded-2xl border bg-background p-4 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Account
            </p>

            <nav className="mt-4 grid gap-2">
              {navigationItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-xl border px-3 py-3 transition-colors hover:bg-muted/40",
                      active && "border-primary bg-primary/5"
                    )}
                  >
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </Link>
                )
              })}
            </nav>
          </div>
        </aside>

        <section className="min-w-0 flex-1">{children}</section>
      </main>
    </div>
  )
}