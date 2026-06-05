"use client"

import { useI18n } from "@/lib/i18n-context"

export function useApiUrl() {
  const { locale } = useI18n()

  return (path: string) => {
    const [base, qs] = path.split("?")
    const params = new URLSearchParams(qs || "")
    params.set("lang", locale)
    const q = params.toString()
    return q ? `${base}?${q}` : base
  }
}
