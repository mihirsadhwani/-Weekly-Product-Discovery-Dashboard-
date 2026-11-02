'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowDownRight, ArrowUpRight, Award, Calendar, Info, Minus, Search } from 'lucide-react'
import type { OpportunityScoredProduct } from '@/lib/intelligence'
import { categoryMeta } from '@/lib/categories'
import { formatINR, trustedOriginalPrice } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/cn'
import CsvExportButton from './CsvExportButton'

type FilterMode = 'all' | 'dropped' | 'increased' | 'lowest6w' | 'vfm'

export default function PriceComparisonExplorer({ products }: { products: OpportunityScoredProduct[] }) {
  const [category, setCategory] = useState<string>('all')
  const [mode, setMode] = useState<FilterMode>('all')
  const [search, setSearch] = useState('')

  const categories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category)))
  }, [products])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products
      .filter(p => category === 'all' || p.category === category)
      .filter(p => !q || p.name.toLowerCase().includes(q))
      .filter(p => {
        const diff = p.price_change ?? 0
        if (mode === 'dropped') return diff < 0
        if (mode === 'increased') return diff > 0
        if (mode === 'lowest6w') return (p.price ?? 0) <= (p.lowest_price_6w ?? p.price ?? 0)
        if (mode === 'vfm') return Boolean(p.is_vfm)
        return true
      })
      .sort((a, b) => (a.price_change_pct ?? 0) - (b.price_change_pct ?? 0))
  }, [products, category, mode, search])

  const csvRows = filtered.map(p => ({
    Product_Name: p.name,
    Category: categoryMeta(p.category).label,
    Previous_Price_INR: p.previous_price,
    Current_Price_INR: p.price,
    Observed_Reduction_INR: (p.previous_price ?? 0) - (p.price ?? 0),
    Observed_Change_Pct: p.price_change_pct,
    First_Observed_Reduction_Date: p.firstObservedDropDate,
    Displayed_MRP_INR: p.original_price,
    Displayed_MRP_Discount_Pct: p.discount_percent,
    Six_Week_Low_INR: p.lowest_price_6w,
  }))

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">
              Observed Price Movement vs. Displayed MRP Discount (Pehle vs. Aaj)
            </CardTitle>
            <CardDescription>
              Tracks actual week-over-week price reductions, absolute ₹ change, and first observed date — separated from static MRP discount badges.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-60">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search SKU or brand..."
                className="h-9 w-full rounded-md border bg-background pl-8 pr-3 text-xs outline-none focus:border-primary"
              />
            </div>
            <CsvExportButton filename="flipkart_price_intelligence" label="Export Price CSV" rows={csvRows} />
          </div>
        </div>

        {/* PM Insight Note */}
        <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="leading-relaxed text-foreground/90">
            <span className="font-semibold text-primary">PM &amp; BA Methodology Note:</span> Flipkart&apos;s displayed{' '}
            <span className="font-medium">MRP Discount %</span> reflects the gap against static sticker MRP, whereas{' '}
            <span className="font-medium">Observed Reduction (Pehle vs. Aaj)</span> measures actual week-over-week selling price movement. Category teams use observed price drops to detect competitor promotions or inventory clearance.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {(
            [
              { id: 'all', label: 'All Tracked SKUs' },
              { id: 'dropped', label: 'Observed Price Drop (Pehle > Aaj)' },
              { id: 'lowest6w', label: 'At 6-Week Lowest Price' },
              { id: 'vfm', label: 'Certified VFM Picks' },
              { id: 'increased', label: 'Observed Price Increase' },
            ] as { id: FilterMode; label: string }[]
          ).map(btn => (
            <button
              key={btn.id}
              onClick={() => setMode(btn.id)}
              className={cn(
                'rounded-full border px-3 py-1 font-medium transition-colors',
                mode === btn.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-muted/40 text-muted-foreground hover:text-foreground'
              )}
            >
              {btn.label}
            </button>
          ))}

          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="ml-auto h-7 rounded-md border bg-background px-2 text-xs"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>
                {categoryMeta(c).label}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="max-h-[540px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-y bg-muted/90 backdrop-blur">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Product</th>
                <th className="px-3 py-2.5 font-medium">Category</th>
                <th className="px-3 py-2.5 text-right font-medium">Previous (Pehle)</th>
                <th className="px-3 py-2.5 text-right font-medium">Current (Aaj)</th>
                <th className="px-3 py-2.5 text-right font-medium">Observed Change</th>
                <th className="px-3 py-2.5 text-right font-medium">MRP Badge</th>
                <th className="px-4 py-2.5 text-right font-medium">First Observed</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(p => {
                const meta = categoryMeta(p.category)
                const mrp = trustedOriginalPrice(p.price, p.original_price, p.discount_percent)
                const pehle = p.previous_price ?? p.price ?? 0
                const aaj = p.price ?? 0
                const diff = aaj - pehle
                const diffPct = p.price_change_pct ?? 0

                return (
                  <tr key={p.id} className="hover:bg-muted/40">
                    <td className="max-w-[250px] px-4 py-2.5">
                      <Link
                        href={`/product/${p.id}`}
                        className="line-clamp-1 font-medium hover:text-primary hover:underline"
                      >
                        {p.name}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span>6W Low: {formatINR(p.lowest_price_6w ?? aaj)}</span>
                        {p.is_vfm && (
                          <span className="inline-flex items-center gap-0.5 font-semibold text-success">
                            <Award className="h-3 w-3" /> VFM {p.vfm_score}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{meta.label}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium text-muted-foreground">
                      {formatINR(pehle)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-foreground">
                      {formatINR(aaj)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {diff < 0 ? (
                        <Badge variant="success" className="gap-0.5 text-[11px]">
                          <ArrowDownRight className="h-3 w-3" />-{formatINR(Math.abs(diff))} ({Math.abs(diffPct)}%)
                        </Badge>
                      ) : diff > 0 ? (
                        <Badge variant="warning" className="gap-0.5 text-[11px]">
                          <ArrowUpRight className="h-3 w-3" />+{formatINR(diff)} (+{diffPct}%)
                        </Badge>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Minus className="h-3 w-3" /> 0%
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs text-muted-foreground">
                      {p.discount_percent ? `${p.discount_percent}% off` : '–'}
                      {mrp ? <span className="block text-[10px] line-through">{formatINR(mrp)}</span> : null}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {p.firstObservedDropDate}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
