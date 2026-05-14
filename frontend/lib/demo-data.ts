export const DEMO_USER = {
  id: 1,
  email: "demo@example.com",
  full_name: "John Demo",
  company_name: "Demo Retail Inc.",
  company_market: "Electronics & Home Goods",
  company_country: "US",
  company_website: "https://demoretail.example.com",
  b2b_status: "APPROVED",
  is_verified: true,
  seller_id: 1,
  owner_user_id: 1,
  usage_json: {
    "2026-05": { scraping_requests: 8, ads_requests: 3, reports: 2 },
    "2026-04": { scraping_requests: 12, ads_requests: 5, reports: 4 },
  },
  type: "B2B_COMPANY",
}

export const DEMO_SUBSCRIPTION = {
  source: "admin",
  owner_type: "company",
  plan_type: "GOLD",
  active: true,
  duration_months: 12,
  start_date: "2026-01-15T00:00:00Z",
  end_date: "2026-12-15T00:00:00Z",
  days_remaining: 221,
  activated_at: "2026-01-15T00:00:00Z",
}

export const DEMO_LISTINGS = [
  { id: 101, productId: 1, productName: "Wireless Bluetooth Headphones Pro", productBrand: "SoundMax", categoryName: "Electronics", price: 79.99, old_price: 89.99, availability: true, trust_score: 88, trust_score_breakdown: { components: { price_stability: { score: 92 }, seller_reliability: { score: 85 }, stock_consistency: { score: 90 }, data_freshness: { score: 88 }, anomaly_penalty: { score: 95 } } }, vendor_rank: 2, total_sellers: 7, ref: "DEMO-0001", product_url: "https://example.com/product/1", is_active: true, created_at: "2026-01-20T08:00:00Z", updated_at: "2026-05-01T12:00:00Z" },
  { id: 102, productId: 2, productName: "Smart Home Security Camera 4K", productBrand: "SafeHome", categoryName: "Security", price: 129.99, old_price: 149.99, availability: true, trust_score: 92, trust_score_breakdown: { components: { price_stability: { score: 95 }, seller_reliability: { score: 90 }, stock_consistency: { score: 88 }, data_freshness: { score: 94 }, anomaly_penalty: { score: 97 } } }, vendor_rank: 1, total_sellers: 5, ref: "DEMO-0002", product_url: "https://example.com/product/2", is_active: true, created_at: "2026-01-20T08:00:00Z", updated_at: "2026-05-01T12:00:00Z" },
  { id: 103, productId: 3, productName: "Ergonomic Office Chair Mesh", productBrand: "ComfortPlus", categoryName: "Furniture", price: 249.99, old_price: 249.99, availability: false, trust_score: 65, trust_score_breakdown: { components: { price_stability: { score: 98 }, seller_reliability: { score: 55 }, stock_consistency: { score: 30 }, data_freshness: { score: 72 }, anomaly_penalty: { score: 80 } } }, vendor_rank: 4, total_sellers: 8, ref: "DEMO-0003", product_url: "https://example.com/product/3", is_active: true, created_at: "2026-01-20T08:00:00Z", updated_at: "2026-05-01T12:00:00Z" },
  { id: 104, productId: 4, productName: "Portable External SSD 2TB", productBrand: "DataFast", categoryName: "Storage", price: 149.99, old_price: 169.99, availability: true, trust_score: 81, trust_score_breakdown: { components: { price_stability: { score: 85 }, seller_reliability: { score: 78 }, stock_consistency: { score: 82 }, data_freshness: { score: 80 }, anomaly_penalty: { score: 90 } } }, vendor_rank: 3, total_sellers: 9, ref: "DEMO-0004", product_url: "https://example.com/product/4", is_active: true, created_at: "2026-01-20T08:00:00Z", updated_at: "2026-05-01T12:00:00Z" },
  { id: 105, productId: 5, productName: "Organic Green Tea Matcha Powder", productBrand: "ZenLeaf", categoryName: "Groceries", price: 29.99, old_price: 34.99, availability: true, trust_score: 94, trust_score_breakdown: { components: { price_stability: { score: 96 }, seller_reliability: { score: 92 }, stock_consistency: { score: 90 }, data_freshness: { score: 95 }, anomaly_penalty: { score: 98 } } }, vendor_rank: 1, total_sellers: 4, ref: "DEMO-0005", product_url: "https://example.com/product/5", is_active: true, created_at: "2026-01-20T08:00:00Z", updated_at: "2026-05-01T12:00:00Z" },
  { id: 106, productId: 6, productName: "Professional Chef Knife Set", productBrand: "KitchenElite", categoryName: "Kitchen", price: 89.99, old_price: 89.99, availability: true, trust_score: 76, trust_score_breakdown: { components: { price_stability: { score: 99 }, seller_reliability: { score: 70 }, stock_consistency: { score: 65 }, data_freshness: { score: 75 }, anomaly_penalty: { score: 82 } } }, vendor_rank: 5, total_sellers: 6, ref: "DEMO-0006", product_url: "https://example.com/product/6", is_active: true, created_at: "2026-01-20T08:00:00Z", updated_at: "2026-05-01T12:00:00Z" },
  { id: 107, productId: 7, productName: "Yoga Mat Extra Thick Premium", productBrand: "FlexFit", categoryName: "Sports", price: 39.99, old_price: 44.99, availability: false, trust_score: 58, trust_score_breakdown: { components: { price_stability: { score: 82 }, seller_reliability: { score: 45 }, stock_consistency: { score: 25 }, data_freshness: { score: 60 }, anomaly_penalty: { score: 70 } } }, vendor_rank: 6, total_sellers: 8, ref: "DEMO-0007", product_url: "https://example.com/product/7", is_active: true, created_at: "2026-01-20T08:00:00Z", updated_at: "2026-05-01T12:00:00Z" },
  { id: 108, productId: 8, productName: "LED Desk Lamp with Wireless Charger", productBrand: "BrightTech", categoryName: "Lighting", price: 54.99, old_price: 59.99, availability: true, trust_score: 85, trust_score_breakdown: { components: { price_stability: { score: 88 }, seller_reliability: { score: 82 }, stock_consistency: { score: 84 }, data_freshness: { score: 86 }, anomaly_penalty: { score: 92 } } }, vendor_rank: 2, total_sellers: 5, ref: "DEMO-0008", product_url: "https://example.com/product/8", is_active: true, created_at: "2026-01-20T08:00:00Z", updated_at: "2026-05-01T12:00:00Z" },
]

export const DEMO_METRICS = {
  products_count: 48,
  new_products_this_week: 3,
  listings_count: 8,
  average_trust_score: 79.5,
  in_stock_count: 6,
  out_of_stock_count: 2,
  notifications_count: 5,
  tracking_limit: 20,
  competitor_pricing: [
    { product_id: 1, product_name: "Wireless Bluetooth Headphones Pro", vendor_price: 79.99, cheapest_competitor_price: 69.99, competitor_seller_name: "PriceBuster", vendor_rank: 2, gap_to_cheapest: 10.00, market_average_price: 74.50 },
    { product_id: 2, product_name: "Smart Home Security Camera 4K", vendor_price: 129.99, cheapest_competitor_price: 119.99, competitor_seller_name: "TechDeals", vendor_rank: 1, gap_to_cheapest: -10.00, market_average_price: 134.99 },
    { product_id: 3, product_name: "Ergonomic Office Chair Mesh", vendor_price: 249.99, cheapest_competitor_price: 219.99, competitor_seller_name: "OfficeMart", vendor_rank: 4, gap_to_cheapest: 30.00, market_average_price: 239.99 },
    { product_id: 4, product_name: "Portable External SSD 2TB", vendor_price: 149.99, cheapest_competitor_price: 139.99, competitor_seller_name: "DataWorld", vendor_rank: 3, gap_to_cheapest: 10.00, market_average_price: 145.50 },
    { product_id: 5, product_name: "Organic Green Tea Matcha Powder", vendor_price: 29.99, cheapest_competitor_price: 27.99, competitor_seller_name: "HealthFirst", vendor_rank: 1, gap_to_cheapest: -2.00, market_average_price: 31.99 },
    { product_id: 6, product_name: "Professional Chef Knife Set", vendor_price: 89.99, cheapest_competitor_price: 79.99, competitor_seller_name: "KitchenWorld", vendor_rank: 5, gap_to_cheapest: 10.00, market_average_price: 85.00 },
    { product_id: 7, product_name: "Yoga Mat Extra Thick Premium", vendor_price: 39.99, cheapest_competitor_price: 34.99, competitor_seller_name: "FitZone", vendor_rank: 6, gap_to_cheapest: 5.00, market_average_price: 37.50 },
    { product_id: 8, product_name: "LED Desk Lamp with Wireless Charger", vendor_price: 54.99, cheapest_competitor_price: 49.99, competitor_seller_name: "HomeBright", vendor_rank: 2, gap_to_cheapest: 5.00, market_average_price: 52.50 },
  ],
  stock_monitoring: [
    { product_id: 1, product_name: "Wireless Bluetooth Headphones Pro", out_of_stock_rate: 5, trust_score: 88 },
    { product_id: 2, product_name: "Smart Home Security Camera 4K", out_of_stock_rate: 0, trust_score: 92 },
    { product_id: 3, product_name: "Ergonomic Office Chair Mesh", out_of_stock_rate: 100, trust_score: 65 },
    { product_id: 4, product_name: "Portable External SSD 2TB", out_of_stock_rate: 8, trust_score: 81 },
    { product_id: 5, product_name: "Organic Green Tea Matcha Powder", out_of_stock_rate: 3, trust_score: 94 },
    { product_id: 6, product_name: "Professional Chef Knife Set", out_of_stock_rate: 12, trust_score: 76 },
    { product_id: 7, product_name: "Yoga Mat Extra Thick Premium", out_of_stock_rate: 100, trust_score: 58 },
    { product_id: 8, product_name: "LED Desk Lamp with Wireless Charger", out_of_stock_rate: 2, trust_score: 85 },
  ],
  top_listings: [
    { productName: "Wireless Bluetooth Headphones Pro", price: 79.99, cheapest_price: 69.99, vendor_rank: 2, total_sellers: 7 },
    { productName: "Smart Home Security Camera 4K", price: 129.99, cheapest_price: 119.99, vendor_rank: 1, total_sellers: 5 },
    { productName: "Ergonomic Office Chair Mesh", price: 249.99, cheapest_price: 219.99, vendor_rank: 4, total_sellers: 8 },
    { productName: "Portable External SSD 2TB", price: 149.99, cheapest_price: 139.99, vendor_rank: 3, total_sellers: 9 },
    { productName: "Organic Green Tea Matcha Powder", price: 29.99, cheapest_price: 27.99, vendor_rank: 1, total_sellers: 4 },
    { productName: "Professional Chef Knife Set", price: 89.99, cheapest_price: 79.99, vendor_rank: 5, total_sellers: 6 },
  ],
  opportunities: [
    { type: "STOCK_OPPORTUNITY", product_name: "Ergonomic Office Chair Mesh", reason: "All 7 competitors are currently out of stock. Increase stock to capture full market demand.", seller_name: "" },
    { type: "PRICE_OPPORTUNITY", product_name: "Wireless Bluetooth Headphones Pro", reason: "Your price is $10 above cheapest. A 7% reduction would make you the market leader.", seller_name: "PriceBuster" },
    { type: "TRUST_ALERT", product_name: "Yoga Mat Extra Thick Premium", reason: "Trust score dropped 12 points due to stock inconsistencies. Review supplier reliability.", seller_name: "" },
    { type: "STOCK_OPPORTUNITY", product_name: "Professional Chef Knife Set", reason: "2 out of 6 competitors are frequently out of stock. Maintain availability to capture share.", seller_name: "CutleryPro" },
  ],
  share_of_shelf: [
    { category: "Electronics", category_id: 1, brand_products: 12, total_products: 45, share_of_shelf: 26.7 },
    { category: "Security", category_id: 2, brand_products: 5, total_products: 18, share_of_shelf: 27.8 },
    { category: "Furniture", category_id: 3, brand_products: 8, total_products: 52, share_of_shelf: 15.4 },
    { category: "Storage", category_id: 4, brand_products: 6, total_products: 22, share_of_shelf: 27.3 },
    { category: "Groceries", category_id: 5, brand_products: 3, total_products: 28, share_of_shelf: 10.7 },
    { category: "Kitchen", category_id: 6, brand_products: 7, total_products: 35, share_of_shelf: 20.0 },
    { category: "Sports", category_id: 7, brand_products: 4, total_products: 30, share_of_shelf: 13.3 },
    { category: "Lighting", category_id: 8, brand_products: 3, total_products: 12, share_of_shelf: 25.0 },
  ],
  price_dispersion: [
    { product_id: 1, product_name: "Wireless Bluetooth Headphones Pro", min_price: 69.99, max_price: 89.99, price_range: 20.00, dispersion_pct: 25.0, sellers_count: 7, seller_with_min: "PriceBuster", seller_with_max: "AudioPro" },
    { product_id: 2, product_name: "Smart Home Security Camera 4K", min_price: 119.99, max_price: 149.99, price_range: 30.00, dispersion_pct: 22.2, sellers_count: 5, seller_with_min: "TechDeals", seller_with_max: "SecureHome" },
    { product_id: 3, product_name: "Ergonomic Office Chair Mesh", min_price: 219.99, max_price: 289.99, price_range: 70.00, dispersion_pct: 27.8, sellers_count: 8, seller_with_min: "OfficeMart", seller_with_max: "LuxSit" },
    { product_id: 4, product_name: "Portable External SSD 2TB", min_price: 139.99, max_price: 169.99, price_range: 30.00, dispersion_pct: 19.4, sellers_count: 9, seller_with_min: "DataWorld", seller_with_max: "TechStore" },
    { product_id: 5, product_name: "Organic Green Tea Matcha Powder", min_price: 27.99, max_price: 34.99, price_range: 7.00, dispersion_pct: 22.2, sellers_count: 4, seller_with_min: "HealthFirst", seller_with_max: "OrganicMarket" },
    { product_id: 6, product_name: "Professional Chef Knife Set", min_price: 79.99, max_price: 99.99, price_range: 20.00, dispersion_pct: 22.2, sellers_count: 6, seller_with_min: "KitchenWorld", seller_with_max: "GourmetTools" },
    { product_id: 8, product_name: "LED Desk Lamp with Wireless Charger", min_price: 49.99, max_price: 64.99, price_range: 15.00, dispersion_pct: 25.0, sellers_count: 5, seller_with_min: "HomeBright", seller_with_max: "LightPlus" },
  ],
  competitor_brands: [
    { brand: "TechDeals", listings_count: 42, market_share_pct: 23.5, avg_price: 89.99, avg_trust_score: 72 },
    { brand: "PriceBuster", listings_count: 35, market_share_pct: 19.8, avg_price: 74.50, avg_trust_score: 65 },
    { brand: "SoundMax", listings_count: 28, market_share_pct: 15.6, avg_price: 95.00, avg_trust_score: 78 },
    { brand: "SafeHome", listings_count: 22, market_share_pct: 12.3, avg_price: 135.00, avg_trust_score: 85 },
    { brand: "OfficeMart", listings_count: 18, market_share_pct: 10.1, avg_price: 215.00, avg_trust_score: 70 },
    { brand: "DataWorld", listings_count: 15, market_share_pct: 8.4, avg_price: 155.00, avg_trust_score: 82 },
    { brand: "HomeBright", listings_count: 10, market_share_pct: 5.6, avg_price: 52.50, avg_trust_score: 75 },
    { brand: "FitZone", listings_count: 8, market_share_pct: 4.7, avg_price: 37.50, avg_trust_score: 60 },
  ],
  stock_intelligence: [
    { seller_name: "PriceBuster", seller_id: 10, total_listings: 35, out_of_stock: 7, out_of_stock_rate: 20.0 },
    { seller_name: "TechDeals", seller_id: 11, total_listings: 42, out_of_stock: 5, out_of_stock_rate: 11.9 },
    { seller_name: "OfficeMart", seller_id: 12, total_listings: 18, out_of_stock: 6, out_of_stock_rate: 33.3 },
    { seller_name: "DataWorld", seller_id: 13, total_listings: 15, out_of_stock: 2, out_of_stock_rate: 13.3 },
    { seller_name: "HomeBright", seller_id: 14, total_listings: 10, out_of_stock: 1, out_of_stock_rate: 10.0 },
    { seller_name: "FitZone", seller_id: 15, total_listings: 8, out_of_stock: 4, out_of_stock_rate: 50.0 },
  ],
  reviews_sentiment: [
    { product_id: 1, product_name: "Wireless Bluetooth Headphones Pro", avg_rating: 4.3, review_count: 128, sentiment_score: 0.85, rating_gap_vs_competitors: 0.2, top_keywords: ["noise cancelling", "comfortable", "battery life"] },
    { product_id: 2, product_name: "Smart Home Security Camera 4K", avg_rating: 4.6, review_count: 95, sentiment_score: 0.92, rating_gap_vs_competitors: 0.4, top_keywords: ["crystal clear", "easy setup", "night vision"] },
    { product_id: 3, product_name: "Ergonomic Office Chair Mesh", avg_rating: 3.8, review_count: 210, sentiment_score: 0.62, rating_gap_vs_competitors: -0.3, top_keywords: ["comfortable", "assembly", "lumbar"] },
    { product_id: 4, product_name: "Portable External SSD 2TB", avg_rating: 4.1, review_count: 67, sentiment_score: 0.78, rating_gap_vs_competitors: 0.1, top_keywords: ["fast", "portable", "reliable"] },
    { product_id: 5, product_name: "Organic Green Tea Matcha Powder", avg_rating: 4.7, review_count: 183, sentiment_score: 0.95, rating_gap_vs_competitors: 0.5, top_keywords: ["smooth taste", "authentic", "quality"] },
    { product_id: 8, product_name: "LED Desk Lamp with Wireless Charger", avg_rating: 4.2, review_count: 76, sentiment_score: 0.80, rating_gap_vs_competitors: 0.15, top_keywords: ["brightness", "charging", "modern"] },
  ],
  stock_by_seller: [
    { seller_name: "PriceBuster", seller_id: 10, total_listings: 35, out_of_stock: 7, out_of_stock_rate: 20.0 },
    { seller_name: "TechDeals", seller_id: 11, total_listings: 42, out_of_stock: 5, out_of_stock_rate: 11.9 },
    { seller_name: "OfficeMart", seller_id: 12, total_listings: 18, out_of_stock: 6, out_of_stock_rate: 33.3 },
    { seller_name: "DataWorld", seller_id: 13, total_listings: 15, out_of_stock: 2, out_of_stock_rate: 13.3 },
  ],
}

export const DEMO_NOTIFICATIONS = [
  { id: 1, type: "COMPETITOR_UNDERCUT", message: "Competitor \"PriceBuster\" is now cheaper for \"Wireless Bluetooth Headphones Pro\" (Price: $69.99)", severity: "WARNING", is_read: false, created_at: "2026-05-07T14:30:00Z", product_listing_id: 101 },
  { id: 2, type: "STOCK_SHORTAGE", message: "Stock shortage detected for \"Ergonomic Office Chair Mesh\". Frequent stock-outs observed.", severity: "CRITICAL", is_read: false, created_at: "2026-05-06T09:15:00Z", product_listing_id: 103 },
  { id: 3, type: "TRUST_SCORE_CHANGE", message: "Your average trust score improved by 5 points this week. Great job!", severity: "SUCCESS", is_read: true, created_at: "2026-05-05T16:00:00Z" },
  { id: 4, type: "PRICE_DROP", message: "Price drop detected: \"Smart Home Security Camera 4K\" decreased by 12% this week.", severity: "INFO", is_read: false, created_at: "2026-05-04T11:45:00Z" },
  { id: 5, type: "SCRAPING_REQUEST_COMPLETED", message: "Your data scraping request for competitor pricing has been completed. New data available in the dashboard.", severity: "SUCCESS", is_read: true, created_at: "2026-05-03T08:20:00Z" },
  { id: 6, type: "SUBSCRIPTION_APPROVED", message: "Your GOLD subscription has been approved. Welcome to ProductRadar!", severity: "SUCCESS", is_read: true, created_at: "2026-01-15T10:00:00Z" },
]

export const DEMO_HEALTH_SCORE = {
  overall: 78,
  trust_dimension: 72,
  pricing_dimension: 81,
  stock_dimension: 65,
}

export const DEMO_TRUST_SCORE_HISTORY = [
  { date: "2026-02-01", avg_score: 72.3, listing_count: 8 },
  { date: "2026-02-08", avg_score: 73.1, listing_count: 8 },
  { date: "2026-02-15", avg_score: 74.5, listing_count: 8 },
  { date: "2026-02-22", avg_score: 73.8, listing_count: 8 },
  { date: "2026-03-01", avg_score: 75.2, listing_count: 8 },
  { date: "2026-03-08", avg_score: 76.0, listing_count: 8 },
  { date: "2026-03-15", avg_score: 74.9, listing_count: 8 },
  { date: "2026-03-22", avg_score: 76.8, listing_count: 8 },
  { date: "2026-04-01", avg_score: 77.2, listing_count: 8 },
  { date: "2026-04-08", avg_score: 78.1, listing_count: 8 },
  { date: "2026-04-15", avg_score: 77.5, listing_count: 8 },
  { date: "2026-04-22", avg_score: 78.9, listing_count: 8 },
  { date: "2026-05-01", avg_score: 79.5, listing_count: 8 },
  { date: "2026-05-07", avg_score: 80.2, listing_count: 8 },
]

export const DEMO_WATCHLIST = [
  { id: 1, product_id: 10, product_name: "Samsung Galaxy Buds Pro 2", product_image: null, product_brand: "Samsung", followed_at: "2026-03-10T08:00:00Z", cheapest_price: 149.99, highest_price: 189.99, total_sellers: 6 },
  { id: 2, product_id: 11, product_name: "Sony WH-1000XM5 Headphones", product_image: null, product_brand: "Sony", followed_at: "2026-03-12T10:30:00Z", cheapest_price: 329.99, highest_price: 379.99, total_sellers: 8 },
  { id: 3, product_id: 12, product_name: "Apple AirPods Max", product_image: null, product_brand: "Apple", followed_at: "2026-03-15T14:00:00Z", cheapest_price: 479.99, highest_price: 549.99, total_sellers: 5 },
  { id: 4, product_id: 13, product_name: "Logitech MX Master 3S Mouse", product_image: null, product_brand: "Logitech", followed_at: "2026-04-01T09:00:00Z", cheapest_price: 89.99, highest_price: 109.99, total_sellers: 7 },
  { id: 5, product_id: 14, product_name: "Dell UltraSharp 27\" 4K Monitor", product_image: null, product_brand: "Dell", followed_at: "2026-04-05T11:00:00Z", cheapest_price: 549.99, highest_price: 649.99, total_sellers: 4 },
]

export const DEMO_SCRAPING_REQUESTS = [
  { id: 1, owner_type: "company", target_type: "PRODUCT", target_url: "https://amazon.com/dp/B0ABCDEFGH", status: "DONE", notes: "Competitor pricing for headphones", is_duplicate: false, created_at: "2026-04-28T10:00:00Z" },
  { id: 2, owner_type: "company", target_type: "CATEGORY", target_url: "https://amazon.com/s?k=wireless+headphones", status: "PENDING", notes: "Full category analysis", is_duplicate: false, created_at: "2026-05-02T14:30:00Z" },
  { id: 3, owner_type: "company", target_type: "PRODUCT", target_url: "https://bestbuy.com/site/product123", status: "DONE", notes: "", is_duplicate: false, created_at: "2026-04-25T08:00:00Z" },
  { id: 4, owner_type: "company", target_type: "PRODUCT", target_url: "https://walmart.com/ip/chair456", status: "REJECTED", notes: "Already tracked", is_duplicate: true, duplicate_reason: "This URL is already being tracked by your account.", created_at: "2026-05-01T09:15:00Z" },
]

export const DEMO_ADS_REQUESTS = [
  { id: 1, owner_type: "company", request_type: "BANNER", target_type: "PRODUCT", target_url: "/B2C/products/1", status: "APPROVED", duration_days: 30, budget_proposal: 500, notes: "Promote headphones for summer campaign", created_at: "2026-04-15T10:00:00Z", product_id: 1, product_name: "Wireless Bluetooth Headphones Pro" },
  { id: 2, owner_type: "company", request_type: "SPONSORED_PRODUCT", target_type: "BRAND_GROUP", target_url: "/B2C/products?categoryId=4", status: "PENDING", duration_days: 60, budget_proposal: 1200, notes: "Boost SSD sales Q2", created_at: "2026-05-01T14:00:00Z", brand_filter: "DataFast" },
  { id: 3, owner_type: "company", request_type: "BACKLINK_ARTICLE", target_type: "PRODUCT", target_url: "/B2C/products/5", status: "PENDING", duration_days: 90, budget_proposal: 800, notes: "Sponsored review for matcha powder", created_at: "2026-05-05T09:00:00Z", product_id: 5, product_name: "Organic Green Tea Matcha Powder" },
]

export const DEMO_REPORTS = [
  { id: 1, owner_type: "company", report_type: "COMPETITOR_PRICING", status: "GENERATED", file_path: "/reports/competitor_pricing_2026-05.csv", period_start: "2026-04-01", period_end: "2026-04-30", generated_at: "2026-05-01T00:00:00Z", created_at: "2026-05-01T00:00:00Z" },
  { id: 2, owner_type: "company", report_type: "STOCK_AVAILABILITY", status: "GENERATED", file_path: "/reports/stock_availability_2026-05.csv", period_start: "2026-04-01", period_end: "2026-04-30", generated_at: "2026-05-02T00:00:00Z", created_at: "2026-05-02T00:00:00Z" },
  { id: 3, owner_type: "company", report_type: "TRUST_SCORE_RANKING", status: "PENDING", period_start: "2026-05-01", period_end: "2026-05-07", created_at: "2026-05-07T10:00:00Z" },
]

export const DEMO_SEARCH_INSIGHTS = {
  top_queries: [
    { query: "wireless headphones", count: 245 },
    { query: "4k security camera", count: 189 },
    { query: "office chair ergonomic", count: 156 },
    { query: "external ssd 2tb", count: 134 },
    { query: "matcha green tea", count: 112 },
    { query: "chef knife set", count: 98 },
    { query: "yoga mat thick", count: 87 },
    { query: "led desk lamp wireless", count: 76 },
  ],
  zero_result_queries: [
    { query: "bluetooth speaker waterproof", count: 34 },
    { query: "smart thermostat", count: 28 },
    { query: "air purifier hepa", count: 22 },
    { query: "electric toothbrush", count: 18 },
  ],
  trending: [
    { query: "wireless headphones", count: 45 },
    { query: "smart home hub", count: 38 },
    { query: "usb c hub", count: 32 },
    { query: "standing desk", count: 29 },
  ],
}

export const DEMO_SUMMARY = {
  user: DEMO_USER,
  subscription: DEMO_SUBSCRIPTION,
  metrics: DEMO_METRICS,
  search_insights: DEMO_SEARCH_INSIGHTS,
  notifications: DEMO_NOTIFICATIONS,
}

export const DEMO_COMPARISON_DATA: Record<string, any> = {
  "101": {
    product: { id: 1, name: "Wireless Bluetooth Headphones Pro", brand: "SoundMax", image: null },
    vendor_listing: {
      listing_id: 101, seller_id: 1, seller_name: "Your Store", price: 79.99, old_price: 89.99, availability: true, trust_score: 88,
      trust_score_breakdown: { components: { price_stability: { score: 92 }, seller_reliability: { score: 85 }, stock_consistency: { score: 90 }, data_freshness: { score: 88 }, anomaly_penalty: { score: 95 } } },
      product_url: null, is_vendor: true, updated_at: "2026-05-07T12:00:00Z",
    },
    competitors: [
      { listing_id: 201, seller_id: 10, seller_name: "PriceBuster", price: 69.99, old_price: 74.99, availability: true, trust_score: 72, trust_score_breakdown: { components: { price_stability: { score: 80 }, seller_reliability: { score: 65 }, stock_consistency: { score: 70 }, data_freshness: { score: 75 }, anomaly_penalty: { score: 78 } } }, product_url: null, is_vendor: false, updated_at: "2026-05-06T10:00:00Z" },
      { listing_id: 202, seller_id: 11, seller_name: "TechDeals", price: 74.99, old_price: 79.99, availability: true, trust_score: 78, trust_score_breakdown: { components: { price_stability: { score: 85 }, seller_reliability: { score: 72 }, stock_consistency: { score: 76 }, data_freshness: { score: 80 }, anomaly_penalty: { score: 82 } } }, product_url: null, is_vendor: false, updated_at: "2026-05-07T08:00:00Z" },
      { listing_id: 203, seller_id: 12, seller_name: "AudioPro", price: 89.99, old_price: 89.99, availability: true, trust_score: 84, trust_score_breakdown: { components: { price_stability: { score: 95 }, seller_reliability: { score: 80 }, stock_consistency: { score: 82 }, data_freshness: { score: 85 }, anomaly_penalty: { score: 88 } } }, product_url: null, is_vendor: false, updated_at: "2026-05-05T14:00:00Z" },
    ],
    price_history: {
      "101": [
        { price: 89.99, recorded_at: "2026-02-01T00:00:00Z" }, { price: 87.99, recorded_at: "2026-02-15T00:00:00Z" },
        { price: 85.99, recorded_at: "2026-03-01T00:00:00Z" }, { price: 84.99, recorded_at: "2026-03-15T00:00:00Z" },
        { price: 82.99, recorded_at: "2026-04-01T00:00:00Z" }, { price: 79.99, recorded_at: "2026-04-15T00:00:00Z" },
        { price: 79.99, recorded_at: "2026-05-01T00:00:00Z" },
      ],
      "201": [
        { price: 74.99, recorded_at: "2026-02-01T00:00:00Z" }, { price: 72.99, recorded_at: "2026-02-15T00:00:00Z" },
        { price: 71.99, recorded_at: "2026-03-01T00:00:00Z" }, { price: 70.99, recorded_at: "2026-03-15T00:00:00Z" },
        { price: 69.99, recorded_at: "2026-04-01T00:00:00Z" }, { price: 69.99, recorded_at: "2026-04-15T00:00:00Z" },
        { price: 69.99, recorded_at: "2026-05-01T00:00:00Z" },
      ],
      "202": [
        { price: 79.99, recorded_at: "2026-02-01T00:00:00Z" }, { price: 78.99, recorded_at: "2026-02-15T00:00:00Z" },
        { price: 77.99, recorded_at: "2026-03-01T00:00:00Z" }, { price: 76.99, recorded_at: "2026-03-15T00:00:00Z" },
        { price: 75.99, recorded_at: "2026-04-01T00:00:00Z" }, { price: 74.99, recorded_at: "2026-04-15T00:00:00Z" },
        { price: 74.99, recorded_at: "2026-05-01T00:00:00Z" },
      ],
    },
    stats: { total_sellers: 7, cheapest_price: 69.99, highest_price: 89.99, vendor_rank: 2 },
  },
}

export const WATCHLIST_SEARCH_RESULTS = [
  { id: 20, name: "Sony WH-1000XM5 Wireless Headphones", brand: "Sony" },
  { id: 21, name: "Bose QuietComfort Ultra Headphones", brand: "Bose" },
  { id: 22, name: "Apple AirPods Pro 2nd Gen", brand: "Apple" },
  { id: 23, name: "Samsung Galaxy Buds FE", brand: "Samsung" },
  { id: 24, name: "JBL Tune 770NC", brand: "JBL" },
]

export const DEMO_SPONSORED_ARTICLES = [
  { id: 1, product_id: 1, product_name: "Wireless Bluetooth Headphones Pro", product_brand: "SoundMax", product_image: null, status: "PUBLISHED", published_at: "2026-05-01T10:00:00Z", ends_at: "2026-05-31T10:00:00Z", created_at: "2026-04-28T09:00:00Z" },
  { id: 2, product_id: 3, product_name: "Ergonomic Office Chair", product_brand: "ComfortPlus", product_image: null, status: "PUBLISHED", published_at: "2026-04-15T08:00:00Z", ends_at: "2026-05-15T08:00:00Z", created_at: "2026-04-10T14:00:00Z" },
  { id: 3, product_id: 5, product_name: "Organic Green Tea Matcha Powder", product_brand: "GreenLeaf", product_image: null, status: "PENDING", published_at: null, ends_at: null, created_at: "2026-05-07T11:00:00Z" },
]
