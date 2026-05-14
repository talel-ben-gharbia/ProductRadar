"use client"

import { Download, Filter, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export type ActiveFilter = { key: string; label: string; value: string }

export type ListingFiltersProps = {
  showFilters: boolean
  onToggleFilters: () => void
  hasActiveFilters: boolean
  activeFilters: ActiveFilter[]
  allCategories: string[]
  search: string
  onSearchChange: (value: string) => void
  onSearchClear: () => void
  categoryFilter: string
  onCategoryFilterChange: (value: string) => void
  brandFilter: string
  onBrandFilterChange: (value: string) => void
  stockFilter: string
  onStockFilterChange: (value: string) => void
  trustMinFilter: string
  trustMaxFilter: string
  onTrustMinChange: (value: string) => void
  onTrustMaxChange: (value: string) => void
  priceMinFilter: string
  priceMaxFilter: string
  onPriceMinChange: (value: string) => void
  onPriceMaxChange: (value: string) => void
  onClearAll: () => void
  onClearFilter: (key: string) => void
  onExport: () => void
}

export function ListingFilters(props: ListingFiltersProps) {
  const {
    showFilters, onToggleFilters, hasActiveFilters, activeFilters, allCategories,
    search, onSearchChange, onSearchClear,
    categoryFilter, onCategoryFilterChange,
    brandFilter, onBrandFilterChange,
    stockFilter, onStockFilterChange,
    trustMinFilter, trustMaxFilter, onTrustMinChange, onTrustMaxChange,
    priceMinFilter, priceMaxFilter, onPriceMinChange, onPriceMaxChange,
    onClearAll, onClearFilter, onExport,
  } = props

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Listings</h1>
          <p className="text-sm text-muted-foreground">All product listings linked to your seller account.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onToggleFilters} className="relative gap-1.5">
            <Filter className="size-3.5" />
            Filters
            {hasActiveFilters && (
              <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {activeFilters.length}
              </span>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={onExport} className="gap-1.5">
            <Download className="size-3.5" />
            Export
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">Filters</CardTitle>
              <CardDescription className="text-xs">Refine your product listings</CardDescription>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground" onClick={onClearAll}>
                <X className="size-3" />
                Clear all
              </Button>
            )}
          </CardHeader>
          <CardContent className="grid gap-4 p-4 pt-0 sm:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Category</label>
              <select value={categoryFilter} onChange={(e) => onCategoryFilterChange(e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">All Categories</option>
                {allCategories.map((cat, idx) => <option key={idx} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Brand</label>
              <Input placeholder="e.g. Samsung" value={brandFilter} onChange={(e) => onBrandFilterChange(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Stock Status</label>
              <select value={stockFilter} onChange={(e) => onStockFilterChange(e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">All</option>
                <option value="true">In Stock</option>
                <option value="false">Out of Stock</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Trust Score</label>
                <div className="flex items-center gap-1.5">
                  <Input type="number" min={0} max={100} placeholder="0" value={trustMinFilter} onChange={(e) => onTrustMinChange(e.target.value)} className="h-9" />
                  <span className="text-xs text-muted-foreground">–</span>
                  <Input type="number" min={0} max={100} placeholder="100" value={trustMaxFilter} onChange={(e) => onTrustMaxChange(e.target.value)} className="h-9" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Price Range</label>
                <div className="flex items-center gap-1.5">
                  <Input type="number" min={0} placeholder="0" value={priceMinFilter} onChange={(e) => onPriceMinChange(e.target.value)} className="h-9" />
                  <span className="text-xs text-muted-foreground">–</span>
                  <Input type="number" min={0} placeholder="999" value={priceMaxFilter} onChange={(e) => onPriceMaxChange(e.target.value)} className="h-9" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by product name or reference..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-10 pl-10 pr-9"
        />
        {search && (
          <button
            type="button"
            onClick={onSearchClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Active filters:</span>
          {activeFilters.map((f) => (
            <span
              key={f.key}
              className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs font-medium"
            >
              {f.label}: {f.value}
              <button
                type="button"
                onClick={() => onClearFilter(f.key)}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-muted-foreground/20"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </>
  )
}
