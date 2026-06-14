"use client"

import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function RefreshButton() {
  const router = useRouter()

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => router.refresh()}
    >
      <RefreshCw className="mr-1 h-3.5 w-3.5" />
      Refresh
    </Button>
  )
}
