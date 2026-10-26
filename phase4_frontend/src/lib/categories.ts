import {
  Smartphone, Laptop, Tv, Shirt, Home, Sparkles, Dumbbell, Package, Cpu,
  type LucideIcon,
} from 'lucide-react'

export interface CategoryMeta {
  label: string
  icon: LucideIcon
  // Chart / accent colour, tuned to read on both light and dark backgrounds
  color: string
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  Electronics:   { label: 'Electronics',      icon: Cpu,        color: '#3b82f6' },
  Mobiles:       { label: 'Mobiles',          icon: Smartphone, color: '#6366f1' },
  Laptops:       { label: 'Laptops',          icon: Laptop,     color: '#0ea5e9' },
  TVs:           { label: 'TVs',              icon: Tv,         color: '#8b5cf6' },
  Fashion:       { label: 'Fashion',          icon: Shirt,      color: '#ec4899' },
  Men_Fashion:   { label: "Men's Fashion",    icon: Shirt,      color: '#14b8a6' },
  Women_Fashion: { label: "Women's Fashion",  icon: Shirt,      color: '#f43f5e' },
  Home_Kitchen:  { label: 'Home & Kitchen',   icon: Home,       color: '#f59e0b' },
  Beauty:        { label: 'Beauty & Care',    icon: Sparkles,   color: '#a855f7' },
  Sports:        { label: 'Sports & Fitness', icon: Dumbbell,   color: '#22c55e' },
}

const FALLBACK: CategoryMeta = { label: 'Other', icon: Package, color: '#64748b' }

export function categoryMeta(key: string): CategoryMeta {
  return CATEGORY_META[key] ?? { ...FALLBACK, label: key.replace(/_/g, ' ') }
}
