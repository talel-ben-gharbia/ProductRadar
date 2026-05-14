import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function B2BErrorState({
  message = "Something went wrong",
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/30 ring-1 ring-red-200 dark:ring-red-900/50">
        <AlertTriangle className="size-6 text-red-500" />
      </div>
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{message}</p>
      <p className="mt-1 text-xs text-muted-foreground">Please try again or contact support if the issue persists.</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-4 gap-1.5 text-xs">
          <RefreshCw className="size-3.5" /> Try Again
        </Button>
      )}
    </div>
  )
}
