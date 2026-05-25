'use client'

import { SORT_OPTIONS } from '@/types/product'
import PriceSlider from './PriceSlider'

interface Props {
  sort: string
  onSort: (v: string) => void
  priceRange: [number, number]
  onPriceRange: (v: [number, number]) => void
  maxPrice: number
  resultCount: number
}

export default function FilterBar({ sort, onSort, priceRange, onPriceRange, maxPrice, resultCount }: Props) {
  return (
    <div className="mt-3 bg-white border border-slate-100 rounded-2xl px-5 py-3.5 flex flex-wrap items-center gap-4 shadow-card">

      {/* Result count */}
      <span className="text-sm font-bold text-slate-700 shrink-0">
        {resultCount}
        <span className="font-normal text-slate-400 ml-1">{resultCount === 1 ? 'product' : 'products'}</span>
      </span>

      <div className="h-4 w-px bg-slate-200 hidden sm:block" />

      {/* Sort */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">Sort</label>
        <select
          value={sort}
          onChange={e => onSort(e.target.value)}
          className="text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="h-4 w-px bg-slate-200 hidden sm:block" />

      {/* Price slider */}
      <div className="flex items-center gap-3 flex-1 min-w-[200px] max-w-xs">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">Price</span>
        <PriceSlider
          min={0}
          max={maxPrice}
          value={priceRange}
          onChange={onPriceRange}
        />
      </div>

    </div>
  )
}
