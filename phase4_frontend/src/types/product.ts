export interface ProductAnalysis {
  pros: string[]
  cons: string[]
  top_quote: string
  sentiment_score: number
  recommendation: 'Buy' | 'Wait' | 'Skip'
  quality_score: number
}

export interface PricePrediction {
  likely: boolean
  confidence: 'high' | 'medium' | 'low'
  estimated_drop_pct: string
  timeframe: string
}

export interface ProductComparison {
  better_at: string[]
  weaker_at: string[]
  verdict: string
  compared_to: { name: string; price: number | null }
}

export interface TrendCategory {
  category: string
  count: number
  last_count?: number
  growth_pct?: number
}

export interface DecliningCategory {
  category: string
  avg_sentiment: number
  last_sentiment?: number
  drop_points?: number
}

export interface PriceMovement {
  category: string
  avg_price: number
  last_avg_price?: number
  delta?: number
}

export interface BestDeal {
  name: string
  price: number | null
  original_price?: number | null
  discount_percent?: number | null
  category: string
  score: number
  flipkart_url: string
}

export interface TrendsData {
  hot_categories: TrendCategory[]
  declining_categories: DecliningCategory[]
  emerging_keywords: { keyword: string; mentions: number }[]
  price_movements?: PriceMovement[]
  best_deal?: BestDeal | null
  has_history: boolean
  week_number: number
  generated_at: string
}

export interface Product {
  id: string
  name: string
  price: number | null
  original_price?: number | null
  discount_percent?: number | null
  image_url: string | null
  category: string
  sub_category: string | null
  rating: number | null
  review_count: number | null
  flipkart_url: string
  scraped_at: string | null
  analysis: ProductAnalysis
  is_vfm?: boolean
  vfm_score?: number
  price_prediction?: PricePrediction | null
  comparisons?: ProductComparison[]
}

export interface ProductsData {
  last_updated: string | null
  total_products: number
  products: Product[]
}

export const CATEGORY_CONFIG: Record<string, { label: string; emoji: string }> = {
  vfm:           { label: 'Value for Money',  emoji: '💰' },
  Electronics:   { label: 'Electronics',      emoji: '📱' },
  Mobiles:       { label: 'Mobiles',           emoji: '📱' },
  Laptops:       { label: 'Laptops',           emoji: '💻' },
  TVs:           { label: 'TVs',               emoji: '📺' },
  Fashion:       { label: 'Fashion',           emoji: '👕' },
  Men_Fashion:   { label: "Men's Fashion",     emoji: '👔' },
  Women_Fashion: { label: "Women's Fashion",   emoji: '👗' },
  Home_Kitchen:  { label: 'Home & Kitchen',    emoji: '🏠' },
  Beauty:        { label: 'Beauty & Care',     emoji: '🧴' },
  Sports:        { label: 'Sports & Fitness',  emoji: '🏋️' },
}

export interface NewTodayProduct {
  name: string
  price: number | null
  category: string
  image_url: string | null
  flipkart_url: string
  scraped_at: string | null
}

export interface NewTodayData {
  date: string
  total_products: number
  products: NewTodayProduct[]
}

export interface QuickAnalysis {
  quick_score: number
  top_pros: string[]
  top_con: string | null
  quick_verdict: 'Worth checking' | 'Wait for more data'
}

export interface FreshFind {
  name: string
  price: number | null
  category: string
  image_url: string | null
  flipkart_url: string
  scraped_at: string | null
  quick_analysis: QuickAnalysis | null
}

export interface FreshFindsData {
  date: string
  total_products: number
  products: FreshFind[]
}

export const SORT_OPTIONS = [
  { value: 'quality_score', label: 'Top Rated'    },
  { value: 'reviews',       label: 'Most Reviews' },
  { value: 'price_asc',     label: 'Price: Low → High' },
  { value: 'price_desc',    label: 'Price: High → Low' },
]
