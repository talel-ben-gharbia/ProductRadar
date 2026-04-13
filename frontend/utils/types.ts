export type Product = {
  id: number
  name: string
  brand: string | null
  description: string
  specs_json: Record<string, unknown> | null
  image_url: string | null
  categoryId: number | null
  listingCount?: number
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
  updatet_at: string | null
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

export type B2CAlert = {
  id: number
  is_price_notif: boolean
  is_stock_notif: boolean
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
