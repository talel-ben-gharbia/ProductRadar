import { Spinner } from "@/components/ui/spinner"

export default function FavoritesRedirectLoading() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Spinner className="size-5" />
        <span>Redirecting...</span>
      </div>
    </div>
  )
}
