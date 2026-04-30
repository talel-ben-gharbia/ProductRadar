import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

import B2BSidebar from "@/components/B2B/b2b-sidebar"

export default function B2BDashboardPage() {
  return (
    <SidebarProvider defaultOpen>
      <B2BSidebar />
      <SidebarInset>
        <main className="min-h-svh bg-[#eef2f7] px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl space-y-6">
            <Button asChild variant="outline" className="h-10 rounded-full px-5">
              <Link href="/">Back to homepage</Link>
            </Button>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="space-y-2">
                <CardTitle className="text-2xl">B2B Dashboard</CardTitle>
                <CardDescription>
                  ...
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-dashed bg-white px-4 py-10 text-sm text-muted-foreground">
                  Dashboard.
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
