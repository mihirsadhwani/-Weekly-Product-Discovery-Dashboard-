'use client'

import { useState, useMemo, useCallback } from 'react'
import type { ProductsData, NewTodayData, Product, TrendsData, FreshFindsData } from '@/types/product'
import Header from './Header'
import TrendsSection from './TrendsSection'
import CategoryTabs from './CategoryTabs'
import FilterBar from './FilterBar'
import ProductCard from './ProductCard'
import SimpleProductCard from './SimpleProductCard'
import FreshFindCard from './FreshFindCard'
import CompareModal from './CompareModal'
import BackToTop from './BackToTop'

interface Props {
  data: ProductsData
  newToday?: NewTodayData
  trends?: TrendsData | null
  freshFinds?: FreshFindsData | null
}

const MAX_PRICE = 50_000

function buildVfmData(products: Product[]) {
  const groups: Record<string, Product[]> = {}
  for (const p of products) {
    groups[p.category] ??= []
    groups[p.category].push(p)
  }

  const stats: Record<string, { avgPrice: number; avgQuality: number }> = {}
  for (const [cat, prods] of Object.entries(groups)) {
    const withPrice = prods.filter(p => p.price !== null)
    stats[cat] = {
      avgPrice:   withPrice.reduce((s, p) => s + p.price!, 0) / (withPrice.length || 1),
      avgQuality: prods.reduce((s, p) => s + p.analysis.quality_score, 0) / prods.length,
    }
  }

  const check = (p: Product) => {
    const s = stats[p.category]
    return !!(s && (p.price ?? Infinity) < s.avgPrice && p.analysis.quality_score > s.avgQuality && p.analysis.sentiment_score >= 70)
  }

  const sorted = products
    .filter(check)
    .sort((a, b) => {
      const va = a.price ? (a.analysis.quality_score / a.price) * 1000 : 0
      const vb = b.price ? (b.analysis.quality_score / b.price) * 1000 : 0
      return vb - va
    })

  return { vfmProducts: sorted, vfmIds: new Set(sorted.map(p => p.id)) }
}

export default function ProductDashboard({ data, newToday, trends, freshFinds }: Props) {
  const [category, setCategory]         = useState('All')
  const [sort, setSort]                 = useState('quality_score')
  const [priceRange, setPriceRange]     = useState<[number, number]>([0, MAX_PRICE])
  const [compareItems, setCompareItems] = useState<Product[]>([])
  const [showCompare, setShowCompare]   = useState(false)

  const toggleCompare = useCallback((product: Product) => {
    setCompareItems(prev => {
      if (prev.find(p => p.id === product.id)) return prev.filter(p => p.id !== product.id)
      if (prev.length >= 2) return [prev[1], product]
      return [...prev, product]
    })
  }, [])

  const { vfmProducts, vfmIds } = useMemo(
    () => buildVfmData(data.products),
    [data.products]
  )

  const filtered = useMemo(() => {
    return data.products
      .filter(p => {
        if (category === 'All') return true
        if (category === 'vfm') return vfmIds.has(p.id)
        return p.category === category
      })
      .filter(p => (p.price ?? 0) >= priceRange[0] && (p.price ?? MAX_PRICE) <= priceRange[1])
      .sort((a, b) => {
        switch (sort) {
          case 'quality_score': return b.analysis.quality_score - a.analysis.quality_score
          case 'reviews':       return (b.review_count ?? 0) - (a.review_count ?? 0)
          case 'price_asc':     return (a.price ?? 0) - (b.price ?? 0)
          case 'price_desc':    return (b.price ?? 0) - (a.price ?? 0)
          default:              return 0
        }
      })
  }, [data.products, category, sort, priceRange])

  const categories = useMemo(
    () => Array.from(new Set(data.products.map(p => p.category))),
    [data.products]
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <Header lastUpdated={data.last_updated} productCount={data.total_products} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Fresh Finds (with quick AI) or Just Launched Today (fallback) */}
        {freshFinds && freshFinds.products.length > 0 ? (
          <section className="mb-12">
            <SectionHeader
              title="⚡ Fresh Finds"
              subtitle="Daily picks with quick AI insights — deep analysis every Sunday"
              badge={`${freshFinds.products.length} today`}
              accent="amber"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-5">
              {freshFinds.products.map((product, i) => (
                <FreshFindCard key={i} product={product} />
              ))}
            </div>
          </section>
        ) : newToday && newToday.products.length > 0 && (
          <section className="mb-12">
            <SectionHeader
              title="Just Launched Today"
              subtitle="Fresh arrivals — full AI analysis coming Sunday"
              badge={`${newToday.products.length} new`}
              accent="blue"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-5">
              {newToday.products.map((product, i) => (
                <SimpleProductCard key={i} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* Market Trends */}
        <TrendsSection trends={trends ?? null} />

        {/* Value for Money */}
        {vfmProducts.length > 0 && (
          <section className="mb-12 bg-gradient-to-r from-orange-50 via-amber-50 to-red-50 p-6 sm:p-8 rounded-2xl border border-orange-200">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-gray-900">
                💰 Best Value for Money
              </h2>
              <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                Best Value
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Above-average quality at below-average prices within each category · Smart picks across all budgets
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {vfmProducts.slice(0, 8).map((product, i) => (
                <div key={product.id} className="card-enter" style={{ animationDelay: `${i * 40}ms` }}>
                  <ProductCard
                    product={product}
                    isInCompare={compareItems.some(p => p.id === product.id)}
                    onToggleCompare={toggleCompare}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* This Week's Best */}
        <SectionHeader
          title="This Week's Best"
          subtitle={`AI-analyzed · ${data.total_products} curated products from Flipkart`}
          accent="indigo"
        />

        <div className="mt-5">
          <CategoryTabs
            categories={categories}
            selected={category}
            onChange={setCategory}
          />
        </div>

        <FilterBar
          sort={sort}
          onSort={setSort}
          priceRange={priceRange}
          onPriceRange={setPriceRange}
          maxPrice={MAX_PRICE}
          resultCount={filtered.length}
        />

        {filtered.length === 0 ? (
          <EmptyState
            hasFilters={category !== 'All'}
            onReset={() => { setCategory('All'); setPriceRange([0, MAX_PRICE]) }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mt-6">
            {filtered.map((product, i) => (
              <div
                key={product.id}
                className="card-enter"
                style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
              >
                <ProductCard
                  product={product}
                  isInCompare={compareItems.some(p => p.id === product.id)}
                  onToggleCompare={toggleCompare}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      <BackToTop />

      {/* Floating Compare Bar */}
      {compareItems.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 animate-fade-in">
          <span className="text-sm font-semibold text-slate-300">
            {compareItems.length === 1 ? 'Select 1 more to compare' : 'Ready to compare'}
          </span>
          <div className="flex gap-2">
            {compareItems.map(p => (
              <span key={p.id} className="flex items-center gap-1.5 bg-slate-700 px-2.5 py-1 rounded-full text-xs font-medium max-w-[120px]">
                <span className="truncate">{p.name.split(' ').slice(0, 3).join(' ')}</span>
                <button
                  onClick={() => toggleCompare(p)}
                  className="shrink-0 text-slate-400 hover:text-white transition-colors"
                >✕</button>
              </span>
            ))}
          </div>
          <button
            disabled={compareItems.length < 2}
            onClick={() => setShowCompare(true)}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors"
          >
            Compare →
          </button>
          <button
            onClick={() => setCompareItems([])}
            className="text-slate-400 hover:text-white text-xs transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Compare Modal */}
      {showCompare && compareItems.length === 2 && (
        <CompareModal
          productA={compareItems[0]}
          productB={compareItems[1]}
          onClose={() => setShowCompare(false)}
        />
      )}
    </div>
  )
}

function SectionHeader({
  title, subtitle, badge, accent,
}: {
  title: string
  subtitle: string
  badge?: string
  accent: 'blue' | 'indigo' | 'amber'
}) {
  const line = accent === 'indigo' ? 'bg-indigo-500' : accent === 'amber' ? 'bg-amber-400' : 'bg-blue-500'
  const badgeCls = accent === 'indigo'
    ? 'bg-indigo-100 text-indigo-700'
    : accent === 'amber'
    ? 'bg-amber-100 text-amber-700'
    : 'bg-blue-100 text-blue-700'

  return (
    <div className="flex items-start gap-3">
      <div className={`w-1 h-10 rounded-full ${line} shrink-0 mt-0.5`} />
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{title}</h2>
          {badge && (
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${badgeCls}`}>
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  )
}

function EmptyState({ hasFilters, onReset }: { hasFilters: boolean; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
        <span className="text-4xl">🔍</span>
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-2">
        {hasFilters ? 'No products match your filters' : 'No products yet'}
      </h3>
      <p className="text-sm text-slate-500 mb-6 max-w-sm">
        {hasFilters
          ? 'Try adjusting your category or price range.'
          : 'Products will appear here after the next weekly scrape runs on Saturday.'}
      </p>
      {hasFilters && (
        <button
          onClick={onReset}
          className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          Reset all filters
        </button>
      )}
    </div>
  )
}
