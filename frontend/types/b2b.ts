export type B2BListing = {
  id: number
  ref: string | null
  productId: number | null
  productName: string | null
  productBrand: string | null
  categoryName: string | null
  price: number | null
  old_price: number | null
  availability: boolean | null
  trust_score: number | null
  trust_score_breakdown: Record<string, unknown> | null
  vendor_rank: number | null
  total_sellers: number | null
  product_url: string | null
  is_vendor: boolean
  is_active: boolean | null
  seller_id: number | null
  seller_name: string | null
  sellerId: number | null
  sellerName: string | null
  created_at: string | null
  updated_at: string | null
}

export type B2BPaginationInfo = {
  limit: number
  offset: number
  total: number
}

export type B2BListingEntry = {
  listing_id: number
  seller_id: number
  seller_name: string
  price: number | null
  old_price: number | null
  availability: boolean | null
  trust_score: number | null
  trust_score_breakdown: Record<string, unknown> | null
  product_url: string | null
  is_vendor: boolean
  updated_at: string | null
}

export type B2BComparisonData = {
  product: { id: number; name: string; brand: string | null; image: string | null }
  vendor_listing: B2BListingEntry | null
  competitors: B2BListingEntry[]
  price_history: Record<string, Array<{ price: number; recorded_at: string }>>
  stats: {
    total_sellers: number
    cheapest_price: number | null
    highest_price: number | null
    vendor_rank: number | null
  }
}

export type B2BWatchlistItem = {
  id: number
  product_id: number | null
  product_name: string
  product_image: string | null
  product_brand: string | null
  followed_at: string | null
  cheapest_price: number | null
  highest_price: number | null
  total_sellers: number
  baseline_price: number | null
  price_delta: number | null
}

export type B2BAdsRequest = {
  id?: number
  owner_type?: string
  request_type?: string
  target_type?: string
  target_url?: string
  status?: string
  duration_days?: number
  budget_proposal?: number
  notes?: string
  created_at?: string
  product_id?: number
  category_id?: number
  brand_filter?: string
  product_name?: string
  category_name?: string
}

export type B2BSearchResult = {
  id: number
  name: string
  brand: string
}

export type B2BScrapingRequest = {
  id?: number
  owner_type?: string
  target_type?: string
  target_url?: string
  status?: string
  notes?: string
  is_duplicate?: boolean
  duplicate_reason?: string
  warning?: string
  similar_urls?: Array<{
    url?: string
    product_name?: string
    similarity_score?: number
  }>
  created_at?: string
}

export type B2BNotification = {
  id?: number
  type?: string
  message?: string
  severity?: string
  is_read?: boolean
  created_at?: string
  product_listing_id?: number
}

export type B2BReport = {
  id?: number
  owner_type?: string
  report_type?: string
  status?: string
  file_path?: string
  period_start?: string
  period_end?: string
  generated_at?: string
  created_at?: string
}

export type B2BDashboardMetrics = {
  products_count?: number
  new_products_this_week?: number
  listings_count?: number
  average_trust_score?: number
  in_stock_count?: number
  out_of_stock_count?: number
  notifications_count?: number
  share_of_shelf?: Array<{ name: string; value: number; change: number }>
  competitor_pricing?: Array<{ name: string; value: number; change: number }>
  opportunities?: Array<Record<string, unknown>>
  demand_intelligence?: Record<string, unknown>
  stock_monitoring?: Array<Record<string, unknown>>
}
