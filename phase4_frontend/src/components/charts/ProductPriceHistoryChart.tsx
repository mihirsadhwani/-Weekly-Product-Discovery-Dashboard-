'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowDownRight, ArrowUpRight, Minus, Sparkles, TrendingDown } from 'lucide-react'
import type { PriceHistoryPoint, PricePrediction } from '@/types/product'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatINR, formatINRCompact } from '@/lib/format'

interface Props {
  price: number | null
  originalPrice: number | null
  previousPrice?: number | null
  priceChange?: number | null
  priceChangePct?: number | null
  lowestPrice6w?: number | null
  highestPrice6w?: number | null
  history?: PriceHistoryPoint[]
  prediction?: PricePrediction | null
  benchmark: {
    productQuality: number
    categoryAvgQuality: number
    productVfm: number
    categoryAvgVfm: number
    productDiscount: number
    categoryAvgDiscount: number
    productRatingPct: number
    categoryAvgRatingPct: number
  }
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
  color: 'hsl(var(--popover-foreground))',
}

export default function ProductPriceHistoryChart({
  price,
  originalPrice,
  previousPrice,
  priceChange,
  priceChangePct,
  lowestPrice6w,
  highestPrice6w,
  history = [],
  prediction,
  benchmark,
}: Props) {
  const curPrice = price ?? 0
  const prevPrice = previousPrice ?? curPrice
  const diff = priceChange ?? (curPrice - prevPrice)
  const diffPct = priceChangePct ?? (prevPrice ? Math.round(((curPrice - prevPrice) / prevPrice) * 1000) / 10 : 0)
  const mrpSaving = originalPrice && originalPrice > curPrice ? originalPrice - curPrice : 0

  const benchmarkRows = [
    {
      metric: 'AI Quality',
      Product: Math.round(benchmark.productQuality),
      'Category Avg': Math.round(benchmark.categoryAvgQuality),
    },
    {
      metric: 'VFM Score',
      Product: Math.round(benchmark.productVfm),
      'Category Avg': Math.round(benchmark.categoryAvgVfm),
    },
    {
      metric: 'Discount %',
      Product: Math.round(benchmark.productDiscount),
      'Category Avg': Math.round(benchmark.categoryAvgDiscount),
    },
    {
      metric: 'Rating (x20)',
      Product: Math.round(benchmark.productRatingPct),
      'Category Avg': Math.round(benchmark.categoryAvgRatingPct),
    },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* 6-Week Price History ("Pehle vs Aaj") */}
      <Card className="lg:col-span-2">
        <CardHeader className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4 text-primary" />
              Price History &amp; Before vs. Today Comparison (Pehle vs. Aaj)
            </CardTitle>
            {diff < 0 ? (
              <Badge variant="success" className="gap-1">
                <ArrowDownRight className="h-3.5 w-3.5" />
                Dropped {formatINR(Math.abs(diff))} ({Math.abs(diffPct)}%) vs Last Week
              </Badge>
            ) : diff > 0 ? (
              <Badge variant="warning" className="gap-1">
                <ArrowUpRight className="h-3.5 w-3.5" />
                Up {formatINR(diff)} (+{diffPct}%) vs Last Week
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Minus className="h-3.5 w-3.5" />
                Unchanged vs Last Week
              </Badge>
            )}
          </div>
          <CardDescription>
            6-week price trajectory comparing MRP, prior weeks, last week (Pehle), and today&apos;s deal price (Aaj).
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Before vs Today Summary KPI Strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-[11px] font-medium uppercase text-muted-foreground">MRP (Original)</p>
              <p className="mt-1 text-lg font-semibold tabular-nums line-through text-muted-foreground">
                {originalPrice ? formatINR(originalPrice) : 'N/A'}
              </p>
              {mrpSaving > 0 && (
                <p className="text-[11px] font-medium text-success">Save {formatINR(mrpSaving)} off MRP</p>
              )}
            </div>

            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-[11px] font-medium uppercase text-muted-foreground">Pehle (Last Week)</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{formatINR(prevPrice)}</p>
              <p className="text-[11px] text-muted-foreground">Prior weekly snapshot</p>
            </div>

            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="text-[11px] font-semibold uppercase text-primary">Aaj (Today&apos;s Price)</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-primary">{formatINR(curPrice)}</p>
              <p className="text-[11px] font-medium text-muted-foreground">
                {diff < 0
                  ? `${formatINR(Math.abs(diff))} cheaper than last week`
                  : diff > 0
                  ? `${formatINR(diff)} higher than last week`
                  : 'Same as last week'}
              </p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-[11px] font-medium uppercase text-muted-foreground">6-Week Low / High</p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {formatINR(lowestPrice6w ?? curPrice)} – {formatINR(highestPrice6w ?? prevPrice)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {curPrice <= (lowestPrice6w ?? curPrice) ? 'At 6-week lowest price!' : 'Within 6-week range'}
              </p>
            </div>
          </div>

          {/* 6-Week Area Chart */}
          {history.length > 0 && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatINRCompact}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    width={58}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val, name) => [
                      formatINR(Number(val)),
                      name === 'price' ? 'Selling Price' : 'MRP',
                    ]}
                  />
                  {lowestPrice6w ? (
                    <ReferenceLine
                      y={lowestPrice6w}
                      stroke="#16a34a"
                      strokeDasharray="4 4"
                      label={{
                        value: `6W Low: ${formatINRCompact(lowestPrice6w)}`,
                        position: 'insideBottomRight',
                        fill: '#16a34a',
                        fontSize: 11,
                      }}
                    />
                  ) : null}
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#priceGradient)"
                    dot={{ r: 4, fill: '#2563eb' }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* AI Price Forecast Banner */}
          {prediction && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 px-4 py-2.5 text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Price Forecast ({prediction.timeframe}):
              </span>
              <span className="text-muted-foreground">
                {prediction.likely
                  ? `Expected to drop ${prediction.estimated_drop_pct} (${prediction.confidence} confidence) due to category price competition.`
                  : `Price expected to remain stable (${prediction.estimated_drop_pct} variance) — good window to buy.`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product vs Category Benchmark Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Product vs. Category Benchmark</CardTitle>
          <CardDescription>How this item scores against its category peers (0–100 scale).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={benchmarkRows} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="metric"
                  width={84}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Product" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={12} />
                <Bar dataKey="Category Avg" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

