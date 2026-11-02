'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowUpRight, Compass, Layers, Star, TrendingDown } from 'lucide-react'
import type { FreshFind } from '@/types/product'
import type { OpportunityScoredProduct } from '@/lib/intelligence'
import { categoryMeta } from '@/lib/categories'
import { formatINR } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/cn'
import CsvExportButton from './CsvExportButton'

const tooltipStyle = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
  color: 'hsl(var(--popover-foreground))',
}

export default function CategoryIntelligenceView({
  products,
  freshFinds,
}: {
  products: OpportunityScoredProduct[]
  freshFinds: FreshFind[]
}) {
  const params = useSearchParams()
  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category))), [products])
  const initialCat = params.get('category') && categories.includes(params.get('category')!)
    ? params.get('category')!
    : categories[0] ?? 'Mobiles'

  const [selectedCat, setSelectedCat] = useState<string>(initialCat)
  const [compareCat, setCompareCat] = useState<string>(categories[1] ?? categories[0] ?? 'Laptops')

  const catMetrics = useMemo(() => {
    return categories.map(cat => {
      const items = products.filter(p => p.category === cat)
      const priced = items.filter(i => i.price)
      const avgPrice = Math.round(priced.reduce((s, i) => s + (i.price ?? 0), 0) / (priced.length || 1))
      const avgDiscount = Math.round(items.reduce((s, i) => s + (i.discount_percent ?? 0), 0) / (items.length || 1))
      const avgRating =
        Math.round((items.reduce((s, i) => s + (i.rating ?? 4.0), 0) / (items.length || 1)) * 100) / 100
      const highlyRated = items.filter(i => (i.rating ?? 0) >= 4.2).length
      const priceDrops = items.filter(i => (i.price_change ?? 0) < 0).length
      const newAdditions = freshFinds.filter(
        f => f.category === cat || (cat === 'Mobiles' && f.category === 'Electronics')
      ).length
      const avgOppScore =
        Math.round((items.reduce((s, i) => s + i.opportunityScore, 0) / (items.length || 1)) * 10) / 10

      return {
        category: cat,
        label: categoryMeta(cat).label,
        totalProducts: items.length,
        avgPrice,
        avgDiscount,
        avgRating,
        highlyRated,
        priceDrops,
        newAdditions,
        avgOppScore,
      }
    })
  }, [categories, products, freshFinds])

  const activeSummary = catMetrics.find(c => c.category === selectedCat) ?? catMetrics[0]
  const rivalSummary = catMetrics.find(c => c.category === compareCat) ?? catMetrics[1] ?? catMetrics[0]

  const selectedItems = useMemo(
    () => products.filter(p => p.category === selectedCat),
    [products, selectedCat]
  )

  // Compute dynamic price quartiles/brackets inside the selected category
  const priceDistribution = useMemo(() => {
    const prices = selectedItems.map(i => i.price ?? 0).filter(Boolean).sort((a, b) => a - b)
    if (!prices.length) return []
    const min = prices[0]
    const max = prices[prices.length - 1]
    const step = Math.max(100, Math.ceil((max - min) / 4 / 100) * 100)
    return [0, 1, 2, 3].map(idx => {
      const low = min + idx * step
      const high = idx === 3 ? max + 1 : min + (idx + 1) * step
      const count = selectedItems.filter(i => (i.price ?? 0) >= low && (i.price ?? 0) < high).length
      return {
        range: `${formatINR(low)}–${formatINR(idx === 3 ? max : high)}`,
        count,
      }
    })
  }, [selectedItems])

  const comparisonChartData = [
    {
      metric: 'Avg Discount %',
      [activeSummary.label]: activeSummary.avgDiscount,
      [rivalSummary.label]: rivalSummary.avgDiscount,
    },
    {
      metric: 'Rating (x20)',
      [activeSummary.label]: Math.round(activeSummary.avgRating * 20),
      [rivalSummary.label]: Math.round(rivalSummary.avgRating * 20),
    },
    {
      metric: 'Price Drop Share %',
      [activeSummary.label]: Math.round((activeSummary.priceDrops / (activeSummary.totalProducts || 1)) * 100),
      [rivalSummary.label]: Math.round((rivalSummary.priceDrops / (rivalSummary.totalProducts || 1)) * 100),
    },
    {
      metric: 'Opportunity Score',
      [activeSummary.label]: activeSummary.avgOppScore,
      [rivalSummary.label]: rivalSummary.avgOppScore,
    },
  ]

  const highestDiscountCat = [...catMetrics].sort((a, b) => b.avgDiscount - a.avgDiscount)[0]
  const highestRatedCat = [...catMetrics].sort((a, b) => b.avgRating - a.avgRating)[0]
  const mostPriceMovementCat = [...catMetrics].sort((a, b) => b.priceDrops - a.priceDrops)[0]
  const nextFocusCat = [...catMetrics].sort((a, b) => b.avgOppScore - a.avgOppScore)[0]

  return (
    <div className="space-y-6">
      {/* Top 4 Executive Category Questions Answered */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">Highest Discounts</p>
            <p className="mt-1 text-lg font-bold text-primary">{highestDiscountCat?.label}</p>
            <p className="text-xs text-muted-foreground">
              {highestDiscountCat?.avgDiscount}% average listed MRP discount
            </p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20 bg-emerald-500/[0.03]">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">Highest-Rated Products</p>
            <p className="mt-1 text-lg font-bold text-emerald-600">{highestRatedCat?.label}</p>
            <p className="text-xs text-muted-foreground">
              {highestRatedCat?.avgRating}★ avg ({highestRatedCat?.highlyRated} rated 4.2★+)
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20 bg-amber-500/[0.03]">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">Most Price Movement</p>
            <p className="mt-1 text-lg font-bold text-amber-600">{mostPriceMovementCat?.label}</p>
            <p className="text-xs text-muted-foreground">
              {mostPriceMovementCat?.priceDrops} SKUs with observed WoW price cuts
            </p>
          </CardContent>
        </Card>
        <Card className="border-indigo-500/20 bg-indigo-500/[0.03]">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">Next Discovery Focus</p>
            <p className="mt-1 text-lg font-bold text-indigo-600">{nextFocusCat?.label}</p>
            <p className="text-xs text-muted-foreground">
              Highest composite Opportunity Score ({nextFocusCat?.avgOppScore}/100)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Selector Tabs */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4 text-primary" />
                Category Deep-Dive: {activeSummary.label}
              </CardTitle>
              <CardDescription>
                Select any category to inspect its pricing structure, rating health, price drops, and price distribution.
              </CardDescription>
            </div>
            <CsvExportButton
              filename="flipkart_category_intelligence_report"
              label="Export Category Report CSV"
              rows={catMetrics}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {catMetrics.map(c => (
              <button
                key={c.category}
                onClick={() => setSelectedCat(c.category)}
                className={cn(
                  'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                  selectedCat === c.category
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-muted/40 text-muted-foreground hover:text-foreground'
                )}
              >
                {c.label} ({c.totalProducts})
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 7 Category KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <div className="rounded-lg border p-3">
              <p className="text-[11px] text-muted-foreground">Total Discovered</p>
              <p className="mt-1 text-xl font-bold">{activeSummary.totalProducts}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-[11px] text-muted-foreground">Avg Selling Price</p>
              <p className="mt-1 text-xl font-bold">{formatINR(activeSummary.avgPrice)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-[11px] text-muted-foreground">Avg Listed Discount</p>
              <p className="mt-1 text-xl font-bold text-primary">{activeSummary.avgDiscount}%</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-[11px] text-muted-foreground">Avg Customer Rating</p>
              <p className="mt-1 flex items-center gap-1 text-xl font-bold">
                {activeSummary.avgRating} <Star className="h-4 w-4 fill-warning text-warning" />
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-[11px] text-muted-foreground">Highly Rated (4.2★+)</p>
              <p className="mt-1 text-xl font-bold text-success">{activeSummary.highlyRated}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-[11px] text-muted-foreground">Recent Price Drops</p>
              <p className="mt-1 flex items-center gap-1 text-xl font-bold text-success">
                <TrendingDown className="h-4 w-4" />
                {activeSummary.priceDrops}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-[11px] text-muted-foreground">New Additions</p>
              <p className="mt-1 text-xl font-bold">{activeSummary.newAdditions}</p>
            </div>
          </div>

          {/* Price Distribution Chart inside Selected Category + Top SKUs */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="text-sm font-semibold">Price Distribution in {activeSummary.label}</p>
              <p className="mb-3 text-xs text-muted-foreground">
                Number of discovered products in each price tier within {activeSummary.label}.
              </p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priceDistribution} margin={{ left: 0, right: 12 }}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="range"
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                    />
                    <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v} SKUs`, 'Products']} />
                    <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Top Opportunity SKUs in {activeSummary.label}</p>
                  <p className="text-xs text-muted-foreground">Ranked by composite Opportunity Score.</p>
                </div>
                <Link
                  href={`/deals?category=${encodeURIComponent(selectedCat)}`}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Explore all <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <ul className="divide-y text-xs">
                {[...selectedItems]
                  .sort((a, b) => b.opportunityScore - a.opportunityScore)
                  .slice(0, 5)
                  .map(item => (
                    <li key={item.id} className="flex items-center justify-between gap-2 py-2.5">
                      <Link href={`/product/${item.id}`} className="truncate font-medium hover:text-primary">
                        {item.name}
                      </Link>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-semibold tabular-nums">{formatINR(item.price)}</span>
                        <Badge variant="secondary">Score {item.opportunityScore}</Badge>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Head-to-Head Category Comparison Tool */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Compass className="h-4 w-4 text-primary" />
                Category Comparison Tool
              </CardTitle>
              <CardDescription>
                Compare any two categories side-by-side across discounts, ratings, price movements, and opportunity scores.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <select
                value={selectedCat}
                onChange={e => setSelectedCat(e.target.value)}
                className="h-8 rounded-md border bg-background px-2.5 font-medium"
              >
                {catMetrics.map(c => (
                  <option key={c.category} value={c.category}>
                    {c.label}
                  </option>
                ))}
              </select>
              <span className="font-semibold text-muted-foreground">vs.</span>
              <select
                value={compareCat}
                onChange={e => setCompareCat(e.target.value)}
                className="h-8 rounded-md border bg-background px-2.5 font-medium"
              >
                {catMetrics.map(c => (
                  <option key={c.category} value={c.category}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonChartData} margin={{ left: 0, right: 12 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="metric"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={34}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey={activeSummary.label} fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey={rivalSummary.label} fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-y bg-muted/40 text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Dimension</th>
                  <th className="px-3 py-2 text-right font-semibold text-primary">{activeSummary.label}</th>
                  <th className="px-3 py-2 text-right font-semibold text-amber-600">{rivalSummary.label}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-3 py-2">Total Products Discovered</td>
                  <td className="px-3 py-2 text-right font-medium">{activeSummary.totalProducts}</td>
                  <td className="px-3 py-2 text-right font-medium">{rivalSummary.totalProducts}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Average Selling Price</td>
                  <td className="px-3 py-2 text-right font-medium">{formatINR(activeSummary.avgPrice)}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatINR(rivalSummary.avgPrice)}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Average Listed Discount</td>
                  <td className="px-3 py-2 text-right font-medium">{activeSummary.avgDiscount}%</td>
                  <td className="px-3 py-2 text-right font-medium">{rivalSummary.avgDiscount}%</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Average Customer Rating</td>
                  <td className="px-3 py-2 text-right font-medium">{activeSummary.avgRating} ★</td>
                  <td className="px-3 py-2 text-right font-medium">{rivalSummary.avgRating} ★</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Highly Rated Products (4.2★+)</td>
                  <td className="px-3 py-2 text-right font-medium">{activeSummary.highlyRated}</td>
                  <td className="px-3 py-2 text-right font-medium">{rivalSummary.highlyRated}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Products With Observed Price Drops</td>
                  <td className="px-3 py-2 text-right font-medium text-success">{activeSummary.priceDrops}</td>
                  <td className="px-3 py-2 text-right font-medium text-success">{rivalSummary.priceDrops}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Composite Opportunity Score</td>
                  <td className="px-3 py-2 text-right font-bold">{activeSummary.avgOppScore}/100</td>
                  <td className="px-3 py-2 text-right font-bold">{rivalSummary.avgOppScore}/100</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

