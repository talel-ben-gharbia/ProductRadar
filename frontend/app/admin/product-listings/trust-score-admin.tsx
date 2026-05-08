"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

type TrustScoreStatus = {
  status?: string
  mode?: string
  updated?: number
  error?: string
} | null

type WeightItem = {
  id: number
  weight_key: string
  weight_label: string
  weight_value: string
  weight_group: string
  sort_order: number
}

type WeightDraft = {
  id: number
  weight_label: string
  weight_value: number
  weight_group: string
  sort_order: number
}

type HistoryItem = {
  id: number
  listing_id: number
  score: number | string
  created_at: string
  product_id: number | null
  product_name: string | null
}

const WEIGHTS_URL = "/api/admin/b2b-workflows/trust-score/weights"
const HISTORY_URL = "/api/admin/b2b-workflows/trust-score/history"

function WeightSlider({
  draft,
  onChange,
}: {
  draft: WeightDraft
  onChange: (id: number, value: number) => void
}) {
  const displayValue = draft.weight_value.toFixed(4)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{draft.weight_label}</label>
        <span className="text-xs tabular-nums text-muted-foreground">{displayValue}</span>
      </div>
      <Slider
        value={[draft.weight_value]}
        min={0}
        max={1}
        step={0.0001}
        onValueChange={([v]) => onChange(draft.id, v)}
      />
    </div>
  )
}

export default function TrustScoreAdmin() {
  const [status, setStatus] = useState<TrustScoreStatus>(null)
  const [loading, setLoading] = useState(false)

  const [weights, setWeights] = useState<WeightDraft[]>([])
  const [weightsLoading, setWeightsLoading] = useState(false)
  const [weightsSaving, setWeightsSaving] = useState(false)
  const [weightsError, setWeightsError] = useState("")
  const [weightsSuccess, setWeightsSuccess] = useState("")

  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const recalculate = async (full: boolean) => {
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch(
        `/api/admin/b2b-workflows/trust-score/recalculate?full=${full}`,
        { method: "POST" },
      )
      const data = await res.json()
      setStatus(data)
    } catch {
      setStatus({ error: "Failed to connect to backend", status: "error" })
    }
    setLoading(false)
  }

  const fetchWeights = useCallback(async () => {
    setWeightsLoading(true)
    setWeightsError("")
    try {
      const res = await fetch(WEIGHTS_URL)
      const data = await res.json()
      if (data.items) {
        setWeights(
          data.items.map((w: WeightItem) => ({
            id: w.id,
            weight_label: w.weight_label,
            weight_value: parseFloat(w.weight_value),
            weight_group: w.weight_group,
            sort_order: w.sort_order,
          })),
        )
      }
    } catch {
      setWeightsError("Failed to load weight configuration")
    }
    setWeightsLoading(false)
  }, [])

  const saveWeights = async () => {
    setWeightsSaving(true)
    setWeightsError("")
    setWeightsSuccess("")
    try {
      const res = await fetch(WEIGHTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weights: weights.map((w) => ({ id: w.id, weight_value: w.weight_value })),
        }),
      })
      const data = await res.json()
      if (data.error) {
        setWeightsError(data.error)
      } else {
        setWeightsSuccess("Weights saved successfully")
        setTimeout(() => setWeightsSuccess(""), 3000)
      }
    } catch {
      setWeightsError("Failed to save weights")
    }
    setWeightsSaving(false)
  }

  const handleWeightChange = (id: number, value: number) => {
    setWeights((prev) => prev.map((w) => (w.id === id ? { ...w, weight_value: value } : w)))
  }

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch(`${HISTORY_URL}?limit=50`)
      const data = await res.json()
      if (data.items) {
        setHistory(data.items)
      }
    } catch {
      /* silent */
    }
    setHistoryLoading(false)
  }, [])

  const groups = weights.reduce<Record<string, WeightDraft[]>>((acc, w) => {
    if (!acc[w.weight_group]) acc[w.weight_group] = []
    acc[w.weight_group].push(w)
    return acc
  }, {})

  return (
    <Card>
      <CardContent className="p-4">
        <Tabs defaultValue="recalculate" onValueChange={(v) => { if (v === "weights") fetchWeights(); if (v === "history") fetchHistory() }}>
          <TabsList className="mb-4">
            <TabsTrigger value="recalculate">Recalculate</TabsTrigger>
            <TabsTrigger value="weights">Weights</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="recalculate">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Trust Score Engine</p>
                <p className="text-xs text-muted-foreground">
                  Automatically calculated on listing create/update.
                  {status && !status.error
                    ? ` Last run: ${status.mode} (${status.updated} listings updated)`
                    : status?.error
                      ? ` Error: ${status.error}`
                      : " Use manual triggers for backfill or full refresh."}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() => recalculate(false)}
                  className="gap-1.5 text-xs"
                >
                  <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
                  Incremental
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  disabled={loading}
                  onClick={() => recalculate(true)}
                  className="gap-1.5 text-xs"
                >
                  <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
                  Full Recalculate
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="weights">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Score Weights</p>
                <Button
                  variant="default"
                  size="sm"
                  disabled={weightsSaving || weights.length === 0}
                  onClick={saveWeights}
                  className="gap-1.5 text-xs"
                >
                  <Save className="size-3.5" />
                  {weightsSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>

              {weightsError && (
                <p className="text-xs text-destructive">{weightsError}</p>
              )}
              {weightsSuccess && (
                <p className="text-xs text-emerald-600">{weightsSuccess}</p>
              )}

              {weightsLoading ? (
                <p className="text-sm text-muted-foreground">Loading weights...</p>
              ) : weights.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No weights configured or failed to load.
                </p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groups).map(([group, items]) => (
                    <div key={group}>
                      <Badge variant="outline" className="mb-3 text-xs uppercase tracking-wide">
                        {group}
                      </Badge>
                      <div className="space-y-3">
                        {items
                          .sort((a, b) => a.sort_order - b.sort_order)
                          .map((w) => (
                            <WeightSlider
                              key={w.id}
                              draft={w}
                              onChange={handleWeightChange}
                            />
                          ))}
                      </div>
                      <Separator className="mt-4" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div>
              <p className="text-sm font-medium mb-3">Recent Trust Score Calculations</p>
              {historyLoading ? (
                <p className="text-sm text-muted-foreground">Loading history...</p>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history entries found.</p>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-1.5 pr-3 font-medium">Product</th>
                        <th className="pb-1.5 pr-3 font-medium">Score</th>
                        <th className="pb-1.5 font-medium">Calculated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h) => (
                        <tr key={h.id} className="border-b last:border-0">
                          <td className="py-1.5 pr-3 truncate max-w-48">
                            {h.product_name ?? `Listing #${h.listing_id}`}
                          </td>
                          <td className="py-1.5 pr-3 tabular-nums">
                            {typeof h.score === "number" ? h.score.toFixed(2) : h.score}
                          </td>
                          <td className="py-1.5 tabular-nums text-muted-foreground">
                            {new Date(h.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
