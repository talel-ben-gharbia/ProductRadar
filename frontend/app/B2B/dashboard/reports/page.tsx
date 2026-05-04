"use client"

import { useCallback, useEffect, useState } from "react"
import { Download, FileText, Plus } from "lucide-react"

import { useB2B } from "@/components/B2B/b2b-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Report = { id?: number; owner_type?: string; report_type?: string; status?: string; file_path?: string; period_start?: string; period_end?: string; generated_at?: string; created_at?: string }

export default function ReportsPage() {
  const { mode, isGold } = useB2B()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [reportType, setReportType] = useState("COMPETITOR_PRICING")
  const [submitting, setSubmitting] = useState(false)

  const vendorTypes = ["COMPETITOR_PRICING", "STOCK_AVAILABILITY", "TRUST_SCORE_RANKING"]
  const marketTypes = ["MARKET_BAROMETER", "SHARE_OF_SHELF", "DISPERSION", "STOCK_OUT", "SENTIMENT"]
  const reportTypes = mode === "market" ? marketTypes : vendorTypes

  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=reports`)
      if (res.ok) {
        const data = await res.json()
        setReports(data.items ?? [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchReports() }, [fetchReports])

  const generateReport = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/b2b/workspace?endpoint=reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType }),
      })
      if (res.ok) {
        setShowForm(false)
        fetchReports()
      }
    } catch { /* ignore */ }
    setSubmitting(false)
  }

  const downloadReport = (report: Report) => {
    // In a real app, this would be a URL to a PDF/CSV. 
    // Here we simulate by creating a CSV of the current dashboard metrics.
    const csvContent = "data:text/csv;charset=utf-8,Report Type,Status,Generated At\n" 
      + `${report.report_type},${report.status},${report.generated_at}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `report-${report.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const statusColor = (s?: string): string => {
    switch (s?.toUpperCase()) {
      case "GENERATED": case "COMPLETED": return "bg-emerald-100 text-emerald-700"
      case "PENDING": case "PROCESSING": return "bg-amber-100 text-amber-700"
      case "FAILED": return "bg-red-100 text-red-700"
      default: return "bg-slate-100 text-slate-700"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Generate and download business intelligence reports.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5">
          <Plus className="size-3.5" />
          New Report
        </Button>
      </div>

      {showForm && (
        <Card className="border-border/50 border-l-4 border-l-indigo-500">
          <CardHeader>
            <CardTitle className="text-lg">Generate New Report</CardTitle>
            <CardDescription>Select a report type and generate a new report.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-1.5 text-sm">Report Type</Label>
              <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                {reportTypes.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button onClick={generateReport} disabled={submitting} size="sm">
                {submitting ? "Generating..." : "Generate Report"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Report Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Generated</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-muted" /></td>)}</tr>
                  ))
                ) : reports.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-16 text-center">
                    <FileText className="mx-auto mb-3 size-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No reports generated yet</p>
                  </td></tr>
                ) : (
                  reports.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{(r.report_type ?? "-").replace(/_/g, " ")}</td>
                      <td className="px-4 py-3"><Badge className={`text-[10px] ${statusColor(r.status)}`}>{r.status ?? "-"}</Badge></td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{r.generated_at ? new Date(r.generated_at).toLocaleString() : "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{r.created_at ? new Date(r.created_at).toLocaleString() : "-"}</td>
                      <td className="px-4 py-3 text-right">
                        {r.file_path && r.status?.toUpperCase() === "GENERATED" ? (
                          <Button variant="ghost" size="sm" onClick={() => downloadReport(r)} className="gap-1 text-xs"><Download className="size-3" />Download</Button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
