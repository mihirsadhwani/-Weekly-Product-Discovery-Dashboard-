'use client'

import { useCallback, useMemo, useState } from 'react'
import { GitCompareArrows, SearchX, X } from 'lucide-react'
import type { Product } from '@/types/product'
import { SORT_OPTIONS } from '@/types/product'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { categoryMeta } from '@/lib/categories'
import { formatINR } from '@/lib/format'
import ProductCard from './ProductCard'
import CompareModal from './CompareModal'

const MAX_PRICE = 50_000

/** Above-average quality at below-average price within each category. */
function valueForMoneyIds(products: Product[]): Set<string> {
  const groups: Record<string, Product[]> = {}
  for (const p of products) (groups[p.category] ??= []).push(p)

  const ids = new Set<string>()
  for (const items of Object.values(groups)) {
    const priced = items.filter(p => p.price !== null)
    const avgPrice = priced.reduce((s, p) => s + p.price!, 0) / (priced.length || 1)
    const avgQuality = items.reduce((s, p) => s + p.analysis.quality_score, 0) / items.length
    for (const p of items) {
      if ((p.price ?? Infinity) < avgPrice && p.analysis.quality_score > avgQuality && p.analysis.sentiment_score >= 70) ids.add(p.id)
    }
  }
  return ids
}

export default function DealsExplorer({ products }: { products: Product[] }) {
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('quality_score')
  const [price, setPrice] = useState<[number, number]>([0, MAX_PRICE])
  const [compare, setCompare] = useState<Product[]>([])
  const [showCompare, setShowCompare] = useState(false)

  const toggleCompare = useCallback((p: Product) => {
    setCompare(prev => {
      if (prev.some(x => x.id === p.id)) return prev.filter(x => x.id !== p.id)
      return prev.length >= 2 ? [prev[1], p] : [...prev, p]
    })
  }, [])

  const vfmIds = useMemo(() => valueForMoneyIds(products), [products])
  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category))), [products])

  const visible = useMemo(() => {
    return products
      .filter(p => category === 'all' || (category === 'vfm' ? vfmIds.has(p.id) : p.category === category))
      .filter(p => (p.price ?? 0) >= price[0] && (p.price ?? 0) <= price[1])
      .sort((a, b) => {
        switch (sort) {
          case 'quality_score': return b.analysis.quality_score - a.analysis.quality_score || (b.discount_percent ?? 0) - (a.discount_percent ?? 0)
          case 'reviews':       return (b.review_count ?? 0) - (a.review_count ?? 0)
          case 'price_asc':     return (a.price ?? 0) - (b.price ?? 0)
          case 'price_desc':    return (b.price ?? 0) - (a.price ?? 0)
          default:              return 0
        }
      })
  }, [products, category, price, sort, vfmIds])

  const priceFiltered = price[0] > 0 || price[1] < MAX_PRICE

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto pb-1">
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList>
            <TabsTrigger value="all">All ({products.length})</TabsTrigger>
            {vfmIds.size > 0 && <TabsTrigger value="vfm">Best value ({vfmIds.size})</TabsTrigger>}
            {categories.map(c => {
              const meta = categoryMeta(c)
              return (
                <TabsTrigger key={c} value={c}>
                  <meta.icon />
                  {meta.label}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
        <div className="flex-1 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Price range</span>
            <span className="font-medium text-foreground">
              {formatINR(price[0])} – {price[1] >= MAX_PRICE ? `${formatINR(MAX_PRICE)}+` : formatINR(price[1])}
            </span>
          </div>
          <Slider min={0} max={MAX_PRICE} step={500} value={price} onValueChange={v => setPrice([v[0], v[1]])} />
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="sort" className="text-xs text-muted-foreground">Sort by</label>
          <select
            id="sort"
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <Badge variant="secondary">{visible.length} results</Badge>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-20 text-center text-muted-foreground">
          <SearchX className="h-8 w-8" />
          <p className="text-sm">No products match your filters.</p>
          {(category !== 'all' || priceFiltered) && (
            <Button variant="outline" size="sm" onClick={() => { setCategory('all'); setPrice([0, MAX_PRICE]) }}>Reset filters</Button>
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map(p => (
            <ProductCard key={p.id} product={p} isInCompare={compare.some(x => x.id === p.id)} onToggleCompare={toggleCompare} />
          ))}
        </div>
      )}

      {compare.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-xl lg:left-[calc(50%+8rem)]">
          <GitCompareArrows className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex gap-2 overflow-hidden">
            {compare.map(p => (
              <span key={p.id} className="flex max-w-[140px] items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
                <span className="truncate">{p.name.split(' ').slice(0, 3).join(' ')}</span>
                <button onClick={() => toggleCompare(p)} aria-label={`Remove ${p.name}`}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          <Button size="sm" disabled={compare.length < 2} onClick={() => setShowCompare(true)}>
            {compare.length < 2 ? 'Pick one more' : 'Compare'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCompare([])}>Clear</Button>
        </div>
      )}

      {compare.length === 2 && (
        <CompareModal open={showCompare} onOpenChange={setShowCompare} productA={compare[0]} productB={compare[1]} />
      )}
    </div>
  )
}
