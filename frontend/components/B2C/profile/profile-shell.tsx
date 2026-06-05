"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { B2CNavbar } from "@/components/B2C/b2c-navbar"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n-context"

const navigationItems = [
  {
    href: "/B2C/profile/informations",
    key: "profile.shell_informations",
    descKey: "profile.shell_info_desc",
  },
  {
    href: "/B2C/profile/alerts",
    key: "profile.shell_alerts",
    descKey: "profile.shell_alerts_desc",
  },
  {
    href: "/B2C/profile/favorites",
    key: "profile.shell_favorites",
    descKey: "profile.shell_favorites_desc",
  },
  {
    href: "/B2C/profile/plans",
    key: "profile.shell_plans",
    descKey: "profile.shell_plans_desc",
  },
]

export function ProfileShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { t } = useI18n()

  return (
    <div className="min-h-svh bg-muted/30">
      <B2CNavbar
        title={t("profile.shell_title")}
        backHref="/B2C/products"
        backLabel={t("profile.shell_back")}
      />

      <main className="mx-auto flex w-full max-w-8xl flex-col gap-6 px-4 py-6 sm:px-10 lg:flex-row">
        <aside className="w-full lg:w-72 lg:shrink-0">
          <div className="sticky top-6 rounded-2xl border bg-background p-4 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("profile.shell_account")}
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
                    <p className="font-medium text-foreground">{t(item.key)}</p>
                    <p className="text-sm text-muted-foreground">{t(item.descKey)}</p>
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