// Server-only — uses Node.js 'fs'. Never import from client components.
import fs from 'fs'
import path from 'path'
import type { Product, ProductsData, NewTodayData, TrendsData, FreshFindsData } from '@/types/product'

// On Vercel (and locally) data lives in public/data/ inside the Next.js project.
// GitHub Actions copies output/*.json → phase4_frontend/public/data/ after each run.
const DATA_DIR = path.join(process.cwd(), 'public', 'data')

// Latest published data is read from the repo's main branch so the pipeline's commits show up
// without a redeploy. Cached for an hour and purged by the Refresh button (tag 'data');
// falls back to the bundled copy when GitHub is unreachable.
export const DATA_TAG = 'data'
const REMOTE_BASE =
  process.env.DATA_BASE_URL ??
  'https://raw.githubusercontent.com/mihirsadhwani/-Weekly-Product-Discovery-Dashboard-/main/phase4_frontend/public/data'

async function readJson<T>(file: string): Promise<T | null> {
  try {
    const res = await fetch(`${REMOTE_BASE}/${file}`, { next: { revalidate: 3600, tags: [DATA_TAG] } })
    if (res.ok) return (await res.json()) as T
  } catch { /* fall through to bundled copy */ }
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8')) as T
  } catch {
    return null
  }
}

export async function getProductsData(): Promise<ProductsData> {
  const data = await readJson<Omit<ProductsData, 'products'> & { products: Omit<Product, 'id'>[] }>('products.json')
  if (!data) return { last_updated: null, total_products: 0, products: [] }
  const products: Product[] = data.products.map((p, i) => ({ ...p, id: String(i) }))
  return { ...data, products }
}

export async function getProductById(id: string): Promise<Product | null> {
  const { products } = await getProductsData()
  return products.find(p => p.id === id) ?? null
}

export function getTrendsData(): Promise<TrendsData | null> {
  return readJson<TrendsData>('trends.json')
}

export async function getNewTodayData(): Promise<NewTodayData> {
  return (await readJson<NewTodayData>('new_today.json')) ?? { date: '', total_products: 0, products: [] }
}

export function getFreshFindsData(): Promise<FreshFindsData | null> {
  return readJson<FreshFindsData>('fresh_finds.json')
}
