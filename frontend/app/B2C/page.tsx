"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { useApiUrl } from "@/lib/use-api-url"
import { useI18n } from "@/lib/i18n-context"
import { Button } from "@/components/ui/button"
import { BACKEND_URL } from "@/utils/admin/constants"

import type { B2BBannerCampaign } from "@/types/b2b"

type CustomerSession = {
  id: number
  email: string
  firebase_uid: string
  type: "customer" | "b2b_company" | "b2b_market"
}

export default function B2CDashboardPage() {
  const router = useRouter()
  const apiUrl = useApiUrl()
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<CustomerSession | null>(null)
  const [banners, setBanners] = useState<B2BBannerCampaign[]>([])

  useEffect(() => {
    let cancelled = false

    fetch("/api/b2c/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { customer: CustomerSession | null }) => {
        if (!cancelled) {
          setCustomer(data.customer)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCustomer(null)
          setLoading(false)
        }
      })

    fetch(apiUrl("/api/b2c/banners"), { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setBanners(data.items ?? [])
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  async function logout() {
    await fetch("/api/b2c/auth/logout", { method: "POST" })
    window.location.href = "/"
  }

  if (loading) {
    return <div className="p-10 text-sm text-muted-foreground">{t("b2c.loading_account")}</div>
  }

  if (!customer) {
    return (
      <div className="p-10">
        <h1 className="text-2xl font-semibold">{t("b2c.area_title")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("b2c.not_authenticated")}
        </p>
        <Button className="mt-6" onClick={() => router.push("/")}>{t("b2c.back_home")}</Button>
      </div>
    )
  }

  return (
    <div className="p-10">
      {banners.length > 0 && (
        <div className="mb-8 space-y-4">
          {banners.map((banner) => (
            <a
              key={banner.id}
              href={`${BACKEND_URL}/ads/redirect/banner/${banner.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-shadow bg-muted/10"
            >
              <img
                src={`${BACKEND_URL}${banner.image_url}`}
                alt={banner.company_name ?? t("b2c.sponsored_banner")}
                width={banner.width ?? undefined}
                height={banner.height ?? undefined}
                className="w-full h-auto"
              />
            </a>
          ))}
        </div>
      )}

      <h1 className="text-2xl font-semibold">{t("b2c.welcome_customer")} {customer.email}</h1>
      <p className="mt-2 text-muted-foreground">{t("b2c.email")}{customer.email}</p>
      <p className="text-muted-foreground">{t("b2c.type")}{customer.type}</p>
      <Button variant="outline" className="mt-6" onClick={logout}>
        {t("b2c.logout")}
      </Button>
    </div>
  )
}
