import { BACKEND_URL } from "@/utils/admin/constants"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type CheckResult = {
  name: string
  endpoint: string
  status: "Healthy" | "Unhealthy"
  code: number | null
  latencyMs: number | null
}

async function checkEndpoint(name: string, endpoint: string): Promise<CheckResult> {
  const startedAt = Date.now()

  try {
    const response = await fetch(endpoint, { cache: "no-store" })
    const latencyMs = Date.now() - startedAt

    return {
      name,
      endpoint,
      status: response.ok ? "Healthy" : "Unhealthy",
      code: response.status,
      latencyMs,
    }
  } catch {
    return {
      name,
      endpoint,
      status: "Unhealthy",
      code: null,
      latencyMs: null,
    }
  }
}

export default async function SystemHealthPage() {
  const checks = await Promise.all([
    checkEndpoint("Products API", `${BACKEND_URL}/products`),
    checkEndpoint("Categories API", `${BACKEND_URL}/categories`),
    checkEndpoint("Listings API", `${BACKEND_URL}/product-listings`),
  ])

  const healthyCount = checks.filter((c) => c.status === "Healthy").length

  return (
    <section className="w-full max-w-none space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">System Health</h1>
        <p className="text-sm text-muted-foreground">
          Endpoint status checks for core backend services.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm font-medium">Overall status</p>
        <p className="mt-2 text-3xl font-bold">
          {healthyCount}/{checks.length} Healthy
        </p>
      </div>

      <div className="w-full rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Latency</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {checks.map((check) => (
              <TableRow key={check.name}>
                <TableCell className="font-medium">{check.name}</TableCell>
                <TableCell
                  className={check.status === "Healthy" ? "text-emerald-600" : "text-destructive"}
                >
                  {check.status}
                </TableCell>
                <TableCell>{check.code ?? "-"}</TableCell>
                <TableCell>{check.latencyMs !== null ? `${check.latencyMs} ms` : "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
