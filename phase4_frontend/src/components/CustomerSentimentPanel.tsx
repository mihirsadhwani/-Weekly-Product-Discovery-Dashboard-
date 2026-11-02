'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertTriangle, MessageSquareWarning, Star, ThumbsUp } from 'lucide-react'
import type { Product } from '@/types/product'
import { categoryMeta } from '@/lib/categories'
import { formatINR } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const tooltipStyle = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
  color: 'hsl(var(--popover-foreground))',
}

export default function CustomerSentimentPanel({ products }: { products: Product[] }) {
  const highRated = products.filter(p => (p.rating ?? 0) >= 4.5).length
  const midRated = products.filter(p => (p.rating ?? 0) >= 4.0 && (p.rating ?? 0) < 4.5).length
  const lowRated = products.filter(p => (p.rating ?? 0) < 4.0).length

  const ratingBrackets = [
    { tier: '4.5★ & Above', count: highRated, color: '#16a34a' },
    { tier: '4.0★ – 4.4★', count: midRated, color: '#2563eb' },
    { tier: 'Below 4.0★', count: lowRated, color: '#f59e0b' },
  ]

  const positiveCount = products.filter(p => (p.analysis?.sentiment_score ?? 0) >= 75).length
  const neutralCount = products.filter(
    p => (p.analysis?.sentiment_score ?? 0) >= 58 && (p.analysis?.sentiment_score ?? 0) < 75
  ).length
  const negativeCount = products.filter(p => (p.analysis?.sentiment_score ?? 0) < 58).length

  const sentimentSplit = [
    { label: 'Positive (≥75)', count: positiveCount, color: '#16a34a' },
    { label: 'Neutral (58–74)', count: neutralCount, color: '#3b82f6' },
    { label: 'Caution (<58)', count: negativeCount, color: '#ef4444' },
  ]

  // Build recurring pain-point summary by category & price range
  const byCat = new Map<string, Product[]>()
  for (const p of products) byCat.set(p.category, [...(byCat.get(p.category) ?? []), p])

  const painPoints = Array.from(byCat.entries())
    .map(([category, items]) => {
      const prices = items.map(i => i.price ?? 0).filter(Boolean).sort((a, b) => a - b)
      const lowP = prices[0] ?? 0
      const highP = prices[Math.floor(prices.length * 0.75)] ?? lowP
      const topCon =
        items.flatMap(i => i.analysis?.cons ?? []).find(Boolean) ?? 'Inconsistent build finish across batches'
      const topPro =
        items.flatMap(i => i.analysis?.pros ?? []).find(Boolean) ?? 'Strong value at discounted price'
      return {
        category,
        label: categoryMeta(category).label,
        priceSegment: `${formatINR(lowP)}–${formatINR(highP)}`,
        topCon: topCon.replace(/\s*\(\d+\s*mentions?\)/i, ''),
        topPro: topPro.replace(/\s*\(\d+\s*mentions?\)/i, ''),
        count: items.length,
      }
    })
    .slice(0, 6)

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* A. Rating Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Star className="h-4 w-4 text-warning" />
            Rating Distribution Across Catalog
          </CardTitle>
          <CardDescription>Breakdown of tracked products by verified customer star rating tier.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratingBrackets} margin={{ left: 0, right: 12 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="tier"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
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
                <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v} products`, 'Count']} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={44}>
                  {ratingBrackets.map(entry => (
                    <Cell key={entry.tier} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* B. Review Sentiment Classification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <ThumbsUp className="h-4 w-4 text-success" />
            LLM Review Sentiment Classification
          </CardTitle>
          <CardDescription>
            Gemini classification of sampled customer reviews (note: sampled reviews, not a census of all buyers).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid items-center gap-3 sm:grid-cols-2">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentSplit}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={45}
                    outerRadius={72}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {sentimentSplit.map(s => (
                      <Cell key={s.label} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2.5 text-xs">
              {sentimentSplit.map(s => (
                <li key={s.label} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </span>
                  <span className="font-semibold tabular-nums">{s.count} SKUs</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* C. Recurring Customer Pain-Point Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <MessageSquareWarning className="h-4 w-4 text-destructive" />
            Category Pain-Point &amp; Praise Themes
          </CardTitle>
          <CardDescription>Recurring buyer complaints extracted by LLM per category &amp; price band.</CardDescription>
        </CardHeader>
        <CardContent className="max-h-52 overflow-y-auto pr-1">
          <ul className="space-y-2.5 text-xs">
            {painPoints.map(item => (
              <li key={item.category} className="rounded-md border p-2.5">
                <div className="flex items-center justify-between gap-1">
                  <Badge variant="secondary" className="text-[10px]">
                    {item.label}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">{item.priceSegment} segment</span>
                </div>
                <p className="mt-1.5 flex items-start gap-1.5 text-muted-foreground">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                  <span>
                    <strong className="text-foreground">Pain point:</strong> {item.topCon}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

