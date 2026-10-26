import Link from 'next/link'
import { ArrowUpRight, Layers, Percent, Tag, Zap } from 'lucide-react'
import { getProductsData, getFreshFindsData } from '@/lib/products'
import { categoryMeta } from '@/lib/categories'
import { formatINR } from '@/lib/format'
import PageHeader from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import OverviewCharts, { type CategoryStat } from '@/components/charts/OverviewCharts'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function OverviewPage() {
  const { products } = getProductsData()
  const fresh = getFreshFindsData()

  const groups = new Map<string, typeof products>()
  for (const p of products) groups.set(p.category, [...(groups.get(p.category) ?? []), p])

  const stats: CategoryStat[] = Array.from(groups, ([category, items]) => {
    const priced = items.filter(i => i.price)
    return {
      category,
      count: items.length,
      avgDiscount: Math.round(items.reduce((s, i) => s + (i.discount_percent ?? 0), 0) / items.length),
      avgPrice: Math.round(priced.reduce((s, i) => s + i.price!, 0) / (priced.length || 1)),
    }
  }).sort((a, b) => b.count - a.count)

  const withDiscount = products.filter(p => p.discount_percent)
  const avgDiscount = withDiscount.length
    ? Math.round(withDiscount.reduce((s, p) => s + p.discount_percent!, 0) / withDiscount.length)
    : 0
  const topDeals = [...withDiscount].sort((a, b) => b.discount_percent! - a.discount_percent!).slice(0, 6)

  return (
    <>
      <PageHeader title="Overview" description="This week's Flipkart discoveries, analysed by AI across every category." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Deals this week" value={products.length} hint="After de-duplication" icon={Tag} />
        <StatCard label="Fresh finds" value={fresh?.products.length ?? 0} hint="Added in the latest daily run" icon={Zap} />
        <StatCard label="Average discount" value={`${avgDiscount}%`} hint="Across discounted listings" icon={Percent} />
        <StatCard label="Categories" value={stats.length} hint="Tracked every week" icon={Layers} />
      </div>

      {products.length > 0 && <OverviewCharts stats={stats} total={products.length} />}

      <Card className="mt-6">
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="text-base">Biggest discounts</CardTitle>
            <CardDescription>Highest percentage off this week.</CardDescription>
          </div>
          <Link href="/deals" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            All deals <ArrowUpRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {topDeals.map(p => {
              const meta = categoryMeta(p.category)
              return (
                <li key={p.id}>
                  <Link href={`/product/${p.id}`} className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-muted/50">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
                    <Badge variant="secondary" className="hidden gap-1.5 sm:inline-flex"><meta.icon />{meta.label}</Badge>
                    <span className="w-20 text-right text-sm font-semibold tabular-nums">{formatINR(p.price)}</span>
                    <Badge variant="destructive" className="w-20 justify-center whitespace-nowrap">{p.discount_percent}% off</Badge>
                  </Link>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>
    </>
  )
}
