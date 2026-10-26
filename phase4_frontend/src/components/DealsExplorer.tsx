'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { GitCompareArrows, SearchX, X } from 'lucide-react'
import type { Product } from '@/types/product'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/cn'
import { categoryMeta } from '@/lib/categories'
import { formatINR } from '@/lib/format'
import ProductCard from './ProductCard'
import CompareModal from './CompareModal'

const SORTS = [
  { value: 'relevance',  label: 'Relevance' },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'discount',   label: 'Discount' },
  { value: 'rating',     label: 'Rating' },
]

const DISCOUNT_STEPS = [0, 30, 50, 70]

export default function DealsExplorer({ products }: { products: Product[] }) {
  const params = useSearchParams()
  const query = (params.get('q') ?? '').trim().toLowerCase()
  const MAX_PRICE = useMemo(
    () => Math.max(1000, Math.ceil(Math.max(...products.map(p => p.price ?? 0)) / 1000) * 1000),
    [products]
  )

  const [category, setCategory] = useState(params.get('category') ?? 'all')
  const [sort, setSort] = useState('relevance')
  const [price, setPrice] = useState<[number, number]>([0, MAX_PRICE])
  const [minDiscount, setMinDiscount] = useState(0)
  const [compare, setCompare] = useState<Product[]>([])
  const [showCompare, setShowCompare] = useState(false)

  // The header's category strip navigates with ?category=..., so follow the URL.
  useEffect(() => { setCategory(params.get('category') ?? 'all') }, [params])

  const toggleCompare = useCallback((p: Product) => {
    setCompare(prev => {
      if (prev.some(x => x.id === p.id)) return prev.filter(x => x.id !== p.id)
      return prev.length >= 2 ? [prev[1], p] : [...prev, p]
    })
  }, [])

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of products) counts.set(p.category, (counts.get(p.category) ?? 0) + 1)
    return Array.from(counts)
  }, [products])

  const visible = useMemo(() => {
    return products
      .filter(p => category === 'all' || p.category === category)
      .filter(p => !query || p.name.toLowerCase().includes(query) || categoryMeta(p.category).label.toLowerCase().includes(query))
      .filter(p => (p.price ?? 0) >= price[0] && (p.price ?? 0) <= price[1])
      .filter(p => (p.discount_percent ?? 0) >= minDiscount)
      .sort((a, b) => {
        switch (sort) {
          case 'price_asc':  return (a.price ?? 0) - (b.price ?? 0)
          case 'price_desc': return (b.price ?? 0) - (a.price ?? 0)
          case 'discount':   return (b.discount_percent ?? 0) - (a.discount_percent ?? 0)
          case 'rating':     return (b.rating ?? 0) - (a.rating ?? 0)
          default:           return b.analysis.quality_score - a.analysis.quality_score || (b.discount_percent ?? 0) - (a.discount_percent ?? 0)
        }
      })
  }, [products, category, query, price, minDiscount, sort])

  const filtersActive = category !== 'all' || price[0] > 0 || price[1] < MAX_PRICE || minDiscount > 0
  const reset = () => { setCategory('all'); setPrice([0, MAX_PRICE]); setMinDiscount(0) }

  return (
    <div className="grid gap-4 lg:grid-cols-[17rem_1fr]">
      {/* Filter panel */}
      <aside className="h-fit bg-card shadow-sm lg:sticky lg:top-36">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-base font-semibold">Filters</h2>
          {filtersActive && <button onClick={reset} className="text-xs font-semibold uppercase text-primary">Clear all</button>}
        </div>

        <section className="border-b px-4 py-3">
          <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Categories</h3>
          <ul className="space-y-1 text-sm">
            <li>
              <button onClick={() => setCategory('all')} className={cn('w-full py-1 text-left', category === 'all' ? 'font-semibold text-primary' : 'hover:text-primary')}>
                All categories ({products.length})
              </button>
            </li>
            {categories.map(([c, n]) => (
              <li key={c}>
                <button onClick={() => setCategory(c)} className={cn('flex w-full items-center justify-between py-1 text-left', category === c ? 'font-semibold text-primary' : 'hover:text-primary')}>
                  <span>{categoryMeta(c).label}</span>
                  <span className="text-xs text-muted-foreground">{n}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-b px-4 py-3">
          <h3 className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Price</h3>
          <Slider min={0} max={MAX_PRICE} step={Math.max(100, Math.round(MAX_PRICE / 200))} value={price} onValueChange={v => setPrice([v[0], v[1]])} />
          <div className="mt-3 flex justify-between text-xs font-medium">
            <span>{formatINR(price[0])}</span>
            <span>{price[1] >= MAX_PRICE ? `${formatINR(MAX_PRICE)}+` : formatINR(price[1])}</span>
          </div>
        </section>

        <section className="px-4 py-3">
          <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Discount</h3>
          <ul className="space-y-1 text-sm">
            {DISCOUNT_STEPS.map(d => (
              <li key={d}>
                <label className="flex cursor-pointer items-center gap-2 py-0.5">
                  <input type="radio" name="discount" checked={minDiscount === d} onChange={() => setMinDiscount(d)} className="accent-primary" />
                  {d === 0 ? 'Any' : `${d}% or more`}
                </label>
              </li>
            ))}
          </ul>
        </section>
      </aside>

      {/* Results */}
      <div className="min-w-0 bg-card shadow-sm">
        <div className="border-b px-4 pt-3">
          <p className="text-sm">
            <span className="font-semibold">{query ? `Showing results for "${params.get('q')}"` : category === 'all' ? 'All deals' : categoryMeta(category).label}</span>
            <span className="ml-2 text-xs text-muted-foreground">({visible.length} products)</span>
          </p>
          <div className="mt-2 flex items-center gap-1 overflow-x-auto text-sm">
            <span className="shrink-0 pr-2 font-semibold">Sort By</span>
            {SORTS.map(s => (
              <button
                key={s.value}
                onClick={() => setSort(s.value)}
                className={cn(
                  'shrink-0 border-b-2 px-3 py-2 transition-colors',
                  sort === s.value ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center text-muted-foreground">
            <SearchX className="h-10 w-10" />
            <p className="text-sm">Sorry, no results found. Try changing your filters or search.</p>
            {filtersActive && <Button variant="outline" size="sm" onClick={reset}>Clear filters</Button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 xl:grid-cols-3 [&>*]:bg-card">
            {visible.map(p => (
              <ProductCard key={p.id} product={p} isInCompare={compare.some(x => x.id === p.id)} onToggleCompare={toggleCompare} />
            ))}
          </div>
        )}
      </div>

      {compare.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 rounded-md border bg-card px-4 py-3 shadow-xl">
          <GitCompareArrows className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex gap-2 overflow-hidden">
            {compare.map(p => (
              <span key={p.id} className="flex max-w-[140px] items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
                <span className="truncate">{p.name.split(' ').slice(0, 3).join(' ')}</span>
                <button onClick={() => toggleCompare(p)} aria-label={`Remove ${p.name}`}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          <Button size="sm" className="bg-primary hover:bg-primary/90" disabled={compare.length < 2} onClick={() => setShowCompare(true)}>
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
