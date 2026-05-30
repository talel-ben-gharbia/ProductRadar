"use client"

import Link from "next/link"

import { useI18n } from "@/lib/i18n-context"
import { translateCategoryName } from "@/lib/category-translations"
import { Separator } from "@/components/ui/separator"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"

type CategoryChild = {
  id: number
  name: string
  allCategoryIds: number[]
}

type CategoryItem = {
  id: number
  name: string
  allCategoryIds: number[]
  children: CategoryChild[]
}

type CategoryRoot = {
  id: number
  name: string
  under: CategoryItem[]
}

export function CategoryNavDropdown({ categories }: { categories: CategoryRoot[] }) {
  const { locale, t } = useI18n()

  if (categories.length === 0) {
    return <p className="px-2 py-1 text-sm text-muted-foreground">{t("category.no_categories")}</p>
  }

  return (
    <NavigationMenu viewport={false} className="w-full max-w-none justify-start">
      <NavigationMenuList className="w-full justify-start gap-1">
        {categories.map((category) => (
          <NavigationMenuItem key={category.id} className="static">
            <NavigationMenuTrigger className="h-9 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-slate-100">
              {translateCategoryName(locale, category.name)}
            </NavigationMenuTrigger>
            <NavigationMenuContent className="absolute left-0 top-full z-50 mt-1 w-screen max-w-[75rem] rounded-xl border bg-white p-6 shadow-lg">
              {category.under.length > 0 ? (
                <div className="grid w-full grid-cols-1 gap-x-8 gap-y-6 pr-1 md:grid-cols-2 lg:grid-cols-4">
                  {category.under.map((item) => (
                    <div key={`${category.id}-${item.id}`} className="space-y-2">
                      <Link
                        href={`/B2C/products?categoryIds=${encodeURIComponent(item.allCategoryIds.join(","))}&categoryName=${encodeURIComponent(item.name)}`}
                        className="block text-sm font-semibold text-foreground transition-colors hover:text-orange-600"
                      >
                        {translateCategoryName(locale, item.name)}
                      </Link>
                      {item.children.length > 0 ? (
                        <>
                          <Separator />
                          <ul className="mt-2 space-y-1">
                            {item.children.map((child) => (
                              <li key={`${category.id}-${item.id}-${child.id}`} className="text-sm leading-6">
                                <Link
                                  href={`/B2C/products?categoryIds=${encodeURIComponent(child.allCategoryIds.join(","))}&categoryName=${encodeURIComponent(child.name)}`}
                                  className="text-muted-foreground transition-colors hover:text-orange-600"
                                >
                                  {translateCategoryName(locale, child.name)}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">{t("category.no_under_categories")}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("category.no_under_categories")}</p>
              )}
            </NavigationMenuContent>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  )
}
