// Server-only — uses Node.js 'fs'. Never import from client components.
import fs from 'fs'
import path from 'path'
import type { Product, ProductsData, NewTodayData, TrendsData, FreshFindsData } from '@/types/product'

// On Vercel (and locally) data lives in public/data/ inside the Next.js project.
// GitHub Actions copies output/*.json → phase4_frontend/public/data/ after each run.
const DATA_DIR = path.join(process.cwd(), 'public', 'data')

export function getProductsData(): ProductsData {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, 'products.json'), 'utf-8')
    const data = JSON.parse(raw) as Omit<ProductsData, 'products'> & {
      products: Omit<Product, 'id'>[]
    }
    const products: Product[] = data.products.map((p, i) => ({ ...p, id: String(i) }))
    return { ...data, products }
  } catch {
    return { last_updated: null, total_products: 0, products: [] }
  }
}

export function getProductById(id: string): Product | null {
  const { products } = getProductsData()
  return products.find(p => p.id === id) ?? null
}

export function getTrendsData(): TrendsData | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'trends.json'), 'utf-8')) as TrendsData
  } catch {
    return null
  }
}

export function getNewTodayData(): NewTodayData {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, 'new_today.json'), 'utf-8')
    return JSON.parse(raw) as NewTodayData
  } catch {
    return { date: '', total_products: 0, products: [] }
  }
}

export function getFreshFindsData(): FreshFindsData | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'fresh_finds.json'), 'utf-8')) as FreshFindsData
  } catch {
    return null
  }
}
