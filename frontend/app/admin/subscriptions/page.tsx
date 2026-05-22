"use client"

import { useState } from "react"
import { Building2, Users } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import SubscriptionsPanel from "@/components/admin/subscriptions-panel"

export default function SubscriptionsPage() {
  const [tab, setTab] = useState("all")

  return (
    <section className="w-full max-w-none space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <p className="text-sm text-muted-foreground">
          Monitor all subscriptions across B2C customers and B2B companies.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <Users className="size-4" />
            All
          </TabsTrigger>
          <TabsTrigger value="b2c" className="gap-2">
            <Users className="size-4" />
            B2C Customers
          </TabsTrigger>
          <TabsTrigger value="b2b" className="gap-2">
            <Building2 className="size-4" />
            B2B Companies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <SubscriptionsPanel />
        </TabsContent>

        <TabsContent value="b2c" className="mt-6">
          <SubscriptionsPanel accountType="B2C" />
        </TabsContent>

        <TabsContent value="b2b" className="mt-6">
          <SubscriptionsPanel accountType="B2B" />
        </TabsContent>
      </Tabs>
    </section>
  )
}
