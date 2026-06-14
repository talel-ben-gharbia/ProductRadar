"use client" // Error components must be Client Components

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global Error Caught by Boundary:", error)
  }, [error])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-lg">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <AlertCircle className="h-6 w-6 text-red-600" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-slate-900">Something went wrong!</h2>
        <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">{error.name}: {error.message}</p>
          {error.stack && (
            <pre className="mt-2 max-h-40 w-full overflow-auto text-[10px]">
              {error.stack}
            </pre>
          )}
        </div>
        <div className="flex gap-3">
          <Button onClick={() => reset()} className="w-full">
            Try again
          </Button>
          <Button onClick={() => window.location.href = '/'} variant="outline" className="w-full">
            Go Home
          </Button>
        </div>
      </div>
    </div>
  )
}
