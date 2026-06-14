"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Critical Root Error:", error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-svh flex-col items-center justify-center p-4">
          <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6">
            <h2 className="mb-2 text-xl font-bold text-red-900">Fatal Application Error</h2>
            <p className="mb-4 text-sm text-red-800">{error.message}</p>
            <Button onClick={() => reset()} variant="destructive">
              Try again
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}
