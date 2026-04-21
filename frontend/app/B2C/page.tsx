"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"

type CustomerSession = {
  id: number
  email: string
  firebase_uid: string
  type: "customer" | "b2b_company" | "b2b_market"
}

export default function B2CDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<CustomerSession | null>(null)

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

    return () => {
      cancelled = true
    }
  }, [])

  async function logout() {
    await fetch("/api/b2c/auth/logout", { method: "POST" })
    router.push("/")
    router.refresh()
  }

  if (loading) {
    return <div className="p-10 text-sm text-muted-foreground">Loading account...</div>
  }

  if (!customer) {
    return (
      <div className="p-10">
        <h1 className="text-2xl font-semibold">B2C Area</h1>
        <p className="mt-2 text-muted-foreground">
          You are not authenticated. Go back to the landing page and sign in with Google.
        </p>
        <Button className="mt-6" onClick={() => router.push("/")}>Back to home</Button>
      </div>
    )
  }

  return (
    <div className="p-10">
      <h1 className="text-2xl font-semibold">Welcome, customer</h1>
      <p className="mt-2 text-muted-foreground">Email: {customer.email}</p>
      <p className="text-muted-foreground">Type: {customer.type}</p>
      <Button variant="outline" className="mt-6" onClick={logout}>
        Logout
      </Button>
    </div>
  )
}
