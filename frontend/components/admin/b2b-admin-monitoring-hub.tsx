"use client"

import { useEffect, useState } from "react"
import { 
  Building2, 
  ChevronRight, 
  Download, 
  FileText, 
  Globe, 
  LayoutDashboard, 
  Package, 
  TrendingUp, 
  Users 
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Company = {
  id: number
  email: string
  company_name: string
  status: string
  is_verified: boolean
  joined_at: string
  listings_count: number
  reports_count: number
}

type Market = {
  id: number
  email: string
  company_name: string
  status: string
  is_verified: boolean
  joined_at: string
  reports_count: number
}

type B2BReport = {
  id: number
  type: string
  status: string
  company_name?: string
  market_name?: string
  created_at: string
  file_url?: string
}

export default function B2BAdminMonitoringHub() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [markets, setMarkets] = useState<Market[]>([])
  const [reports, setReports] = useState<B2BReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [companiesRes, marketsRes, reportsRes] = await Promise.all([
          fetch("/api/b2b/admin/companies").then(r => r.json()),
          fetch("/api/b2b/admin/markets").then(r => r.json()),
          fetch("/api/b2b/admin/reports?limit=10").then(r => r.json())
        ])

        setCompanies(companiesRes.items || [])
        setMarkets(marketsRes.items || [])
        setReports(reportsRes.items || [])
      } catch (err) {
        console.error("Failed to fetch B2B monitoring data", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const stats = [
    { label: "Total Companies", value: companies.length, icon: Building2, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
    { label: "Market Owners", value: markets.length, icon: Globe, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
    { label: "Reports Generated", value: reports.length, icon: FileText, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
  ]

  return (
    <div className="space-y-8">
      {/* KPI Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex size-12 items-center justify-center rounded-2xl ${stat.bg}`}>
                <stat.icon className={`size-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Entity Management */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="companies" className="w-full">
            <div className="mb-4 flex items-center justify-between">
              <TabsList className="rounded-xl p-1 bg-muted/50 border border-border/50">
                <TabsTrigger value="companies" className="rounded-lg px-4">Companies</TabsTrigger>
                <TabsTrigger value="markets" className="rounded-lg px-4">Markets</TabsTrigger>
              </TabsList>
              <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                View All Partners <ChevronRight className="size-4" />
              </Button>
            </div>

            <TabsContent value="companies" className="m-0 border-none p-0">
              <Card className="border-border/50 shadow-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-semibold">Company Name</TableHead>
                      <TableHead className="font-semibold">Listings</TableHead>
                      <TableHead className="font-semibold">Reports</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="text-right font-semibold">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.slice(0, 10).map((c) => (
                      <TableRow key={c.id} className="transition-colors hover:bg-muted/10">
                        <TableCell>
                          <div className="font-medium">{c.company_name}</div>
                          <div className="text-xs text-muted-foreground">{c.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="gap-1 font-mono">{c.listings_count}</Badge>
                        </TableCell>
                        <TableCell>
                           <span className="text-xs font-medium">{c.reports_count} generated</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={c.is_verified ? "default" : "secondary"} className="text-[10px]">
                            {c.is_verified ? "VERIFIED" : "PENDING"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {new Date(c.joined_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="markets" className="m-0 border-none p-0">
              <Card className="border-border/50 shadow-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-semibold">Market Name</TableHead>
                      <TableHead className="font-semibold">Reports</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="text-right font-semibold">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                      <TableBody>
                        {markets.slice(0, 10).map((m) => (
                          <TableRow key={m.id} className="transition-colors hover:bg-muted/10">
                            <TableCell>
                              <div className="font-medium">{m.company_name}</div>
                              <div className="text-xs text-muted-foreground">{m.email}</div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-medium">{m.reports_count} generated</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={m.is_verified ? "default" : "secondary"} className="text-[10px]">
                                {m.is_verified ? "VERIFIED" : "PENDING"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {new Date(m.joined_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar Activity Monitoring */}
        <div className="space-y-8">
           {/* Generated PDF Reports */}
           <Card className="border-border/50 shadow-sm overflow-hidden">
             <CardHeader className="bg-muted/20 pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                   <FileText className="size-4 text-indigo-500" />
                   PDF Business Reports
                </CardTitle>
             </CardHeader>
             <CardContent className="p-0">
               <div className="divide-y divide-border/50">
                 {reports.slice(0, 5).map((rep) => (
                   <div key={rep.id} className="p-4 transition-colors hover:bg-muted/10">
                     <div className="flex items-start gap-3">
                       <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
                         <FileText className="size-4 text-indigo-600" />
                       </div>
                       <div className="min-w-0 flex-1">
                         <p className="text-xs font-semibold truncate">{rep.company_name || rep.market_name}</p>
                         <p className="text-[10px] text-muted-foreground mt-0.5">{rep.type} • {new Date(rep.created_at).toLocaleDateString()}</p>
                       </div>
                       {rep.file_url && (
                         <Button variant="ghost" size="icon" className="size-8 rounded-full" asChild>
                           <a href={rep.file_url} download><Download className="size-4" /></a>
                         </Button>
                       )}
                     </div>
                   </div>
                 ))}
                 {reports.length === 0 && <div className="p-8 text-center text-xs text-muted-foreground">No reports available.</div>}
               </div>
               <div className="p-3 bg-muted/10 border-t">
                 <Button variant="outline" className="w-full text-xs rounded-xl h-8">View All Reports Archive</Button>
               </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  )
}
