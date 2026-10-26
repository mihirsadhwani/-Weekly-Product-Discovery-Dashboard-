import {
  Smartphone, Laptop, Tv, Shirt, Home, Sparkles, Dumbbell, Package, Cpu,
  type LucideIcon,
} from 'lucide-react'

export interface CategoryMeta {
  label: string
  icon: LucideIcon
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  Electronics:   { label: 'Electronics',      icon: Cpu },
  Mobiles:       { label: 'Mobiles',          icon: Smartphone },
  Laptops:       { label: 'Laptops',          icon: Laptop },
  TVs:           { label: 'TVs',              icon: Tv },
  Fashion:       { label: 'Fashion',          icon: Shirt },
  Men_Fashion:   { label: "Men's Fashion",    icon: Shirt },
  Women_Fashion: { label: "Women's Fashion",  icon: Shirt },
  Home_Kitchen:  { label: 'Home & Kitchen',   icon: Home },
  Beauty:        { label: 'Beauty & Care',    icon: Sparkles },
  Sports:        { label: 'Sports & Fitness', icon: Dumbbell },
}

const FALLBACK: CategoryMeta = { label: 'Other', icon: Package }

export function categoryMeta(key: string): CategoryMeta {
  return CATEGORY_META[key] ?? { ...FALLBACK, label: key.replace(/_/g, ' ') }
}
