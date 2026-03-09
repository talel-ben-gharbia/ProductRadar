import { Spinner } from "@/components/ui/spinner"

export default function ProductsLoading() {
  return (
    <section className="w-full max-w-none space-y-4">
      <h1 className="text-2xl font-bold">Products</h1>
      <div className="flex min-h-40 items-center justify-center rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Spinner className="size-5" />
          <span>Loading products...</span>
        </div>
      </div>
    </section>
  )
}
