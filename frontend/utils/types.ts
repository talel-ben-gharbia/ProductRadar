export type CanonicalSpecs = {
  ram?: string;
  storage?: string;
  screen?: string;
  resolution?: string;
  panel?: string;
  refresh?: string;
  camera?: string;
  cpu?: string;
  gpu?: string;
  os?: string;
  color?: string;
  battery?: string;
  weight?: string;
  water?: string;
}

export const SPEC_LABELS: Record<keyof CanonicalSpecs, string> = {
  ram: 'RAM', storage: 'Storage', screen: 'Display', resolution: 'Resolution',
  panel: 'Panel', refresh: 'Refresh Rate', camera: 'Camera', cpu: 'CPU',
  gpu: 'GPU', os: 'OS', color: 'Color', battery: 'Battery', weight: 'Weight',
  water: 'Water Resistance'
}

export type Product = {
  id: number
  name: string
  brand: string | null
  description: string
  specs_json?: Record<string, string> | null
  image_url: string | null
  categoryId: number | null
  listingCount?: number
}

export type SpecGroupRaw = {
  id: string;
  matchTier: 'EXACT' | 'STRONG' | 'SUBSET';
  confidence: number;
  products: Array<Product & { canonical_specs?: CanonicalSpecs }>;
  matchingKeys: string[];
  differingKeys: string[];
}

export type ProductListing = {
  id: number
  ref: string | null
  price: number | null
  old_price: number | null
  product_url: string
  availability: boolean | null
  trust_score: number | null
  created_at: string | null
  updated_at: string | null
  is_active: boolean | null
  productId: number | null
  productName: string | null
  productImageUrl: string | null
  sellerId: number | null
  sellerName: string | null
}

export type PriceHistoryEntry = {
  id: number
  recorded_price: number | null
  recorded_at: string | null
  out_of_stock: boolean | null
  anomaly: boolean | null
  productListingId: number | null
  sellerId: number | null
  sellerName: string | null
}

export type BestTimeToBuyPrediction = {
  action: "BUY_NOW" | "WAIT"
  wait_probability: number
  best_day_offset: number
  predicted_best_price: number
  current_price: number
  expected_drop_percent: number
  confidence: number
  horizon_days: number
  min_drop_ratio_to_wait: number
}

export type B2CAlert = {
  id: number
  is_price_notif: boolean
  is_stock_notif: boolean
  cancelled?: boolean
  productId: number | null
  productName: string | null
  productImageUrl: string | null
  alerterId: number | null
}

export type B2CFavorite = {
  id: number
  created_at: string | null
  clientId: number | null
  productListingId: number | null
  ref: string | null
  price: number | null
  old_price: number | null
  product_url: string
  availability: boolean | null
  trust_score: number | null
  is_active: boolean | null
  productId: number | null
  productName: string | null
  productImageUrl: string | null
  sellerId: number | null
  sellerName: string | null
}

export type CategoryWithParent = {
  id: number
  name: string
  childCategory: string | null
  subCategory: string | null
  category: string | null
}
