import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function LoadingProductsPage() {
  return (
    <div className="min-h-svh bg-muted/30">
      <div className="border-b bg-background">
        <div className="mx-auto flex max-w-8xl items-center justify-between px-6 py-4 sm:px-10">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>

      <main className="mx-auto w-full max-w-8xl px-4 py-6 sm:px-10">
        <Skeleton className="mb-5 h-12 w-full rounded-2xl" />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[300px_1fr]">
          <aside className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <Skeleton className="h-7 w-24" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-10 w-full rounded-2xl" />
                <Skeleton className="h-10 w-full rounded-2xl" />
                <Skeleton className="h-8 w-full rounded-full" />
                <Skeleton className="h-8 w-3/4 rounded-full" />
                <Skeleton className="h-px w-full" />
                <Skeleton className="h-9 w-full rounded-xl" />
                <Skeleton className="h-9 w-full rounded-xl" />
                <Skeleton className="h-px w-full" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-8 w-full rounded-full" />
                <Skeleton className="h-8 w-full rounded-full" />
                <Skeleton className="h-8 w-2/3 rounded-full" />
              </CardContent>
            </Card>
          </aside>

          <section className="space-y-4">
            <Card className="border-border/70">
              <CardContent className="flex items-center justify-between py-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-9 w-96" />
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardContent className="flex items-center justify-between py-3">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-9 w-52" />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Card key={index} className="overflow-hidden rounded-2xl border-border/70 bg-background shadow-sm">
                  <Skeleton className="m-3 h-62.5 rounded-3xl" />
                  <CardHeader className="space-y-2 px-4 pb-2 pt-4">
                    <Skeleton className="h-5 w-11/12" />
                    <Skeleton className="h-5 w-7/12" />
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0">
                    <Skeleton className="h-10 w-full rounded-2xl" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
