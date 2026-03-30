import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getRawCategories } from "@/services/admin/categories"

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
type RootCategory = {
  id: number
  name: string
  under: Array<{
    id: number
    name: string
    children: string[]
  }>
}

function buildRootCategories(
  rows: Array<{ id: number; name: string; parentId: number | null }>
): RootCategory[] {
  const byParent = new Map<
    number | null,
    Array<{ id: number; name: string; parentId: number | null }>
  >()

  for (const row of rows) {
    const parentRows = byParent.get(row.parentId) ?? []
    parentRows.push(row)
    byParent.set(row.parentId, parentRows)
  }

  const roots = byParent.get(null) ?? []

  return roots
    .map((root) => {
      const under = (byParent.get(root.id) ?? [])
        .map((item) => {
          const children = (byParent.get(item.id) ?? [])
            .map((child) => child.name)
            .sort((a, b) => a.localeCompare(b))

          return {
            id: item.id,
            name: item.name,
            children,
          }
        })
        .sort((a, b) => b.children.length - a.children.length)

      return {
        id: root.id,
        name: root.name,
        under,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export default async function Page() {
  let rootCategories: RootCategory[] = []

  try {
    const categories = await getRawCategories()
    rootCategories = buildRootCategories(categories)
  } catch {
    rootCategories = []
  }

  return (
    <div className="min-h-svh">
      <style>{`
        @keyframes scroll-right-to-left {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        .scroll-text {
          animation: scroll-right-to-left 15s linear infinite;
          white-space: nowrap;
        }
      `}</style>
      
      <div className="overflow-hidden bg-muted py-2 px-6">
        <p className="scroll-text text-sm text-muted-foreground">
          Discover the latest product trends and market insights in real-time • Track price movements and competitor strategies • Make data-driven decisions with our comprehensive product intelligence platform
        </p>
      </div>
      
      <nav className="border-b">
        <div className="mx-auto flex max-w-8xl items-center justify-between px-6 py-4 sm:px-10">
          <h1 className="text-2xl font-bold tracking-tight">Products radar</h1>
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/B2B">Become a Partner</Link>
            </Button>
          </div>
        </div>
      </nav>

      <section className="border-b bg-background">
        <div className="w-full px-4 py-2 sm:px-10">
          {rootCategories.length > 0 ? (
            <NavigationMenu viewport={false} className="w-full max-w-none justify-start">
              <NavigationMenuList className="w-full justify-start gap-2">
                {rootCategories.map((category) => (
                  <NavigationMenuItem key={category.id} className="static">
                    <NavigationMenuTrigger className="h-10 rounded-xl px-4 text-sm font-medium">
                      {category.name}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent className="absolute left-0 top-full mt-2 w-screen md max-w-[1200px] rounded-xl border p-6 shadow-lg z-50">
                      
                      {category.under.length > 0 ? (
                        <div className="grid w-full grid-cols-1 gap-4 pr-1 md:grid-cols-2 lg:grid-cols-4">
                          {category.under.map((item) => (
                            <div
                              key={`${category.id}-${item.id}`}
                              className=""
                            >

                              <p className="border-b pb-1 text-sm font-semibold text-foreground">
                                {item.name}
                              </p>
                              {item.children.length > 0 ? (
                                <ul className="mt-2 space-y-1">
                                  {item.children.map((child) => (
                                    <li
                                      key={`${category.id}-${item.id}-${child}`}
                                      className="text-sm leading-6 text-muted-foreground"
                                    >
                                      {child}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-2 text-sm text-muted-foreground">
                                  No child categories
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No under categories</p>
                      )}
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          ) : (
            <p className="px-2 py-1 text-sm text-muted-foreground">No categories available</p>
          )}
        </div>
      </section>
    </div>
  )
}
